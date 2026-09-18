

export interface Bank {
  code: string;
  name: string;
  slug: string;
  longcode: string;
  active: boolean;
}

export interface AccountHolder {
  name: string;
  matchStatus: 'verified' | 'not_found' | 'pending' | 'deferred';
}

export interface ImageQuality {
  brightness: 'too_dark' | 'adequate' | 'too_bright';
  sharpness: 'blurry' | 'acceptable' | 'good';
  resolution: 'too_small' | 'acceptable' | 'good';
}

export interface NubanValidation {
  nubanValid: boolean;
  checksumPassed: boolean;
  formatValid: boolean;
}

export interface Alternative {
  accountNumber: string;
  bankCode: string;
  bankName: string;
  confidence: number;
  nubanValid: boolean;
}

export interface RecognitionResult {
  requestId: string;
  accountNumber: string;
  confidence: number;
  bank: {
    code: string;
    name: string;
    shortName: string;
    nibssCode: string;
  } | null;
  accountHolder: AccountHolder | null;
  validation: NubanValidation;
  alternatives: Alternative[];
  imageQuality: ImageQuality;
  processingTimeMs: number;
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  metadata: {
    apiVersion: string;
    timestamp: string;
    clientReference?: string;
  };
}

export interface ApiErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export interface RecognizeOptions {
  returnAlternatives?: boolean;
  maxAlternatives?: number;
  skipNameEnquiry?: boolean;
  preferredBankCode?: string | null;
  clientReference?: string;
}

export interface ValidateRequest {
  account_number: string;
  bank_code: string;
}

export interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

export interface PaystackBankListResponse {
  status: boolean;
  message: string;
  data: Array<{
    id: number;
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    country: string;
    currency: string;
    type: string;
    is_deleted: boolean;
  }>;
}
