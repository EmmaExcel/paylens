export interface BankInfo {
  code: string;
  name: string;
  short_name?: string;
  nibss_code?: string;
}

export interface AccountHolder {
  name: string;
  match_status: 'verified' | 'not_found' | 'error';
}

export interface ValidationInfo {
  nuban_valid: boolean;
  checksum_passed: boolean;
  format_valid: boolean;
}

export interface BankAlternative {
  account_number: string;
  bank_code: string;
  bank_name: string;
  confidence: number;
  nuban_valid: boolean;
}

export interface ImageQuality {
  brightness: 'too_dark' | 'too_bright' | 'good';
  sharpness: 'blurry' | 'acceptable' | 'good';
  resolution: 'too_small' | 'acceptable' | 'good';
}

export interface RecognizeResponseData {
  account_number: string;
  account_name?: string | null;
  bank_code?: string | null;
  bank_name?: string | null;
  confidence: number;
  bank?: BankInfo | null;
  account_holder?: AccountHolder | null;
  alternatives?: BankAlternative[];
  validation: ValidationInfo;
  image_quality: ImageQuality;
  processing_time_ms: number;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RecognizeResult {
  success: boolean;
  data?: RecognizeResponseData;
  error?: ApiErrorDetail;
}

const API_URL = '/v1';
const API_KEY = import.meta.env.VITE_SNAPACCOUNT_API_KEY;

export async function recognizeAccountImage(imageBlob: Blob): Promise<RecognizeResult> {
  if (!API_KEY) {
    return {
      success: false,
      error: {
        code: 'CLIENT_CONFIGURATION_ERROR',
        message: 'The frontend API key is not configured.',
      },
    };
  }

  const formData = new FormData();
  formData.append('image', imageBlob, 'capture.jpg');

  try {
    const response = await fetch(`${API_URL}/recognize`, {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', API_KEY].join(' '),
      },
      body: formData,
    });

    if (!response.ok) {
      console.error('API responded with status:', response.status);
    }

    const text = await response.text();
    let json: {
      status?: string;
      data?: RecognizeResponseData;
      error?: ApiErrorDetail;
    };
    try {
      json = JSON.parse(text);
    } catch {
      console.error('Failed to parse JSON response. Raw text:', text.substring(0, 200));
      return { success: false, error: { code: 'SERVER_ERROR', message: `Server returned non-JSON response. Status: ${response.status}` } };
    }

    if (json.status === 'success') {
      return { success: true, data: json.data };
    } else {
      return { success: false, error: json.error };
    }
  } catch (error: unknown) {
    console.error('Fetch exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown network error';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `Could not connect to the API. Error: ${message}`,
      }
    };
  }
}
