-- verify.sql: proves the database rules work. Everything runs inside a transaction
-- that is rolled back at the end, so it leaves no data behind.
-- Expected: 3 lines marked "ERROR" (the blocked duplicates) and everything else succeeds.
\set ON_ERROR_STOP off
-- Without this, one blocked INSERT aborts the whole transaction and every later
-- statement fails. ON_ERROR_ROLLBACK wraps each statement in a savepoint.
\set ON_ERROR_ROLLBACK on
BEGIN;

INSERT INTO restaurants (id, name, cuisine, price_range, latitude, longitude, address)
VALUES ('r_test', 'Test Buka', 'Nigerian', 2, 6.5, 3.3, 'Test Street');
INSERT INTO users (id, name, email) VALUES ('u_test', 'Test User', 'test@example.com');

\echo '--- 1. first check-in at 22:30 UTC on 29 Jun (23:30 Lagos): should succeed'
INSERT INTO points_ledger (id, user_id, action, restaurant_id, points, created_at)
VALUES ('t1', 'u_test', 'check-in', 'r_test', 50, '2026-06-29 22:30:00+00');

\echo '--- 2. second check-in 20 min later, same Lagos day: should be BLOCKED (ERROR)'
INSERT INTO points_ledger (id, user_id, action, restaurant_id, points, created_at)
VALUES ('t2', 'u_test', 'check-in', 'r_test', 50, '2026-06-29 22:50:00+00');

\echo '--- 3. check-in at 23:10 UTC (00:10 Lagos, next day): should succeed'
INSERT INTO points_ledger (id, user_id, action, restaurant_id, points, created_at)
VALUES ('t3', 'u_test', 'check-in', 'r_test', 50, '2026-06-29 23:10:00+00');

\echo '--- 4. duplicate review points: second insert should be BLOCKED (ERROR)'
INSERT INTO points_ledger (id, user_id, action, restaurant_id, points) VALUES ('t4', 'u_test', 'review', 'r_test', 20);
INSERT INTO points_ledger (id, user_id, action, restaurant_id, points) VALUES ('t5', 'u_test', 'review', 'r_test', 20);

\echo '--- 5. invalid action: should be BLOCKED (ERROR)'
INSERT INTO points_ledger (id, user_id, action, points) VALUES ('t6', 'u_test', 'bogus', 5);

\echo '--- rows that survived (expect t1, t3, t4):'
SELECT id, action, points FROM points_ledger ORDER BY id;

ROLLBACK;