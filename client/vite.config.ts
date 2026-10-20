import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In development the API runs on :4000; the browser only talks to :5173.
    proxy: { "/api": "http://localhost:4000" },
  },
});
