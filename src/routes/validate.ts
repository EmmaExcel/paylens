

import { Router, Request, Response } from 'express';
import { config } from '../config';
import { ValidateRequest } from '../types';
import { validateNuban, isValidFormat } from '../services/nuban';
import { resolveAccount } from '../services/paystack';
import { getBankByCode } from '../services/bankRegistry';
import { SnapAccountError, NubanInvalidError } from '../errors';
import crypto from 'crypto';

const router = Router();

router.post('/validate', async (req: Request, res: Response) => {
  const requestId = `req_${crypto.randomBytes(6).toString('hex')}`;

  try {
    const { account_number, bank_code } = req.body as ValidateRequest;

    if (!account_number || !bank_code) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'Both account_number and bank_code are required.',
          request_id: requestId,
        },
      });
      return;
    }

    if (!isValidFormat(account_number)) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'account_number must be exactly 10 digits.',
          request_id: requestId,
        },
      });
      return;
    }

    const nubanValid = validateNuban(account_number, bank_code);

    let accountHolder = null;
    try {
      const resolved = await resolveAccount(account_number, bank_code);
      accountHolder = {
        name: resolved.name,
        match_status: 'verified',
      };
    } catch (error) {
      if ((error as SnapAccountError).code === 'NAME_ENQUIRY_NO_MATCH') {
        accountHolder = {
          name: '',
          match_status: 'not_found',
        };
      } else {
        accountHolder = {
          name: '',
          match_status: 'deferred',
        };
      }
    }

    const bankInfo = getBankByCode(bank_code);

    res.json({
      status: 'success',
      data: {
        request_id: requestId,
        account_number,
        bank: bankInfo
          ? {
              code: bankInfo.code,
              name: bankInfo.name,
              short_name: bankInfo.slug,
            }
          : {
              code: bank_code,
              name: 'Unknown Bank',
              short_name: bank_code,
            },
        account_holder: accountHolder,
        validation: {
          nuban_valid: nubanValid,
          checksum_passed: nubanValid,
          format_valid: true,
        },
      },
      metadata: {
        api_version: config.apiVersion,
        timestamp: new Date().toISOString(),
        client_reference: req.body.client_reference || undefined,
      },
    });
  } catch (error) {
    if (error instanceof SnapAccountError) {
      res.status(error.httpStatus).json({
        status: 'error',
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          request_id: requestId,
        },
      });
      return;
    }

    console.error('[Validate] Unexpected error:', error);
    res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
        request_id: requestId,
      },
    });
  }
});

export default router;
