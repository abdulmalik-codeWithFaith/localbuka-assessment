# LocalBuka: restaurant discovery, reviews and rewards

A small version of the LocalBuka platform, built for the LocalBuka Engineering Intern technical assessment.
People find a *buka* (a neighbourhood Nigerian eatery) by cuisine, price, rating and distance, review it,
check in with their phone's GPS to earn points, and redeem points for vouchers.

| Part | Folder | Stack |
|---|---|---|
| REST API | [`backend/`](backend) | NestJS, TypeScript, PostgreSQL, TypeORM |
| Web app | [`frontend/`](frontend) | React, TypeScript, Vite, Tailwind CSS |
| Mobile app | [`mobile/`](mobile) | React Native (Expo), TypeScript |
| Database | [`database/`](database) | Plain SQL migrations and helper scripts |

Design decisions, trade-offs, answers to the technical questions and known limitations are in
**[SOLUTION.md](SOLUTION.md)**.

## What you need

- **Node.js 22.22.3 or newer** (`node -v`)
- **PostgreSQL 16** with `psql` on your PATH
- **Git** (on Windows, use Git Bash for the commands below)
- For the mobile app: a phone with **Expo Go** (latest version) on the same Wi-Fi as your computer

## Run everything

Open three terminals. Commands run from the repository root unless a `cd` says otherwise.

### 1. Database (once)

```bash
export PGPASSWORD='your-postgres-password'   # so psql does not ask every time
bash database/setup-db.sh                    # creates the "localbuka" database and applies the migrations
```

### 2. Backend (terminal 1)

```bash
cd backend
npm install
cp .env.example .env        # then edit .env and put your PostgreSQL password in DB_PASSWORD
npm run seed                # loads the restaurants, users, reviews and points from mock_data.json
npm run start:dev           # API on http://localhost:3000
```

Check it: open <http://localhost:3000/health>. You should see `{"success":true,"data":{"status":"ok","database":"up"}}`.

### 3. Web app (terminal 2)

```bash
cd frontend
npm install
npm run dev                 # opens on http://localhost:5173
```

### 4. Mobile app (terminal 3)

```bash
cd mobile
npm install
npx expo start              # scan the QR code with Expo Go
```

The app finds your computer's address by itself while developing. If it cannot reach the API, copy
`mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:3000`.
Your computer's firewall must allow Node.js on private networks. More detail is in [`mobile/README.md`](mobile/README.md).

> If `npm install` stops with `Cannot read properties of null (reading 'edgesOut')`, run `npm install --legacy-peer-deps`.

## Demo users

There is no login. The web and mobile apps let you pick one of the seeded users.

| User | Id | Starts with |
|---|---|---|
| Chijioke Adebayo | `user_101` | 20 points (and referred `user_102`) |
| Amaka Nwosu | `user_102` | 50 points, has a completed order |
| Tunde Bakare | `user_103` | 0 points |

Run `npm run seed` in `backend/` at any time to reset all data (stop the server first).

## Tests

| Where | Command | What it covers |
|---|---|---|
| `backend/` | `npm test` | 46 unit tests, then 60 end-to-end tests against a real test database |
| `frontend/` | `npm test` | 73 component, hook and page tests |
| `mobile/` | `npm test` | 39 tests for the distance maths, the check-in flow and deep links |

The backend end-to-end tests use their own database and refuse to run against any database whose name
does not end in `_test`. Create it once:

```bash
export PGPASSWORD='your-postgres-password'
bash database/setup-test-db.sh      # creates "localbuka_test"
```

Static checks: `npm run lint` and `npm run build` in `backend/` and `frontend/`, and `npx tsc --noEmit` in `mobile/`.

## API at a glance

Every success response is `{ "success": true, "data": ... }`. Every error is
`{ "success": false, "error": "...", "statusCode": 400, "timestamp": "..." }`.

| Method and path | Purpose | Notable rules |
|---|---|---|
| `GET /restaurants` | Search | Filters: `cuisine`, `priceRange`, `minRating`. With `latitude` and `longitude` it adds `distance` (km), sorts nearest first and applies `radius` (default 5 km). |
| `GET /restaurants/:id` | One restaurant with its reviews | `404` if unknown |
| `POST /restaurants/:id/reviews` | Add a review | Rating 1 to 5; one review per user per restaurant (`409`); 10 requests per minute per IP (`429`) |
| `POST /points/earn` | Earn points | `check-in` 50 (once per restaurant per day), `review` 20, `referral` 100; duplicates are `400` |
| `POST /points/redeem` | Redeem points | Multiples of 50, never more than the balance; returns a voucher code |
| `GET /points/balance/:userId` | Balance and history | Newest first |
| `GET /health` | Health check | Confirms the database is reachable |

