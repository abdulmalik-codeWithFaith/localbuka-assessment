import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

/**
 * True when PostgreSQL rejected a write because of a UNIQUE constraint or index.
 * Pass `constraintName` to match one specific constraint only.
 */
export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const { driverError } = error;
  if (typeof driverError !== 'object' || driverError === null) {
    return false;
  }
  if (!('code' in driverError) || driverError.code !== UNIQUE_VIOLATION) {
    return false;
  }
  if (constraintName === undefined) {
    return true;
  }
  return 'constraint' in driverError && driverError.constraint === constraintName;
}