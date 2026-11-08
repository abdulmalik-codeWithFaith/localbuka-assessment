-- 003_voucher_codes.sql
-- Redemptions return a voucher code, so store it on the ledger row that created it.
-- UNIQUE still allows many NULLs (earn rows have no voucher).
ALTER TABLE points_ledger ADD COLUMN voucher_code VARCHAR(30);
ALTER TABLE points_ledger ADD CONSTRAINT uq_ledger_voucher_code UNIQUE (voucher_code);