## Environment variables

| File | Variable | Meaning |
|---|---|---|
| `backend/.env` | `PORT` | API port (default 3000) |
| | `CORS_ORIGIN` | Web app address allowed to call the API (default `http://localhost:5173`) |
| | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| | `TEST_DB_NAME` | Optional. Test database name (default `localbuka_test`) |
| `frontend/.env` | `VITE_API_URL` | Optional. API address (default `http://localhost:3000`) |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` | Optional. API address when it cannot be detected |

Real `.env` files are git-ignored. Only the `.env.example` files are committed.

## Repository layout

```text
backend/    NestJS API: restaurants, reviews, points, shared filters and utilities, seed script, tests
frontend/   React web app: discovery page, rewards dashboard, reusable components, hooks, tests
mobile/     Expo app: restaurant list and detail, GPS check-in, deep links, tests
database/   SQL migrations (001 to 003), setup scripts and a rule-checking script
```

The original assessment documents (`REQUIREMENTS.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA.sql`,
`mock_data.json`, the PDFs and so on) are untouched.


# LocalBuka Engineering Intern — Technical Assessment

Welcome! This is the official starter repository for the LocalBuka engineering intern technical assessment.

This assessment is designed to evaluate your practical development skills, problem-solving, and clean-coding habits across React, React Native, NestJS, and general JavaScript/TypeScript.

## Getting Started

1. **Fork this repository** to your own GitHub account.
2. **Rename it** (or keep it as is, but ensure it's a public fork under your account).
3. **Clone your fork** to your local machine and start building.
4. **Commit regularly** — we review your commit history to understand your workflow!

## What You're Building

A simplified version of LocalBuka's core platform features:
- **Backend (NestJS / Node.js):** REST API for restaurant discovery, reviews, rewards, and order tracking.
- **Frontend (React):** A discovery dashboard, reviews container, and points dashboard.
- **Mobile (React Native):** A simple detail screen with mock GPS-based check-in.

Detailed files are provided in this repository to guide your implementation:
- [REQUIREMENTS.md](file:///REQUIREMENTS.md) — The core functional brief and constraints.
- [mock_data.json](file:///mock_data.json) — Sample data to seed your database.
- [API_CONTRACTS.md](file:///API_CONTRACTS.md) — The OpenAPI-style endpoints and request/response models.
- [DATABASE_SCHEMA.sql](file:///DATABASE_SCHEMA.sql) — Standard PostgreSQL relational tables.
- [BOILERPLATE.md](file:///BOILERPLATE.md) — Boilerplate configuration examples, folders, and utility snippets.
- [SOLUTION_TEMPLATE.md](file:///SOLUTION_TEMPLATE.md) — The template document you *must* fill out detailing your implementation.
- [EVALUATION_RUBRIC.md](file:///EVALUATION_RUBRIC.md) — The exact criteria our team will use to score your submission.

## Directory Structure

We recommend organizing your codebase as follows inside your fork:
```text
assessment-repo/
├── README.md
├── REQUIREMENTS.md
├── mock_data.json
├── API_CONTRACTS.md
├── DATABASE_SCHEMA.sql
├── BOILERPLATE.md
├── SOLUTION_TEMPLATE.md
├── EVALUATION_RUBRIC.md
├── backend/                  # Place NestJS app here
└── frontend/                 # Place React and/or React Native apps here
```

## Submission Instructions

Once complete, please submit your solution via email to: **hellohr@localbuka.com**

Your email must include:
1. **GitHub Repository Link**: A link to your public fork of this repository.
2. **Setup Confirmation**: Confirm that the backend and frontend run using standard scripts.
3. **Walkthrough Video**: A 2-3 minute screen recording (e.g., via Loom or Google Drive link) demonstrating your features and discussing one interesting bug you resolved.
4. **Unfinished Features & Trade-offs**: A brief mention of what you left out or would change with more time.

*Good luck! We look forward to reviewing your solution.*
