import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle-vercel",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/current" },
  strict: true,
  verbose: true,
});
