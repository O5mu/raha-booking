import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  demoMode: process.env.DEMO_MODE === "true",
  // Reset the demo data every time the server starts (used on the live demo).
  seedOnStart: process.env.SEED_ON_START === "true",
  // Folder with the built React app; unset in development (Vite serves it).
  staticDir: process.env.STATIC_DIR,
};
