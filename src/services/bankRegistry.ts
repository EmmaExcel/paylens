

import { Bank } from '../types';
import { config } from '../config';
import { fetchBankList } from './paystack';

let bankCache: Bank[] = [];
let bankCodeMap: Map<string, Bank> = new Map();
let lastFetchedAt: number = 0;

export async function refreshBankRegistry(): Promise<void> {
  try {
    const rawBanks = await fetchBankList();

    bankCache = rawBanks
      .filter((b) => b.active && !b.is_deleted)
      .map((b) => ({
        code: b.code,
        name: b.name,
        slug: b.slug,
        longcode: b.longcode,
        active: b.active,
      }));

    bankCodeMap = new Map(bankCache.map((b) => [b.code, b]));
    lastFetchedAt = Date.now();

    console.log(`[BankRegistry] Loaded ${bankCache.length} banks from Paystack`);
  } catch (error) {
    console.error('[BankRegistry] Failed to refresh:', (error as Error).message);

    if (bankCache.length === 0) {
      
      bankCache = FALLBACK_BANKS;
      bankCodeMap = new Map(bankCache.map((b) => [b.code, b]));
      console.log(`[BankRegistry] Using fallback bank list (${bankCache.length} banks)`);
    }
  }
}

export function getAllBanks(): Bank[] {
  return bankCache;
}

export function getAllBankCodes(): string[] {
  return bankCache.map((b) => b.code);
}

export function getBankByCode(code: string): Bank | undefined {
  return bankCodeMap.get(code);
}

export function searchBanks(query: string): Bank[] {
  const lower = query.toLowerCase();
  return bankCache.filter((b) => b.name.toLowerCase().includes(lower));
}

export function isCacheStale(): boolean {
  return Date.now() - lastFetchedAt > config.bankCacheTtlMs;
}

export function getCacheInfo(): { lastUpdated: string; totalCount: number } {
  return {
    lastUpdated: lastFetchedAt ? new Date(lastFetchedAt).toISOString() : 'never',
    totalCount: bankCache.length,
  };
}

const FALLBACK_BANKS: Bank[] = [
  { code: '044', name: 'Access Bank', slug: 'access-bank', longcode: '044150149', active: true },
  { code: '023', name: 'Citibank Nigeria', slug: 'citibank-nigeria', longcode: '023150005', active: true },
  { code: '050', name: 'Ecobank Nigeria', slug: 'ecobank-nigeria', longcode: '050150010', active: true },
  { code: '070', name: 'Fidelity Bank', slug: 'fidelity-bank', longcode: '070150003', active: true },
  { code: '011', name: 'First Bank of Nigeria', slug: 'first-bank-of-nigeria', longcode: '011150007', active: true },
  { code: '214', name: 'First City Monument Bank', slug: 'first-city-monument-bank', longcode: '214150018', active: true },
  { code: '058', name: 'Guaranty Trust Bank', slug: 'guaranty-trust-bank', longcode: '058152036', active: true },
  { code: '030', name: 'Heritage Bank', slug: 'heritage-bank', longcode: '030159992', active: true },
  { code: '301', name: 'Jaiz Bank', slug: 'jaiz-bank', longcode: '301080020', active: true },
  { code: '082', name: 'Keystone Bank', slug: 'keystone-bank', longcode: '082150017', active: true },
  { code: '076', name: 'Polaris Bank', slug: 'polaris-bank', longcode: '076151006', active: true },
  { code: '101', name: 'Providus Bank', slug: 'providus-bank', longcode: '101000001', active: true },
  { code: '221', name: 'Stanbic IBTC Bank', slug: 'stanbic-ibtc-bank', longcode: '221159522', active: true },
  { code: '068', name: 'Standard Chartered Bank', slug: 'standard-chartered-bank', longcode: '068150015', active: true },
  { code: '232', name: 'Sterling Bank', slug: 'sterling-bank', longcode: '232150016', active: true },
  { code: '032', name: 'Union Bank of Nigeria', slug: 'union-bank-of-nigeria', longcode: '032150006', active: true },
  { code: '033', name: 'United Bank For Africa', slug: 'united-bank-for-africa', longcode: '033153513', active: true },
  { code: '215', name: 'Unity Bank', slug: 'unity-bank', longcode: '215154097', active: true },
  { code: '035', name: 'Wema Bank', slug: 'wema-bank', longcode: '035150103', active: true },
  { code: '057', name: 'Zenith Bank', slug: 'zenith-bank', longcode: '057150013', active: true },
];
