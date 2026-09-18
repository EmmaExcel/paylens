

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { refreshBankRegistry, isCacheStale } from './services/bankRegistry';

import healthRouter from './routes/health';
import banksRouter from './routes/banks';
import validateRouter from './routes/validate';
import recognizeRouter from './routes/recognize';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));     
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);
app.use(authMiddleware);

app.use('/v1', healthRouter);
app.use('/v1', banksRouter);
app.use('/v1', validateRouter);
app.use('/v1', recognizeRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'SnapAccount API',
    version: config.apiVersion,
    docs: 'https://docs.snapaccount.io',
    health: '/v1/health',
  });
});

app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found. Check the API documentation.',
    },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
});

async function start() {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║         SnapAccount API v1.0         ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  console.log('[Server] Loading bank registry...');
  await refreshBankRegistry();

  setInterval(async () => {
    if (isCacheStale()) {
      console.log('[Server] Refreshing bank registry...');
      await refreshBankRegistry();
    }
  }, 60 * 60 * 1000); 

  if (!config.paystackSecretKey || config.paystackSecretKey === 'sk_test_your_key_here') {
    console.log('');
    console.log('  ⚠️  PAYSTACK_SECRET_KEY is not set or is using the placeholder.');
    console.log('     Name enquiry (/bank/resolve) will fail.');
    console.log('     Set your key in .env to enable account verification.');
    console.log('');
  }

  app.listen(config.port, () => {
    console.log(`[Server] Listening on http://localhost:${config.port}`);
    console.log(`[Server] Health:    GET  http://localhost:${config.port}/v1/health`);
    console.log(`[Server] Banks:     GET  http://localhost:${config.port}/v1/banks`);
    console.log(`[Server] Recognize: POST http://localhost:${config.port}/v1/recognize`);
    console.log(`[Server] Validate:  POST http://localhost:${config.port}/v1/validate`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
