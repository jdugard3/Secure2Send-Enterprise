import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from "./env";

// Create pool with UTC timezone to ensure consistent timestamp handling
export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  // Set timezone to UTC for all connections to prevent timezone issues
  options: '-c timezone=UTC'
});
export const db = drizzle({ client: pool, schema });

// Log timezone configuration
pool.on('connect', (client) => {
  client.query('SET timezone = "UTC"', (err) => {
    if (err) {
      console.error('❌ Failed to set timezone to UTC:', err);
    }
  });
});