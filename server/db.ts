import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const shouldUseSSL =
  (process.env.DB_SSL && process.env.DB_SSL.toLowerCase() === 'true') ||
  (process.env.PGSSLMODE && process.env.PGSSLMODE.toLowerCase() === 'require') ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle({ client: pool, schema });
