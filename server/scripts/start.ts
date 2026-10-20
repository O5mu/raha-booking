// Production entry point: bring the database up to date, optionally reset the
// demo data, then start the API.
import { config } from "../src/config.js";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";

await migrate();
if (config.seedOnStart) {
  await seed();
  console.log("demo data reset");
}
await import("../src/index.js");
