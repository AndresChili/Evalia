import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js carga .env.local automáticamente en la app; el CLI de Prisma no, así que lo hacemos aquí.
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Conexión directa (sin pooler) para Migrate: evita problemas de DDL/prepared statements
    // a través de PgBouncer. El runtime de la app usa DATABASE_URL (pooled) via lib/db.ts.
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
