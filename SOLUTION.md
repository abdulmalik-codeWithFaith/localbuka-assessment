# Solution Report

LocalBuka restaurant discovery, reviews and rewards: a NestJS + PostgreSQL API, a React web app and a
React Native (Expo) app. This report follows `SOLUTION_TEMPLATE.md`, and adds the answers to the technical
questions (section 5) and a list of problems I found in the assessment materials (section 7).

**At a glance:** 218 automated tests (106 backend, 73 web, 39 mobile), strict TypeScript everywhere, no `any`,
and every business rule that matters is enforced by the database, not just by application code.

---

## 1. Local Setup Instructions

Requirements: Node.js 22.22.3 or newer, PostgreSQL 16 with `psql` on the PATH, Git (Git Bash on Windows).
For the phone: Expo Go (latest version) on the same Wi-Fi as the computer.

```bash
# Database (creates "localbuka" and applies migrations 001 to 003; it never touches an existing database)
export PGPASSWORD='your-postgres-password'
bash database/setup-db.sh

# Backend: http://localhost:3000
cd backend
npm install
cp .env.example .env          # put your PostgreSQL password in DB_PASSWORD
npm run seed                  # loads mock_data.json (resets the data every time it runs)
npm run start:dev

# Frontend: http://localhost:5173
cd frontend
npm install
npm run dev

# Mobile: scan the QR code with Expo Go
cd mobile
npm install
npx expo start
```

If `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`, use `npm install --legacy-peer-deps`.

**Environment variables** (real `.env` files are git-ignored; `.env.example` files are committed):

| File | Variable | Meaning |
|---|---|---|
| `backend/.env` | `PORT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Server and database settings |
| `frontend/.env` | `VITE_API_URL` (optional) | API address, default `http://localhost:3000` |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` (optional) | Only needed if the app cannot find the computer by itself |

**Tests:**

```bash
bash database/setup-test-db.sh   # once: creates the separate "localbuka_test" database
cd backend  && npm test          # 46 unit + 60 end-to-end tests (real PostgreSQL)
cd frontend && npm test          # 73 tests
cd mobile   && npm test          # 39 tests
```

The backend end-to-end tests refuse to run on any database whose name does not end in `_test`.

**Demo users** (there is no login, so both apps offer a user picker): `user_101` Chijioke (20 points),
`user_102` Amaka (50 points, has a completed order), `user_103` Tunde (0 points).

---

## 2. Technical Stack & Architecture Decisions

**Layout.** `backend/` (NestJS), `frontend/` (React + Vite + Tailwind), `mobile/` (Expo), `database/` (SQL migrations and scripts).
The backend is split by feature (`restaurants`, `reviews`, `points`) with shared pieces in `common/`
(error filter, response types, id generator, Postgres error helper). Controllers only translate HTTP;
services hold the rules; DTOs validate input.

**Database client: TypeORM on top of hand-written SQL migrations.**
- The schema lives in plain SQL files (`database/migrations/`), not in TypeORM entities (`synchronize: false`).
  That keeps partial unique indexes, `TEXT[]` columns and check constraints exactly as designed, and makes the
  rules visible to anyone who reads the SQL.
- TypeORM entities and repositories handle ordinary reads and writes, and its transaction manager handles the
  points logic. The Haversine distance is raw SQL inside a query builder, because the database is the right place
  to sort and filter by distance.
- I chose it over Prisma because NestJS integrates with it directly, and over raw `pg` everywhere because entities
  and repositories keep the common code short. Prisma handles partial indexes and array columns less naturally.

**State management on the web: React state, hooks and one small Context. No Redux or Zustand.**
- Server data goes through one small hook, `useAsyncData`, which cancels outdated requests, so a slow old answer can
  never overwrite a newer one.
- The only state shared across pages is "which demo user is signed in", held in a Context.
- Favourites live in their own hook (`useFavorites`), and filters are plain component state. The app is small
  enough that a state library would add code without removing any.

