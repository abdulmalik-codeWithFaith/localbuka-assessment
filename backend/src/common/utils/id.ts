import { randomInt, randomUUID } from 'node:crypto';

/** Readable unique id such as "rev_3f9a1c2b7d40". */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

// No 0/O/1/I so codes are easy to read out loud.
const VOUCHER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Voucher code in the contract's format, e.g. "BUKA-DISC-X9B2". */
export function generateVoucherCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += VOUCHER_ALPHABET[randomInt(VOUCHER_ALPHABET.length)];
  }
  return `BUKA-DISC-${suffix}`;
}