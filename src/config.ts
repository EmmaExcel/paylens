

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  
  port: parseInt(process.env.PORT || '3000', 10),

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',

  apiKey: process.env.SNAPACCOUNT_API_KEY || 'snap_test_key_123',

  ocrConfidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.5'),

  maxImageSize: 10 * 1024 * 1024,

  minImageWidth: 300,
  minImageHeight: 300,

  supportedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],

  apiVersion: '1.0',

  bankCacheTtlMs: 24 * 60 * 60 * 1000,

  rateLimitMax: 120,

  rateLimitWindowMs: 60 * 1000,
} as const;
