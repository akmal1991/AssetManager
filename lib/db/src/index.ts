import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost/assetmanager";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./init";
