

import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { PaystackResolveResponse, PaystackBankListResponse } from '../types';
import { NameEnquiryFailedError, NameEnquiryNoMatchError } from '../errors';

const PAYSTACK_BASE = 'https://api.paystack.co';

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE,
  timeout: 10_000,
  headers: {
    Authorization: `Bearer ${config.paystackSecretKey}`,
  },
});

export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ name: string; accountNumber: string }> {
  try {
    const response = await paystackClient.get<PaystackResolveResponse>('/bank/resolve', {
      params: {
        account_number: accountNumber,
        bank_code: bankCode,
      },
    });

    if (
      response.data.status &&
      response.data.data &&
      response.data.data.account_number === accountNumber &&
      response.data.data.account_name.trim().length > 0
    ) {
      return {
        name: response.data.data.account_name.trim(),
        accountNumber: response.data.data.account_number,
      };
    }

    throw new NameEnquiryNoMatchError(accountNumber, bankCode);
  } catch (error) {
    if (error instanceof NameEnquiryNoMatchError) {
      throw error;
    }

    const axiosError = error as AxiosError<{ message?: string }>;

    if (axiosError.response?.status === 422) {
      throw new NameEnquiryNoMatchError(accountNumber, bankCode);
    }

    throw new NameEnquiryFailedError({
      account_number: accountNumber,
      bank_code: bankCode,
      paystack_error: axiosError.response?.data?.message || axiosError.message,
    });
  }
}

export async function fetchBankList(): Promise<PaystackBankListResponse['data']> {
  try {
    const response = await paystackClient.get<PaystackBankListResponse>('/bank', {
      params: {
        country: 'nigeria',
        perPage: 100,
      },
    });

    if (response.data.status && response.data.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    console.error('[Paystack] Failed to fetch bank list:', (error as Error).message);
    return [];
  }
}
