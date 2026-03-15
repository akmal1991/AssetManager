import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["author", "editor", "reviewer", "admin"]);
export const degreeEnum = pgEnum("scientific_degree", ["PhD", "DSc", "none"]);
export const positionEnum = pgEnum("position", ["teacher", "senior_teacher", "associate_professor", "professor"]);

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("author"),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  scientificDegree: degreeEnum("scientific_degree").notNull().default("none"),
  position: positionEnum("position").notNull().default("teacher"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
