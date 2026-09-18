

import { RecognitionResult, RecognizeOptions, Alternative, AccountHolder } from '../types';
import { config } from '../config';
import {
  OcrNoNumberFoundError,
  OcrLowConfidenceError,
  OcrMultipleNumbersError,
  NubanInvalidError,
} from '../errors';
import { recognizeImage } from './ocr';
import { identifyBanks, isValidFormat } from './nuban';
import { resolveAccount } from './paystack';
import { getAllBankCodes, getBankByCode } from './bankRegistry';
import crypto from 'crypto';

export async function recognize(
  imageBuffer: Buffer,
  options: RecognizeOptions = {}
): Promise<RecognitionResult> {
  const startTime = Date.now();
  const requestId = `req_${crypto.randomBytes(6).toString('hex')}`;

  const ocrResult = await recognizeImage(imageBuffer);

  if (ocrResult.candidates.length === 0) {
    throw new OcrNoNumberFoundError({
      raw_text: ocrResult.rawText.slice(0, 200),
      image_quality: ocrResult.imageQuality,
    });
  }

  if (ocrResult.confidence < config.ocrConfidenceThreshold) {
    throw new OcrLowConfidenceError(
      ocrResult.confidence,
      ocrResult.candidates[0],
      []
    );
  }

  const allBankCodes = getAllBankCodes();
  const validCandidates: Array<{ number: string; bankCodes: string[] }> = [];

  for (const candidate of ocrResult.candidates) {
    if (!isValidFormat(candidate)) continue;

    const matchingBanks = identifyBanks(candidate, allBankCodes);
    if (matchingBanks.length > 0) {
      validCandidates.push({ number: candidate, bankCodes: matchingBanks });
    }
  }

  if (validCandidates.length === 0) {
    
    const formatValid = ocrResult.candidates.filter(isValidFormat);
    if (formatValid.length > 0) {
      throw new NubanInvalidError(formatValid[0]);
    }
    throw new OcrNoNumberFoundError({
      raw_text: ocrResult.rawText.slice(0, 200),
    });
  }

  if (validCandidates.length > 3 && !options.returnAlternatives) {
    throw new OcrMultipleNumbersError(validCandidates.map((c) => c.number));
  }

  const primary = validCandidates[0];
  let resolvedBank: string | null = null;
  let accountHolder: AccountHolder | null = null;
  const verifiedBanks: string[] = [];

  if (!options.skipNameEnquiry) {

    const bankOrder = options.preferredBankCode && primary.bankCodes.includes(options.preferredBankCode)
      ? [options.preferredBankCode, ...primary.bankCodes.filter((c) => c !== options.preferredBankCode)]
      : primary.bankCodes;

    for (const bankCode of bankOrder) {
      try {
        const result = await resolveAccount(primary.number, bankCode);
        verifiedBanks.push(bankCode);
        if (!accountHolder) {
          resolvedBank = bankCode;
          accountHolder = {
            name: result.name,
            matchStatus: 'verified',
          };
        }
      } catch (error) {
        
        if ((error as any).code === 'NAME_ENQUIRY_NO_MATCH') {
          continue;
        }
        
        if ((error as any).code === 'NAME_ENQUIRY_FAILED') {
          continue;
        }
        
        continue;
      }
    }

    if (!accountHolder) {
      accountHolder = { name: '', matchStatus: 'not_found' };
    }
  }

  const matchedBankCode = resolvedBank;
  const matchedBankInfo = matchedBankCode ? getBankByCode(matchedBankCode) : undefined;

  const alternatives: Alternative[] = [];
  if (options.returnAlternatives) {
    const maxAlts = options.maxAlternatives || 3;

    for (const bankCode of verifiedBanks) {
      if (bankCode === matchedBankCode) continue;
      if (alternatives.length >= maxAlts) break;

      const bankInfo = getBankByCode(bankCode);
      alternatives.push({
        accountNumber: primary.number,
        bankCode,
        bankName: bankInfo?.name || bankCode,
        confidence: ocrResult.confidence * 0.5, 
        nubanValid: true,
      });
    }

  }

  const processingTimeMs = Date.now() - startTime;

  return {
    requestId,
    accountNumber: primary.number,
    confidence: ocrResult.confidence,
    bank: matchedBankInfo
      ? {
          code: matchedBankInfo.code,
          name: matchedBankInfo.name,
          shortName: matchedBankInfo.slug,
          nibssCode: matchedBankInfo.code,
        }
      : null,
    accountHolder,
    validation: {
      nubanValid: true,
      checksumPassed: true,
      formatValid: true,
    },
    alternatives,
    imageQuality: ocrResult.imageQuality,
    processingTimeMs,
  };
}
