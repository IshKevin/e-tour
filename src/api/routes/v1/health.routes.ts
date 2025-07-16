import { Router, Request, Response } from 'express';
import { HealthService } from '../../../services/health.service';
import { simpleHeartbeatService } from '../../../services/simple-heartbeat.service';

const router = Router();

/**
 * Basic health check endpoint
 * GET /api/v1/health
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const health = HealthService.getBasicHealth();
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    HealthService.recordRequest(responseTime, false);
    
    res.status(200).json({
      ...health,
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime
    });
  }
});

/**
 * Detailed health check endpoint
 * GET /api/v1/health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const health = await HealthService.getDetailedHealth();
    const responseTime = Date.now() - startTime;
    
    // Record request metrics
    HealthService.recordRequest(responseTime, false);
    
    // Set appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      ...health,
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime,
      services: {
        database: { status: 'unknown', lastChecked: new Date().toISOString() },
        email: { status: 'unknown', lastChecked: new Date().toISOString() },
        upload: { status: 'unknown', lastChecked: new Date().toISOString() },
        memory: { status: 'unknown', lastChecked: new Date().toISOString() },
        disk: { status: 'unknown', lastChecked: new Date().toISOString() }
      }
    });
  }
});

/**
 * Heartbeat endpoint (lightweight)
 * GET /api/v1/health/heartbeat
 */
router.get('/heartbeat', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const uptime = Math.floor((Date.now() - Date.now()) / 1000);
    const responseTime = Date.now() - startTime;
    
    HealthService.recordRequest(responseTime, false);
    
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: HealthService.getUptimeFormatted(),
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime
    });
  }
});

/**
 * Readiness probe (for Kubernetes/Docker)
 * GET /api/v1/health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const isHealthy = await HealthService.isHealthy();
    const responseTime = Date.now() - startTime;
    
    HealthService.recordRequest(responseTime, !isHealthy);
    
    if (isHealthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        responseTime
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        responseTime
      });
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime
    });
  }
});

/**
 * Liveness probe (for Kubernetes/Docker)
 * GET /api/v1/health/live
 */
router.get('/live', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, false);
    
    res.status(200).json({
      status: 'live',
      timestamp: new Date().toISOString(),
      uptime: HealthService.getUptimeFormatted(),
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime
    });
  }
});

/**
 * Simple heartbeat status
 * GET /api/v1/health/heartbeat-status
 */
router.get('/heartbeat-status', (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const heartbeatStatus = simpleHeartbeatService.getStatus();
    const heartbeatStats = simpleHeartbeatService.getStats();
    const isHealthy = simpleHeartbeatService.isHealthy();
    const responseTime = Date.now() - startTime;

    HealthService.recordRequest(responseTime, false);

    res.status(200).json({
      heartbeat: {
        ...heartbeatStatus,
        stats: heartbeatStats,
        healthy: isHealthy
      },
      responseTime
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);

    res.status(500).json({
      error: 'Failed to get heartbeat status',
      details: error.message,
      responseTime
    });
  }
});

/**
 * System metrics endpoint
 * GET /api/v1/health/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const health = await HealthService.getDetailedHealth();
    const responseTime = Date.now() - startTime;
    
    HealthService.recordRequest(responseTime, false);
    
    // Return metrics in Prometheus format if requested
    const format = req.query.format as string;
    
    if (format === 'prometheus') {
      const prometheusMetrics = `
# HELP etour_uptime_seconds Total uptime in seconds
# TYPE etour_uptime_seconds counter
etour_uptime_seconds ${health.uptime}

# HELP etour_requests_total Total number of requests
# TYPE etour_requests_total counter
etour_requests_total ${health.metrics.totalRequests}

# HELP etour_errors_total Total number of errors
# TYPE etour_errors_total counter
etour_errors_total ${Math.round(health.metrics.totalRequests * health.metrics.errorRate / 100)}

# HELP etour_response_time_ms Average response time in milliseconds
# TYPE etour_response_time_ms gauge
etour_response_time_ms ${health.metrics.averageResponseTime}

# HELP etour_memory_usage_percent Memory usage percentage
# TYPE etour_memory_usage_percent gauge
etour_memory_usage_percent ${health.services.memory.details?.usagePercent || 0}

# HELP etour_service_status Service status (1=healthy, 0.5=degraded, 0=unhealthy)
# TYPE etour_service_status gauge
etour_service_status{service="database"} ${health.services.database.status === 'healthy' ? 1 : health.services.database.status === 'degraded' ? 0.5 : 0}
etour_service_status{service="email"} ${health.services.email.status === 'healthy' ? 1 : health.services.email.status === 'degraded' ? 0.5 : 0}
etour_service_status{service="upload"} ${health.services.upload.status === 'healthy' ? 1 : health.services.upload.status === 'degraded' ? 0.5 : 0}
      `.trim();
      
      res.set('Content-Type', 'text/plain');
      res.status(200).send(prometheusMetrics);
    } else {
      // Return JSON metrics
      res.status(200).json({
        uptime: health.uptime,
        requests: {
          total: health.metrics.totalRequests,
          errors: Math.round(health.metrics.totalRequests * health.metrics.errorRate / 100),
          errorRate: health.metrics.errorRate,
          averageResponseTime: health.metrics.averageResponseTime
        },
        memory: {
          usage: health.services.memory.details?.usagePercent || 0,
          heapUsed: health.services.memory.details?.heapUsed || 0,
          heapTotal: health.services.memory.details?.heapTotal || 0
        },
        services: {
          database: health.services.database.status,
          email: health.services.email.status,
          upload: health.services.upload.status
        },
        timestamp: new Date().toISOString(),
        responseTime
      });
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    HealthService.recordRequest(responseTime, true);
    
    res.status(500).json({
      error: 'Failed to get metrics',
      details: error.message,
      responseTime
    });
  }
});

/**
 * Ping endpoint (ultra-lightweight)
 * GET /api/v1/health/ping
 */
router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({
    pong: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
