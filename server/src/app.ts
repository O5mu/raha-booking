import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { errorHandler } from "./middleware/errors.js";
import { authRouter } from "./routes/auth.js";
import { istirahasRouter } from "./routes/istirahas.js";
import { bookingsRouter } from "./routes/bookings.js";
import { ownerRouter } from "./routes/owner.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/istirahas", istirahasRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/owner", ownerRouter);
  app.use("/api/admin", adminRouter);

  app.use(errorHandler);
  return app;
}
