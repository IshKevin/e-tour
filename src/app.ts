import express, { Application } from 'express';
import { errorMiddleware } from './api/middleware/error.middleware';
import v1Routes from './api/routes/v1';

const app: Application = express();

app.use(express.json());
app.use('/api/v1', v1Routes);
app.use(errorMiddleware);

export default app;