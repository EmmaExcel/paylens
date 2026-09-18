

export class SnapAccountError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SnapAccountError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class OcrNoNumberFoundError extends SnapAccountError {
  constructor(details: Record<string, unknown> = {}) {
    super(
      'OCR_NO_NUMBER_FOUND',
      'No account number pattern detected in the image.',
      422,
      { suggestion: 'Retake the photo with better framing. Ensure the account number is clearly visible.', ...details }
    );
  }
}

export class OcrLowConfidenceError extends SnapAccountError {
  constructor(confidence: number, partialResult?: string, ambiguousPositions?: number[]) {
    super(
      'OCR_LOW_CONFIDENCE',
      'Unable to extract account number with sufficient confidence.',
      422,
      {
        confidence,
        partial_result: partialResult,
        ambiguous_positions: ambiguousPositions,
        suggestion: 'Retake the photo with better lighting. Ensure the full number is visible.',
      }
    );
  }
}

export class OcrMultipleNumbersError extends SnapAccountError {
  constructor(candidates: string[]) {
    super(
      'OCR_MULTIPLE_NUMBERS',
      'Multiple candidate account numbers found in the image.',
      422,
      { candidates }
    );
  }
}

export class NubanInvalidError extends SnapAccountError {
  constructor(accountNumber: string) {
    super(
      'NUBAN_INVALID',
      'Detected number fails NUBAN checksum for all known banks.',
      422,
      { account_number: accountNumber }
    );
  }
}

export class NameEnquiryFailedError extends SnapAccountError {
  constructor(partialResult?: Record<string, unknown>) {
    super(
      'NAME_ENQUIRY_FAILED',
      'Account name enquiry failed or timed out.',
      502,
      { partial_result: partialResult }
    );
  }
}

export class NameEnquiryNoMatchError extends SnapAccountError {
  constructor(accountNumber: string, bankCode: string) {
    super(
      'NAME_ENQUIRY_NO_MATCH',
      'Account number is NUBAN-valid but no account exists at this bank.',
      422,
      { account_number: accountNumber, bank_code: bankCode }
    );
  }
}

export class ImageTooSmallError extends SnapAccountError {
  constructor(width: number, height: number) {
    super(
      'IMAGE_TOO_SMALL',
      'Image resolution is below the minimum requirement (640×480).',
      400,
      { width, height, min_width: 640, min_height: 480 }
    );
  }
}

export class ImageTooLargeError extends SnapAccountError {
  constructor(sizeBytes: number) {
    super(
      'IMAGE_TOO_LARGE',
      'Image exceeds the maximum file size of 10 MB.',
      400,
      { size_bytes: sizeBytes, max_bytes: 10 * 1024 * 1024 }
    );
  }
}

export class ImageFormatUnsupportedError extends SnapAccountError {
  constructor(mimetype: string) {
    super(
      'IMAGE_FORMAT_UNSUPPORTED',
      `Unsupported image format: ${mimetype}. Accepted: JPEG, PNG, HEIC, WebP.`,
      400,
      { provided_type: mimetype, accepted_types: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'] }
    );
  }
}

export class AuthInvalidKeyError extends SnapAccountError {
  constructor() {
    super(
      'AUTH_INVALID_KEY',
      'API key is invalid, revoked, or missing.',
      401,
      {}
    );
  }
}

export class InternalError extends SnapAccountError {
  constructor(message: string = 'An unexpected internal error occurred.') {
    super('INTERNAL_ERROR', message, 500, {});
  }
}
