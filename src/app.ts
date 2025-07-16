import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { errorMiddleware } from './api/middleware/error.middleware';
import v1Routes from './api/routes/v1';
import { HealthService } from './services/health.service';
import { simpleHeartbeatService } from './services/simple-heartbeat.service';

const app: Application = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    HealthService.recordRequest(responseTime, isError);

    // Log request details
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
  });

  next();
});

// Root health endpoint (for external monitoring)
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = HealthService.getBasicHealth();
    res.status(200).json(health);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Heartbeat endpoint (ultra-lightweight)
app.get('/heartbeat', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: HealthService.getUptimeFormatted()
  });
});

// Ping endpoint (for keep-alive)
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).send('pong');
});

// API routes
app.use('/api/v1', v1Routes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorMiddleware);

// Start simple heartbeat service when app is created
if (process.env.NODE_ENV !== 'test') {
  simpleHeartbeatService.start();
}

export { app };
export default app;