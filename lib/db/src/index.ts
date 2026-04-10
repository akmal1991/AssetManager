import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.resolve(
  currentDir,
  "..",
  "..",
  "..",
  "local.db",
);

function resolveDatabasePath(input?: string) {
  if (!input || input.trim() === "") {
    return defaultDatabasePath;
  }

  const normalized = input.startsWith("file:") ? input.slice(5) : input;
  return path.isAbsolute(normalized)
    ? normalized
    : path.resolve(process.cwd(), normalized);
}

export const databaseFilePath = resolveDatabasePath(process.env.DATABASE_URL);
export const sqlite = new Database(databaseFilePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export * from "./schema";
export * from "./init";
