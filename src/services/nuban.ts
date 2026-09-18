

const NUBAN_WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3];

export function validateNuban(accountNumber: string, bankCode: string): boolean {
  
  if (!/^\d{10}$/.test(accountNumber) || !/^\d{3}$/.test(bankCode)) {
    return false;
  }

  const combined = bankCode + accountNumber.slice(0, 9);

  let weightedSum = 0;
  for (let i = 0; i < 12; i++) {
    weightedSum += parseInt(combined[i], 10) * NUBAN_WEIGHTS[i];
  }

  const checkDigit = (10 - (weightedSum % 10)) % 10;
  return checkDigit === parseInt(accountNumber[9], 10);
}

export function identifyBanks(accountNumber: string, bankCodes: string[]): string[] {
  if (!/^\d{10}$/.test(accountNumber)) {
    return [];
  }

  const validTraditional = bankCodes
    .filter((code) => validateNuban(accountNumber, code))
    .sort();

  const mfbFallbacks = [
    '50515', 
    '999992', 
    '100033', 
    '090267', 
    '50211', 
  ];

  const presentMfbs = mfbFallbacks.filter((code) => bankCodes.includes(code));

  return Array.from(new Set([...validTraditional, ...presentMfbs]));
}

export function isValidFormat(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber);
}
