

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AuthInvalidKeyError } from '../errors';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  
  if (req.path === '/v1/health') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    const error = new AuthInvalidKeyError();
    res.status(error.httpStatus).json({
      status: 'error',
      error: {
        code: error.code,
        message: 'Missing Authorization header. Expected: Bearer <api_key>',
      },
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    const error = new AuthInvalidKeyError();
    res.status(error.httpStatus).json({
      status: 'error',
      error: {
        code: error.code,
        message: 'Invalid Authorization header format. Expected: Bearer <api_key>',
      },
    });
    return;
  }

  const providedKey = parts[1];

  if (providedKey !== config.apiKey) {
    const error = new AuthInvalidKeyError();
    res.status(error.httpStatus).json({
      status: 'error',
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next();
}
