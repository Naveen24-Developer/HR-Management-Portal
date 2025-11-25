import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

// Lazily initialize the database connection to avoid throwing during build-time
// (Next.js may import server modules during build). Only attempt to connect
// when the DB is actually used at runtime.

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const connectionString = process.env.DATABASE_URL;
  // Disable prefetch as it is not supported for "Transaction" pool mode
  _client = postgres(connectionString, { prepare: false });
  _db = drizzle(_client, { schema });
  return _db;
}

function getDb() {
  if (_db) return _db;
  return createDb();
}

// Export a proxy that defers to the real drizzle instance when any property
// is accessed. This keeps existing imports (`import { db } from ...`) working
// while avoiding throwing at module import time.
export const db = new Proxy(
  {},
  {
    get(_, prop) {
      const real = getDb();
      // @ts-ignore - forward property access to the real db
      const value = (real as any)[prop];
      if (typeof value === 'function') {
        return value.bind(real);
      }
      return value;
    },
    // support calling the db as a function if needed (unlikely)
    apply(_, thisArg, args) {
      const real = getDb();
      // @ts-ignore
      return (real as any).apply(thisArg, args);
    },
  }
) as unknown as ReturnType<typeof drizzle>;

export const _rawClient = () => _client;