**API validation: class-validator DTOs with a global `ValidationPipe`** (`whitelist`, `forbidNonWhitelisted`,
`transform`), set up once in `app.setup.ts` and shared by the real app and the tests.
- Unknown fields are rejected, query strings are converted to numbers, and every message is returned in the
  same error shape by one exception filter: `{ success: false, error, statusCode, timestamp }`.
- Unexpected errors are logged in full but never leaked to the client.
- Validation is the first line of defence. The database constraints are the last: a rule that only exists in
  application code can be bypassed by two requests arriving together.

**Money-like rules are checked in a transaction.** Earning and redeeming points lock the user's row first
(section 3), and the balance is always the sum of an append-only ledger, so it cannot drift.

**Assumptions where the documents were silent or inconsistent** (all deliberate, all small):

| Topic | What I did, and why |
|---|---|
| "Completed order" for referrals | The schema has no orders. I added a minimal `orders` table so the rule is real. One completed order is seeded for `user_102`. |
| Voucher code | The contract returns one but the schema has nowhere to keep it. Migration 003 adds `points_ledger.voucher_code` (unique). |
| Duplicate points | Check-in duplicates return `400` as the contract says. Duplicate review or referral points also return `400`. Duplicate *reviews* return `409`. |
| Review points | Awarded once per restaurant, and only if the user has really reviewed it. |
| Referral points | The referred user must exist, have `referred_by` equal to the referrer, and have a completed order. One payout per referred user. |
| "Calendar day" | Computed in `Africa/Lagos` time, inside the index. |
| Average rating | Recalculated from the reviews table on every new review (the seeded averages are replaced by the first new review). |
| `cuisine` filter | Case-insensitive exact match. |
| Location parameters | `latitude` without `longitude` (or the reverse) is a `400`. `radius` is ignored without coordinates. |
| Name search | The API has no search parameter, so the web app filters the loaded list locally. |
| Favourites | The contract has no favourites endpoint, so the web app uses a clearly labelled mock service (`frontend/src/api/favorites.ts`). |

---

## 3. Handling Business Constraints & Corner Cases

### Duplicate check-ins (once per user, restaurant and day)

Enforced by the **database**, not by an `if` in the service:

```sql
CREATE UNIQUE INDEX uq_checkin_per_day
  ON points_ledger (user_id, restaurant_id, ((created_at AT TIME ZONE 'Africa/Lagos')::date))
  WHERE action = 'check-in';
```

The service simply tries the insert and turns the unique-violation error into a `400`
("You have already checked in at this restaurant today"). Because the check and the insert are one atomic
database operation, there is no gap for a second request to slip through.

- Tested: six identical check-ins fired at once produce exactly one `201` and five `400`s, and one row.
- Checked by `database/verify.sql` (run it with `psql -U postgres -d localbuka -f database/verify.sql`; it rolls back and
  leaves no data): 23:10 UTC (00:10 in Lagos) counts as a new day, while 22:50 UTC on the same Lagos day does not.
- The official `DATABASE_SCHEMA.sql` index (`created_at::DATE`) does not even compile (section 7). Computing
  the day in a fixed time zone fixed that and also answered what "day" means for Nigerian users.
- The same approach protects reviews (`UNIQUE (user_id, restaurant_id)`), review points and referral points.

### Optimistic UI for favourites (with rollback)

`frontend/src/hooks/useFavorites.ts`, condensed:

