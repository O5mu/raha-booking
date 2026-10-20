import pg from "pg";
import { config } from "./config.js";

// Postgres returns DATE columns as JS Date objects by default, which shifts
// them by the server's timezone. We keep them as plain "YYYY-MM-DD" strings.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

// NUMERIC comes back as a string (to avoid float rounding); our prices are
// whole riyals, so converting to number is safe.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

// Runs fn inside a transaction on one dedicated connection.
// Everything in fn either commits together or rolls back together.
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
