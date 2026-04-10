import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { db, sqlite } from "./index";
import {
  auditLogsTable,
  departmentsTable,
  emailTemplatesTable,
  scientificDirectionsTable,
  usersTable,
} from "./schema";
import {
  seedDepartments,
  seedEmailTemplates,
  seedScientificDirections,
} from "./seed-data";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) {
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'author',
      department_id INTEGER REFERENCES departments(id),
      scientific_degree TEXT NOT NULL DEFAULT 'none',
      position TEXT NOT NULL DEFAULT 'teacher',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS scientific_directions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      abstract TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'uz',
      department_id INTEGER REFERENCES departments(id),
      scientific_direction TEXT NOT NULL,
      literature_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      author_id INTEGER NOT NULL REFERENCES users(id),
      editor_notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      file_path TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      scientific_significance INTEGER,
      methodology INTEGER,
      structure_clarity INTEGER,
      originality INTEGER,
      comments_for_author TEXT,
      comments_for_editor TEXT,
      verdict TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      submitted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      detail TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  const [{ value: departmentsCount }] = await db
    .select({ value: count() })
    .from(departmentsTable);
  if (departmentsCount === 0) {
    await db.insert(departmentsTable).values(
      seedDepartments.map((name) => ({ name })),
    );
  }

  const [{ value: directionsCount }] = await db
    .select({ value: count() })
    .from(scientificDirectionsTable);
  if (directionsCount === 0) {
    await db.insert(scientificDirectionsTable).values(
      seedScientificDirections.map((name) => ({ name })),
    );
  }

  const [{ value: templatesCount }] = await db
    .select({ value: count() })
    .from(emailTemplatesTable);
  if (templatesCount === 0) {
    await db.insert(emailTemplatesTable).values(
      seedEmailTemplates.map((template) => ({ ...template })),
    );
  }

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(usersTable);
  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash("Admin@Uni2026!", 10);
    await db.insert(usersTable).values({
      fullName: "System Administrator",
      email: "admin@uni.uz",
      passwordHash,
      role: "admin",
      scientificDegree: "none",
      position: "teacher",
    });

    await db.insert(auditLogsTable).values({
      action: "database_initialized",
      detail: "SQLite local database initialized with seed data",
    });
  }

  initialized = true;
}
