import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
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
  role: text("role").$type<typeof roleValues[number]>().notNull().default("author"),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  scientificDegree: text("scientific_degree").$type<typeof degreeValues[number]>().notNull().default("none"),
  position: text("position").$type<typeof positionValues[number]>().notNull().default("teacher"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
