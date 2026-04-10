import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
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

const timestampDefault = sql`(unixepoch() * 1000)`;

export const submissionsTable = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  language: text("language").notNull().default("uz"),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  scientificDirection: text("scientific_direction").notNull(),
  literatureType: text("literature_type", { enum: literatureTypeValues }).notNull(),
  status: text("status", { enum: submissionStatusValues }).notNull().default("submitted"),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  editorNotes: text("editor_notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
});

export const documentsTable = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  docType: text("doc_type", { enum: docTypeValues }).notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  filePath: text("file_path").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
});

export const reviewsTable = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").notNull().references(() => submissionsTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  scientificSignificance: integer("scientific_significance"),
  methodology: integer("methodology"),
  structureClarity: integer("structure_clarity"),
  originality: integer("originality"),
  commentsForAuthor: text("comments_for_author"),
  commentsForEditor: text("comments_for_editor"),
  verdict: text("verdict", { enum: verdictValues }),
  status: text("status", { enum: reviewStatusValues }).notNull().default("pending"),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" })
    .notNull()
    .default(timestampDefault),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
export type Document = typeof documentsTable.$inferSelect;
export type Review = typeof reviewsTable.$inferSelect;
