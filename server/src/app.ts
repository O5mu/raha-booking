import express from "express";
import path from "node:path";
import { pool } from "./db.js";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errors.js";
import { authRouter } from "./routes/auth.js";
import { istirahasRouter } from "./routes/istirahas.js";
import { bookingsRouter } from "./routes/bookings.js";
import { ownerRouter } from "./routes/owner.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  // No CORS middleware: the React app is always served from the same origin
  // (Vite's proxy in development, this server in production).
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
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // In production the same server also serves the built React app.
  if (config.staticDir) {
    const staticDir = config.staticDir;
    // Files in /assets have a content hash in their name, so browsers can cache them for a year.
    app.use(express.static(staticDir, { index: false, maxAge: "1y", immutable: true }));
    // Any other GET (e.g. /istirahas/3) gets index.html and React Router shows the right page.
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      res.set("Cache-Control", "no-cache").sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
