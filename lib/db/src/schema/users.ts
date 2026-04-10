import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleValues = ["author", "editor", "reviewer", "admin"] as const;
export const degreeValues = ["PhD", "DSc", "none"] as const;
export const positionValues = [
  "teacher",
  "senior_teacher",
  "associate_professor",
  "professor",
] as const;

const timestampDefault = sql`(unixepoch() * 1000)`;

export const departmentsTable = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
});

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: roleValues }).notNull().default("author"),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  scientificDegree: text("scientific_degree", { enum: degreeValues })
    .notNull()
    .default("none"),
  position: text("position", { enum: positionValues })
    .notNull()
    .default("teacher"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
