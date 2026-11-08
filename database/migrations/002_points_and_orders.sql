-- 002_points_and_orders.sql
-- Additive changes on top of the official schema. Nothing in 001 is renamed or removed.

-- 1. Valid ledger actions only.
ALTER TABLE points_ledger
    ADD CONSTRAINT chk_ledger_action
    CHECK (action IN ('check-in', 'review', 'referral', 'redeem'));

-- 2. One check-in per user per restaurant per calendar day, enforced by the database.
--    The day is computed in Africa/Lagos. AT TIME ZONE with a constant zone name is
--    IMMUTABLE, so it is allowed in an index (the plain ::DATE cast is not).
--    Because this is a UNIQUE index, two concurrent requests cannot both succeed.
CREATE UNIQUE INDEX uq_checkin_per_day
    ON points_ledger (user_id, restaurant_id, ((created_at AT TIME ZONE 'Africa/Lagos')::date))
    WHERE action = 'check-in';

-- 3. Review points can be earned once per user per restaurant.
CREATE UNIQUE INDEX uq_review_points_once
    ON points_ledger (user_id, restaurant_id)
    WHERE action = 'review';

-- 4. Referral points can be earned once per referred user.
ALTER TABLE points_ledger
    ADD COLUMN referred_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_referral_points_once
    ON points_ledger (user_id, referred_user_id)
    WHERE action = 'referral';

-- 5. Orders: the schema has no orders, but referrals require the referred user to have
--    "placed at least one completed order". A minimal table lets us check that for real.
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_status ON orders(user_id, status);
