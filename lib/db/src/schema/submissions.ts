import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, departmentsTable } from "./users";

export const submissionStatusValues = [
  "submitted", "under_review", "revision_required", "accepted", "rejected", "published"
] as const;

export const literatureTypeValues = [
  "darslik", "oquv_qollanma", "monografiya", "oquv_uslubiy_qollanma", "uslubiy_korsatma"
] as const;

export const docTypeValues = [
  "internal_review", "external_review", "plagiarism_report", "curriculum", "syllabus", "main_document"
] as const;

export const reviewStatusValues = ["pending", "submitted"] as const;

export const verdictValues = ["accept", "minor_revision", "major_revision", "reject"] as const;

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  language: text("language").notNull().default("uz"),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  scientificDirection: text("scientific_direction").notNull(),
  literatureType: text("literature_type").$type<typeof literatureTypeValues[number]>().notNull(),
  status: text("status").$type<typeof submissionStatusValues[number]>().notNull().default("submitted"),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  editorNotes: text("editor_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  docType: text("doc_type").$type<typeof docTypeValues[number]>().notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  scientificSignificance: integer("scientific_significance"),
  methodology: integer("methodology"),
  structureClarity: integer("structure_clarity"),
  originality: integer("originality"),
  commentsForAuthor: text("comments_for_author"),
  commentsForEditor: text("comments_for_editor"),
  verdict: text("verdict").$type<typeof verdictValues[number]>(),
  status: text("status").$type<typeof reviewStatusValues[number]>().notNull().default("pending"),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
export type Document = typeof documentsTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
