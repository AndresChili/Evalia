import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Node por defecto: la mayoría de tests son lógica de servidor (DB, archivos, auth).
    // jsdom crea un realm JS separado donde `instanceof Uint8Array` falla para Buffers de
    // Node (p. ej. rompe `file-type`), así que solo se activa por archivo con un docblock
    // `// @vitest-environment jsdom` en los tests que de verdad necesiten DOM.
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
