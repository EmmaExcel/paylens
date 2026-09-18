
import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getCacheInfo } from '../services/bankRegistry';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const bankCache = getCacheInfo();

  res.json({
    status: 'healthy',
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    dependencies: {
      ocr_engine: 'healthy',
      name_enquiry: config.paystackSecretKey ? 'configured' : 'not_configured',
      bank_registry: bankCache.totalCount > 0 ? 'healthy' : 'empty',
    },
    bank_registry: {
      total_banks: bankCache.totalCount,
      last_updated: bankCache.lastUpdated,
    },
  });
});

export default router;
