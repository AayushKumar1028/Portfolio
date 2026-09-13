import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // Pin the dev server to IPv4; Node otherwise binds "localhost" to [::1]
    // only, and http://127.0.0.1:5173 stops resolving.
    host: "127.0.0.1",
    port: 5173,
    // Dev only: proxy API calls to the Flask backend so there is no CORS setup.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
});
