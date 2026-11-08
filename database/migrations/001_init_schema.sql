-- 001_init_schema.sql
-- Core schema from the official DATABASE_SCHEMA.sql (tables, FKs, indexes only; no seed rows).
-- One deliberate change: the official check-in index uses (created_at::DATE), which
-- PostgreSQL rejects ("functions in index expression must be marked IMMUTABLE") because
-- timestamptz -> date depends on the session time zone. See 002 for the fixed version.

CREATE TABLE restaurants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cuisine VARCHAR(100) NOT NULL,
    price_range INT NOT NULL CHECK (price_range BETWEEN 1 AND 4),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    avg_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.0,
    is_open INT NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
    images TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX idx_restaurants_coords ON restaurants(latitude, longitude);

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    referred_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_restaurant_review UNIQUE (user_id, restaurant_id)
);

CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);

CREATE TABLE points_ledger (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'check-in', 'review', 'referral', 'redeem'
    restaurant_id VARCHAR(50) REFERENCES restaurants(id) ON DELETE SET NULL,
    points INT NOT NULL, -- positive for earn, negative for redeem
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_user ON points_ledger(user_id);
