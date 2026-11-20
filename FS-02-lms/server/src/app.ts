import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/error.middleware';
import { routes } from './routes';
import { verifyWebhook } from './middleware/webhook.middleware';

const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:4001',
  'http://127.0.0.1:4001',
].filter(Boolean);

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb', verify: (req: express.Request, _res: express.Response, buf: Buffer) => { (req as express.Request & { rawBody: Buffer }).rawBody = buf; } }));
  app.use('/api/v1/stripe/webhook', verifyWebhook);

  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
