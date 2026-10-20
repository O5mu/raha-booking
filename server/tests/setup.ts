// Runs before every test file: each file starts from fresh demo data.
import { afterAll, beforeAll } from "vitest";
import { pool } from "../src/db.js";
import { seed } from "../scripts/seed.js";

beforeAll(seed);
afterAll(() => pool.end());
