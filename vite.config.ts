import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 5173,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
    // Explicit SPA fallback to ensure deep links like /admin-vs-2024
    // return index.html instead of 404.
    middlewareMode: false,
  },
  preview: {
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