```ts
const toggleFavorite = async (restaurant) => {
  if (pendingKeys.has(key)) return                 // one request per restaurant at a time
  const becomesFavorite = !favoriteIds.has(restaurant.id)

  setMembership(becomesFavorite)                   // 1. update the screen immediately
  try {
    await setFavorite(userId, restaurant.id, becomesFavorite)
  } catch (error) {
    setMembership(!becomesFavorite)                // 2. roll back to the previous value
    onError(`Couldn't save ${restaurant.name} to your favorites. ${getErrorMessage(error)}`)
  } finally {
    clearPending(key)                              // 3. allow the next click
  }
}
```

- The rollback sets the value to the **opposite of what the click chose**, not to "whatever it is now", so it
  is correct even when other state changed in the meantime.
- A second click on the same restaurant is ignored while its request is pending. Otherwise an undo could race
  the change it is undoing.
- State is kept per user, so switching users while a request is running can never change the wrong list.
- The failure message appears as an alert (`role="alert"`) so screen readers announce it.
- The page's "Demo controls" has a switch that makes saving fail, so the rollback can be seen on demand.
- Tested: the heart is filled while the request is still pending, goes back on failure, and an alert appears.
  Removing the rollback line or making the heart wait for the server makes tests fail.

### Distance calculation and sorting (backend)

`GET /restaurants?latitude=..&longitude=..` computes the **Haversine** distance in PostgreSQL, filters by `radius`
(default 5 km), sorts nearest first, and returns `distance` in km rounded to two decimals.

- A rectangular pre-filter on latitude and longitude runs first, so the `(latitude, longitude)` index can discard
  far-away rows before the exact formula runs. (With five seeded rows the planner will not use the index. The
  design is for larger tables.)
- `LEAST(1, ...)` guards `ASIN` against floating-point values just above 1.
- Verified against an independent Python calculation: Yaba to White House Buka is 1.22 km, Yaba to Abuja 525.9 km.
- Mobile uses the same formula in TypeScript. The check-in rule is "less than 100 m", so exactly 100 m is refused.

### Redemption race conditions

`POST /points/redeem` runs in a transaction that first locks the user's row (`SELECT ... FOR UPDATE`), then reads
the balance, then inserts a negative ledger entry. Concurrent redemptions queue up behind the lock, so each one sees the
balance left by the one before it. Tested: with 220 points, six simultaneous redemptions of 50 give four `201`s,
two `400`s, and a final balance of 20. The web button is also disabled while a request runs. Section 5, Q3 compares
other approaches.

### Reviews

Rating must be a whole number 1 to 5 (the string `"5"` is rejected), tags are validated, and one review per user per
restaurant is a database constraint (`409`). The review insert and the average recalculation share one transaction
with the restaurant row locked. The review endpoint is limited to 10 requests per minute per IP (`429`).

---

## 4. Key Limitations & Future Enhancements

Things I did not do, in rough order of importance, and what I would do with another week:

1. **No authentication.** Both apps pick a demo user, and the API trusts the `userId` it is sent. Next: JWT or sessions,
   take the user from the token, and reject requests for other people's ids.
2. **Check-in distance is verified on the phone only.** The contract has no server-side location check, so a modified
   client could fake its position. Next: send the coordinates, verify them on the server, and add rate and anomaly checks.
3. **Rate limiting and locks are single-server.** The limiter keeps counts in memory, and the redemption lock is a
   database row lock (which is fine across servers). Next: Redis-backed rate limiting, plus idempotency keys on redeem
   (section 5, Q3).
4. **Favourites are a mock.** Nothing is stored on the server. Next: a real endpoint and table, using the same
   optimistic hook.
5. **Voucher codes are shown once.** The history endpoint (per the contract) does not return them. Next: a
   "my vouchers" endpoint and a way to mark one as used.
6. **No web screen for writing or reading reviews.** The README mentions a "reviews container", but the requirements,
   the case study and the rubric do not specify one. The reviews API is complete and tested. Next: a restaurant page
   listing reviews with a form.
7. **Promotions are not implemented.** `REQUIREMENTS.md` mentions "active promotions", but the contract, schema and
   mock data contain none.
8. **Cuisine options come from one unfiltered request** made when the page opens. Next: a small `/cuisines` endpoint.
9. **Large lists.** The page renders every result. Next: pagination from the API plus list virtualization (Q4).
10. **Operations.** Next: CI that runs lint and tests on every push, Docker Compose for PostgreSQL, a migration tool
    with versioning and rollback, structured logs with request ids, and browser end-to-end tests (Playwright).
11. **Mobile.** There is no reviews screen, no offline support, and the GPS accuracy value is not checked (a weak
    signal can place a user a few dozen metres off).

---

## 5. Technical Questions

(The three assessment PDFs ask slightly different questions. I answer the union of them. Code for Q1 and Q2 is in
the repository and tested.)

### Q1. TypeScript and API response validation (`parseRestaurant`)

**Where:** `backend/src/restaurants/parse-restaurant.ts` (34 tests) and `backend/src/restaurants/dto/restaurant-payload.dto.ts` (3 tests).

The ideal type is `RestaurantResponse` (the contract's restaurant: `priceRange: number`, `location: { lat, lng }`,
`avgRating: number`, `isOpen: boolean`, arrays for `tags` and `images`).

```ts
export function parseRestaurant(raw: unknown): RestaurantResponse   // throws RestaurantParseError
```

How it works:
- The input is `unknown`, so nothing is assumed. It must be a non-array object.
- Every key may be snake_case or camelCase (`price_range` or `priceRange`), and location may be nested or flat.
- A number may arrive as a number or a plain decimal string. `"4.50"` becomes `4.5`, but `""`, `"1e3"`, `"NaN"` and
  `"abc"` are rejected, so `Number()` surprises (`Number("") === 0`) cannot get through.
- Ranges are checked: price 1 to 4 and whole, latitude -90 to 90, longitude -180 to 180, rating 0 to 5.
- `is_open` accepts `true/false`, `1/0`, `"1"/"0"` and `"true"/"false"`, and rejects anything else instead of guessing.
- Missing `tags` or `images` become `[]`. Everything else missing is an error.
- It collects **all** problems and throws one `RestaurantParseError` whose `issues` array names each field, so a
  caller can fix a bad payload in one go instead of one error at a time.

**Integrating with NestJS's global `ValidationPipe`:** express the same rules as a DTO, and let the pipe (already
configured with `transform: true`) do the conversion and validation before the controller runs:

```ts
export class RestaurantPayloadDto {
  @Expose({ name: 'price_range' }) @Type(() => Number) @IsInt() @Min(1) @Max(4)
  priceRange: number;                                   // "2" -> 2

