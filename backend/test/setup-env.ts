import { existsSync } from 'node:fs';

// Reuse the database credentials from .env, but always point at a separate test database
// so running the tests can never touch your development data.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'localbuka_test';