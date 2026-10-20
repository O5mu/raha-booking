// Runs once before all tests: rebuilds the test database from the migrations.
export default async function () {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://raha:raha@localhost:5432/raha_test";
  // Safety net: this wipes everything, so never run it against a non-test database.
  if (!new URL(url).pathname.includes("test")) {
    throw new Error(`Refusing to wipe ${url}: the database name must contain "test"`);
  }
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET ??= "test-secret";

  const { pool } = await import("../src/db.js");
  const { migrate } = await import("../scripts/migrate.js");
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate();
  await pool.end();
}
