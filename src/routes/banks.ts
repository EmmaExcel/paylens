

import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getAllBanks, getCacheInfo } from '../services/bankRegistry';

const router = Router();

router.get('/banks', (_req: Request, res: Response) => {
  const banks = getAllBanks();
  const cacheInfo = getCacheInfo();

  res.json({
    status: 'success',
    data: {
      banks: banks.map((b) => ({
        code: b.code,
        name: b.name,
        slug: b.slug,
        active: b.active,
      })),
      last_updated: cacheInfo.lastUpdated,
      total_count: cacheInfo.totalCount,
    },
    metadata: {
      api_version: config.apiVersion,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