  @Expose({ name: 'avg_rating' }) @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  avgRating: number;                                    // "4.50" -> 4.5

  @Expose({ name: 'is_open' }) @Transform(toBooleanOrOriginal) @IsBoolean()
  isOpen: boolean;                                      // 1 / "1" / "true" -> true
  // ...id, name, cuisine, latitude, longitude, address, tags
}
```

- `@Expose({ name })` maps the snake_case key to the camelCase property.
- `@Type(() => Number)` (class-transformer) converts strings before class-validator checks them.
- `@Transform` handles flags, and returns unknown values **unchanged** so `@IsBoolean` rejects them.
- The pipe's `whitelist` and `forbidNonWhitelisted` options reject unknown fields, and bad input becomes a `400`
  with a list of messages. The DTO test runs it through the real `ValidationPipe`.
- The project already uses the same machinery for real: `QueryRestaurantsDto` and `CreateReviewDto`.
- The two approaches suit different places: the pipe for requests arriving at *our* API, `parseRestaurant` for data
  coming *from* another service, where we want a typed value or a precise error and not an HTTP response.

### Q2. Concurrent promises and graceful timeouts (`fetchNearbyRestaurants`)

**Where:** `backend/src/restaurants/fetch-nearby-restaurants.ts` (9 tests using fake timers).

```ts
const fetchNearbyRestaurants = createNearbyFetcher(
  { local: localDatabaseSource, fallback: googlePlacesSource },
  { timeoutMs: 5000, logger },
);
const restaurants = await fetchNearbyRestaurants({ lat, lng });   // never throws
```

- **Concurrent:** both sources start in the same tick, so if the local database fails, the Google request is
  already on its way. A test checks that both were called before either answered.
- **Local first:** the local result is used whenever it succeeds. Google is used only if the local source fails.
  I read "if the local database responds first, use it" as "local is the preferred source", because a fast
  fallback should not override the better data.
- **Strict 5000 ms:** one `AbortController` and one timer cover the whole operation. The signal is passed to both
  sources, and the function also races against it, so a source that ignores the signal still cannot hold the call open.
- **Safe failure:** if both fail, or time runs out, it returns `[]` and logs one structured error containing the
  coordinates, the limit, whether it timed out, and each source's error message.
- **No loose ends:** the unused request is aborted when the call finishes, the timer is always cleared, and the
  promise that is not being awaited cannot cause an unhandled rejection. A test checks that no timers are left.
- **Trade-off, and it is documented in a test:** if the local database *hangs* while Google answers quickly, the
  call waits the full 5 seconds and returns `[]`, because the brief says a timeout means an empty list. If availability
  mattered more, I would "hedge": start using Google if local has not answered after about one second, or use
  `Promise.any` (first success wins) and accept lower-quality results.

### Q3. Race conditions in points redemption

Two taps arrive before the first has written its ledger row. Both read "balance 100", both subtract 100.

**Database-level approach (implemented): pessimistic row lock.**

```sql
BEGIN;
SELECT id FROM users WHERE id = $1 FOR UPDATE;          -- the second request waits here
SELECT COALESCE(SUM(points), 0) FROM points_ledger WHERE user_id = $1;   -- fresh balance
-- if balance < amount: ROLLBACK and answer 400
INSERT INTO points_ledger (..., points) VALUES (..., -$2);
COMMIT;                                                  -- the waiting request now proceeds
```

Requests for the same user run one after another, and each reads the result of the previous one. Different users never
block each other. Alternatives at the same level: an **optimistic version check** (`UPDATE ... SET balance = ..., version = version + 1 WHERE version = $seen`,
retry on zero rows updated), a single atomic `UPDATE accounts SET balance = balance - $2 WHERE balance >= $2` if
the balance is stored as a column, or `SERIALIZABLE` isolation with retry on serialization failures.

**API/service-level approach (not implemented, designed):** an **idempotency key**. The client creates a unique key
per user action (for example a UUID generated when the form opens) and sends it in a header. The server stores the key
with the response, and a repeat of the same key returns the stored response without redeeming again. This also protects
against network retries and double taps, but does not by itself stop two *different* redemptions from racing.
Pair it with a **per-user lock** (a Redis `SET key value NX PX 5000` lock, or a queue such as BullMQ with one job at a
time per user). An in-process mutex only works with a single server instance.

**Client-side (implemented, but never a defence on its own):** the Redeem button is disabled while a request is running.

Evidence: six simultaneous redemptions against 220 points give four successes, two rejections, and a balance of 20.
Removing the lock makes this test fail.

### Q4 (case study) and frontend Q2. Rendering 200+ cards smoothly

Three strategies, in the order I would apply them:

1. **Virtualization (windowing).** Render only the cards in or near the viewport, around 10 to 15 of 200, so the DOM stays small
   and the browser lays out and paints far less. With a library such as `@tanstack/react-virtual` or `react-window`:
   ```tsx
   const virtualizer = useWindowVirtualizer({ count: rows.length, estimateSize: () => 360, overscan: 3 })
   // render virtualizer.getVirtualItems().map(...) positioned with transform: translateY(...)
   ```
   For a responsive grid, virtualize **rows** (cards per row follows from the container width). Keep an `overscan`
   of a few rows so fast scrolling does not show blanks. On a 60 fps target, each frame has about 16 ms of budget.
2. **Stop re-rendering what did not change.** Wrap `RestaurantCard` in `React.memo`, pass primitive props
   (our card already receives a boolean `isFavorite`, not the whole set), and keep callbacks stable.
   *Honest note about this code base:* `toggleFavorite` is recreated whenever favourites change, so `memo` alone would
   not help yet. I would first make it stable (a reducer's `dispatch`, or reading current state through a ref) and then
   add `memo`. Also use stable `key`s, and avoid creating new objects or arrays inside `render`.
3. **Do less work per interaction and per card.** Keep typing responsive with `useDeferredValue` (or
   `startTransition`) for the search text, so filtering the list never blocks the input. Use `loading="lazy"`
   and `decoding="async"` on images (lazy loading is already in place) and give images a fixed aspect ratio
   (done) so nothing shifts. CSS `content-visibility: auto` skips rendering off-screen cards. Paginate or infinitely
   scroll from the API instead of loading everything.

**How to measure** (before and after each change, on the same machine, with **CPU throttling at 4x or 6x** to
imitate a low-end phone):
- **Chrome DevTools, Performance tab:** record a scroll and a filter change. Look at the frame chart for dropped
  frames (red) and long tasks above 50 ms, and compare *Scripting*, *Rendering* and *Painting* time. Turn on the FPS
  meter in the Rendering panel. The *Performance monitor* shows DOM node count and JS heap size, which virtualization should cut sharply.
- **React DevTools Profiler:** record the same interaction, compare commit duration, and use "Why did this render?" to
  confirm cards stop re-rendering when only one favourite changed.
- **Lighthouse or the Performance panel's Interactions track:** compare Interaction to Next Paint (INP) and Total
  Blocking Time. Write the numbers in a before/after table.

### Backend track Q2 (database-level lock strategy)

See Q3. The implemented strategy is `SELECT ... FOR UPDATE` on the user's row inside a transaction
(`backend/src/points/points.service.ts`, `redeemInTransaction` and `lockUser`). The alternative is an optimistic version check with retry.

### Frontend track Q1 (rollback in the catch block)

See the code in section 3 (Optimistic UI). The full version is `frontend/src/hooks/useFavorites.ts`, used by
`DiscoverPage`, and the card's heart is `FavoriteButton` (a real `<button>` with `aria-pressed`).

---

## 6. How This Was Verified

| Area | Automated checks |
|---|---|
| Backend | 46 unit tests and 60 end-to-end tests against a real PostgreSQL test database, strict type-check, lint |
| Web | 73 component, hook and page tests, production build, lint |
| Mobile | 39 tests (Haversine, the full check-in flow, deep links), strict type-check, the app bundles with Metro |
| Fresh machine | The README steps were repeated on a clean copy: database script, install, seed, start, health check, every suite |

- **Concurrency is tested, not assumed:** simultaneous duplicate reviews, check-ins and redemptions.
- **The tests were checked for teeth.** For each important rule I temporarily broke the code (removed a lock, a
  constraint, the rollback, the distance check, the 100 m boundary and so on) and confirmed that tests fail.
- **Real integration:** the web pages and the mobile API client were also run against the real backend and
  database, and compared with the API's own output.
- **What a machine cannot judge:** how the UI looks, and the GPS permission dialogs on a physical phone. Those need a
  human with a browser and a phone. The mobile screen has a clearly labelled, development-only "Pretend I am at this
  restaurant" switch so the success path can be tried from anywhere. The distance rule still applies to it.

---

## 7. Problems Found in the Assessment Materials

Noted in case they are useful to the reviewers.

1. **`DATABASE_SCHEMA.sql` fails to run.** The check-in index uses `created_at::DATE` on a `TIMESTAMPTZ`
   column. PostgreSQL rejects it with `functions in index expression must be marked IMMUTABLE`, because the cast depends
   on the session time zone. I replaced it with an index on `(created_at AT TIME ZONE 'Africa/Lagos')::date`.
2. **The mock ledger has no `restaurantId`,** while the SQL seed does. A missing restaurant would break the
   "review points once per restaurant" rule, so the seed script takes those two ids from the SQL seed.
3. **Timestamps differ** between the JSON (UTC) and the SQL seed (`+01`). I followed `mock_data.json`.
4. **The three PDFs ask different technical questions.** I answered all of them (section 5).
5. **No orders exist** although referrals need a "completed order" (see section 2).
6. **The README's "reviews container" and the requirements' "active promotions"** have no matching contract, schema or rubric item (section 4).
7. **The README's document links use `file:///` paths** that do not work on GitHub.