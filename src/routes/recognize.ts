

import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { config } from '../config';
import { RecognizeOptions } from '../types';
import { recognize } from '../services/recognitionPipeline';
import {
  SnapAccountError,
  ImageTooLargeError,
  ImageTooSmallError,
  ImageFormatUnsupportedError,
} from '../errors';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxImageSize,
  },
  fileFilter: (_req, file, cb) => {
    if ((config.supportedImageTypes as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ImageFormatUnsupportedError(file.mimetype) as any);
    }
  },
});

router.post('/recognize', upload.single('image'), async (req: Request, res: Response) => {
  try {
    
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'No image provided. Send an image file as multipart form-data with field name "image".',
        },
      });
      return;
    }

    const metadata = await sharp(req.file.buffer).metadata();
    if (
      (metadata.width && metadata.width < config.minImageWidth) ||
      (metadata.height && metadata.height < config.minImageHeight)
    ) {
      throw new ImageTooSmallError(metadata.width || 0, metadata.height || 0);
    }

    let options: RecognizeOptions = {};
    if (req.body?.options) {
      try {
        options = typeof req.body.options === 'string'
          ? JSON.parse(req.body.options)
          : req.body.options;
      } catch {
        
      }
    }

    const result = await recognize(req.file.buffer, {
      ...options,
      returnAlternatives: true,
      maxAlternatives: options.maxAlternatives ?? 20,
    });

    res.json({
      status: 'success',
      data: {
        account_number: result.accountNumber,
        bank_code: result.bank?.code || null,
        bank_name: result.bank?.name || null,
        account_name: result.accountHolder?.name || null,
        account_holder: result.accountHolder
          ? {
              name: result.accountHolder.name || null,
              match_status: result.accountHolder.matchStatus,
            }
          : null,
        alternatives: result.alternatives.map((alternative) => ({
          account_number: alternative.accountNumber,
          bank_code: alternative.bankCode,
          bank_name: alternative.bankName,
          confidence: alternative.confidence,
          nuban_valid: alternative.nubanValid,
        })),
      },
      meta: {
        confidence: result.confidence,
        processing_time_ms: result.processingTimeMs,
        source: 'ocr',
      },
    });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/recognize/base64', async (req: Request, res: Response) => {
  try {
    const { image_base64, image_format, options = {} } = req.body;

    if (!image_base64) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing image_base64 field in request body.',
        },
      });
      return;
    }

    const imageBuffer = Buffer.from(image_base64, 'base64');

    if (imageBuffer.length > config.maxImageSize) {
      throw new ImageTooLargeError(imageBuffer.length);
    }

    const metadata = await sharp(imageBuffer).metadata();
    if (
      (metadata.width && metadata.width < config.minImageWidth) ||
      (metadata.height && metadata.height < config.minImageHeight)
    ) {
      throw new ImageTooSmallError(metadata.width || 0, metadata.height || 0);
    }

    const recognizeOptions = options as RecognizeOptions;
    const result = await recognize(imageBuffer, {
      ...recognizeOptions,
      returnAlternatives: true,
      maxAlternatives: recognizeOptions.maxAlternatives ?? 20,
    });

    res.json({
      status: 'success',
      data: {
        account_number: result.accountNumber,
        bank_code: result.bank?.code || null,
        bank_name: result.bank?.name || null,
        account_name: result.accountHolder?.name || null,
        account_holder: result.accountHolder
          ? {
              name: result.accountHolder.name || null,
              match_status: result.accountHolder.matchStatus,
            }
          : null,
        alternatives: result.alternatives.map((alternative) => ({
          account_number: alternative.accountNumber,
          bank_code: alternative.bankCode,
          bank_name: alternative.bankName,
          confidence: alternative.confidence,
          nuban_valid: alternative.nubanValid,
        })),
      },
      meta: {
        confidence: result.confidence,
        processing_time_ms: result.processingTimeMs,
        source: 'ocr',
      },
    });
  } catch (error) {
    handleError(error, res);
  }
});

function handleError(error: unknown, res: Response): void {
  
  if ((error as any)?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'IMAGE_TOO_LARGE',
        message: `Image exceeds the maximum file size of ${config.maxImageSize / (1024 * 1024)} MB.`,
      },
    });
    return;
  }

  if (error instanceof SnapAccountError) {
    res.status(error.httpStatus).json({
      status: 'error',
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  console.error('[Recognize] Unexpected error:', error);
  res.status(500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during recognition.',
    },
  });
}

export default router;
