import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { submissionsTable, documentsTable, reviewsTable, usersTable, departmentsTable } from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";

const router = Router();

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const subId = req.params.id;
    const now = new Date();
    const dir = path.join(UPLOAD_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), subId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
const VALID_STATUSES = new Set(["submitted", "under_review", "revision_required", "accepted", "rejected", "published"]);
const VALID_DOC_TYPES = new Set(["internal_review", "external_review", "plagiarism_report", "curriculum", "syllabus", "main_document"]);
const FINAL_STATUSES = new Set(["accepted", "rejected", "published"]);

function safeUnlink(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete uploaded file: ${filePath}`, error);
  }
}

async function ensureSubmissionAccess(req: any, submissionId: number) {
  const user = req.user;
  const submission = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId)).limit(1);
  const current = submission[0];

  if (!current) {
    return { error: { status: 404, message: "Submission not found" } };
  }

  const canManage = user.role === "admin" || user.role === "editor" || user.role === "publisher" || current.authorId === user.id;
  if (!canManage) {
    return { error: { status: 403, message: "Forbidden" } };
  }

  return { submission: current };
}

async function ensureSubmissionViewAccess(req: any, submissionId: number) {
  const user = req.user;
  const submission = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId)).limit(1);
  const current = submission[0];

  if (!current) {
    return { error: { status: 404, message: "Submission not found" } };
  }

  if (user.role === "admin" || user.role === "editor" || user.role === "publisher" || current.authorId === user.id) {
    return { submission: current };
  }

  if (user.role === "reviewer") {
    const assigned = await db.select({ id: reviewsTable.id }).from(reviewsTable)
      .where(and(eq(reviewsTable.submissionId, submissionId), eq(reviewsTable.reviewerId, user.id)))
      .limit(1);
    if (assigned[0]) {
      return { submission: current };
    }
  }

  return { error: { status: 403, message: "Forbidden" } };
}

async function ensureFileMutationAccess(req: any, submissionId: number) {
  const user = req.user;
  const submission = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId)).limit(1);
  const current = submission[0];

  if (!current) {
    return { error: { status: 404, message: "Submission not found" } };
  }

  const isOwnerEditable =
    current.authorId === user.id &&
    (current.status === "submitted" || current.status === "revision_required");
  const canManageFiles = user.role === "admin" || user.role === "editor" || user.role === "publisher" || isOwnerEditable;

  if (!canManageFiles) {
    return { error: { status: 403, message: "Forbidden" } };
  }

  return { submission: current };
}

async function getSubmissionWithDetails(id: number) {
  const subs = await db
    .select({
      submission: submissionsTable,
      authorName: usersTable.fullName,
      deptName: departmentsTable.name,
    })
    .from(submissionsTable)
    .leftJoin(usersTable, eq(submissionsTable.authorId, usersTable.id))
    .leftJoin(departmentsTable, eq(submissionsTable.departmentId, departmentsTable.id))
    .where(eq(submissionsTable.id, id))
    .limit(1);
  return subs[0];
}

function formatSub(row: any) {
  return {
    ...row.submission,
    authorName: row.authorName,
    departmentName: row.deptName,
  };
}

function buildReviewSummary(reviews: Array<any>) {
  const submitted = reviews.filter((review) => review.status === "submitted");
  const latestSubmitted = submitted
    .filter((review) => review.submittedAt)
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];

  return {
    totalAssigned: reviews.length,
    pendingCount: reviews.filter((review) => review.status === "pending").length,
    submittedCount: submitted.length,
    positiveCount: submitted.filter((review) => review.classification === "positive").length,
    negativeCount: submitted.filter((review) => review.classification === "negative").length,
    assignedExpertNames: reviews.map((review) => review.reviewerName).filter(Boolean),
    latestReviewId: latestSubmitted?.id ?? null,
    latestVerdict: latestSubmitted?.verdict ?? null,
    latestClassification: latestSubmitted?.classification ?? null,
    latestSubmittedAt: latestSubmitted?.submittedAt ?? null,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const page = Math.max(1, parseInt(String(req.query.page ?? 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20))));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    let query = db
      .select({
        submission: submissionsTable,
        authorName: usersTable.fullName,
        deptName: departmentsTable.name,
      })
      .from(submissionsTable)
      .leftJoin(usersTable, eq(submissionsTable.authorId, usersTable.id))
      .leftJoin(departmentsTable, eq(submissionsTable.departmentId, departmentsTable.id));

    const conditions: any[] = [];
    if (user.role === "author") {
      conditions.push(eq(submissionsTable.authorId, user.id));
    }
    if (statusFilter) {
      conditions.push(eq(submissionsTable.status, statusFilter as any));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions) as any) as any;
    }

    const items = await (query as any).limit(limit).offset(offset);
    const submissionIds = items.map((item: any) => item.submission.id);
    const reviews = submissionIds.length > 0
      ? await db
        .select({ review: reviewsTable, reviewerName: usersTable.fullName })
        .from(reviewsTable)
        .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
        .where(inArray(reviewsTable.submissionId, submissionIds))
      : [];
    const reviewMap = new Map<number, Array<any>>();
    for (const row of reviews) {
      const review = { ...row.review, reviewerName: row.reviewerName };
      const bucket = reviewMap.get(review.submissionId) ?? [];
      bucket.push(review);
      reviewMap.set(review.submissionId, bucket);
    }
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(submissionsTable);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions) as any) as any;
    }
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count ?? 0);

    res.json({
      items: items.map((item: any) => ({
        ...formatSub(item),
        reviewSummary: buildReviewSummary(reviewMap.get(item.submission.id) ?? []),
      })),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "author") {
      res.status(403).json({ error: "Only authors can create submissions" });
      return;
    }
    const body = req.body ?? {};
    const {
      title,
      abstract,
      keywords,
      language,
      departmentId,
      scientificDirection,
      literatureType,
    } = body;
    if (!title || !abstract || !departmentId || !scientificDirection || !literatureType) {
      res.status(400).json({ error: "title, abstract, departmentId, scientificDirection, literatureType required" });
      return;
    }
    if (!["uz", "en", "ru"].includes(String(language ?? "uz"))) {
      res.status(400).json({ error: "Unsupported language" });
      return;
    }
    if (!["darslik", "oquv_qollanma", "monografiya", "oquv_uslubiy_qollanma", "uslubiy_korsatma"].includes(String(literatureType))) {
      res.status(400).json({ error: "Invalid literatureType" });
      return;
    }
    const normalizedKeywords = Array.isArray(keywords)
      ? keywords.map((keyword) => String(keyword).trim()).filter(Boolean).slice(0, 10)
      : [];
    const inserted = await db.insert(submissionsTable).values({
      title: String(title).trim(),
      abstract: String(abstract).trim(),
      keywords: normalizedKeywords,
      language: language ?? "uz",
      departmentId: departmentId ? Number(departmentId) : null,
      scientificDirection: String(scientificDirection).trim(),
      literatureType,
      status: "submitted",
      authorId: user.id,
    }).returning();
    const sub = inserted[0];
    const row = await getSubmissionWithDetails(sub.id);
    await logAction(req, "submission_created", { entityType: "submission", entityId: sub.id, detail: `"${title}" (${literatureType})` });
    res.status(201).json(formatSub(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const access = await ensureSubmissionViewAccess(req as any, id);
    if ("error" in access) {
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }
    const row = await getSubmissionWithDetails(id);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const docs = await db.select().from(documentsTable).where(eq(documentsTable.submissionId, id));
    const reviews = await db
      .select({ review: reviewsTable, reviewerName: usersTable.fullName })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
      .where(eq(reviewsTable.submissionId, id));

    res.json({
      ...formatSub(row),
      documents: docs,
      reviews: reviews.map(r => ({ ...r.review, expertId: r.review.reviewerId, expertName: r.reviewerName, reviewerName: r.reviewerName })),
      reviewSummary: buildReviewSummary(reviews.map((review) => ({ ...review.review, reviewerName: review.reviewerName }))),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", requireAuth, requireRole("editor", "publisher", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    if (!VALID_STATUSES.has(String(status))) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    const current = await db.select().from(submissionsTable).where(eq(submissionsTable.id, id)).limit(1);
    if (!current[0]) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (status === "published" && current[0].status !== "accepted") {
      res.status(400).json({ error: "Only accepted submissions can be published" });
      return;
    }
    await db.update(submissionsTable)
      .set({ status, editorNotes: notes ?? null, updatedAt: new Date() })
      .where(eq(submissionsTable.id, id));
    const row = await getSubmissionWithDetails(id);
    await logAction(req, "submission_status_changed", { entityType: "submission", entityId: id, detail: `Status → ${status}${notes ? `: ${notes}` : ""}` });
    res.json(formatSub(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/assign", requireAuth, requireRole("editor", "publisher", "admin"), async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const body = req.body ?? {};
    const expertId = body.expertId ?? body.reviewerId;
    if (!expertId) {
      res.status(400).json({ error: "expertId required" });
      return;
    }
    const current = await db.select().from(submissionsTable).where(eq(submissionsTable.id, submissionId)).limit(1);
    if (!current[0]) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    if (FINAL_STATUSES.has(current[0].status)) {
      res.status(400).json({ error: "Cannot assign an expert to a finalized submission" });
      return;
    }
    const numericReviewerId = Number(expertId);
    if (!Number.isInteger(numericReviewerId)) {
      res.status(400).json({ error: "Invalid expertId" });
      return;
    }
    const reviewer = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, numericReviewerId), eq(usersTable.role, "reviewer"), eq(usersTable.expertIsActive, true)))
      .limit(1);
    if (!reviewer[0]) {
      res.status(400).json({ error: "Active expert not found" });
      return;
    }
    const existing = await db.select().from(reviewsTable)
      .where(and(eq(reviewsTable.submissionId, submissionId), eq(reviewsTable.reviewerId, numericReviewerId)))
      .limit(1);
    if (existing[0]) {
      if (current[0].status === "submitted") {
        await db.update(submissionsTable)
          .set({ status: "under_review", updatedAt: new Date() })
          .where(eq(submissionsTable.id, submissionId));
      }
      res.json(existing[0]);
      return;
    }
    const inserted = await db.insert(reviewsTable).values({
      submissionId,
      reviewerId: numericReviewerId,
      status: "pending",
    }).returning();
    await db.update(submissionsTable).set({ status: "under_review", updatedAt: new Date() }).where(eq(submissionsTable.id, submissionId));
    await logAction(req, "expert_assigned", {
      entityType: "submission",
      entityId: submissionId,
      detail: `Expert assigned: ${reviewer[0].fullName} <${reviewer[0].email}>`,
    });
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const submissionId = parseInt(req.params.id);
    const { docType } = req.body;
    if (!docType) {
      safeUnlink(req.file.path);
      res.status(400).json({ error: "docType required" });
      return;
    }
    if (!VALID_DOC_TYPES.has(String(docType))) {
      safeUnlink(req.file.path);
      res.status(400).json({ error: "Invalid docType" });
      return;
    }
    const access = await ensureFileMutationAccess(req as any, submissionId);
    if ("error" in access) {
      safeUnlink(req.file.path);
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }
    const existing = await db.select().from(documentsTable)
      .where(and(eq(documentsTable.submissionId, submissionId), eq(documentsTable.docType, docType)))
      .limit(1);
    if (existing[0]) {
      safeUnlink(existing[0].filePath);
      await db.update(documentsTable)
        .set({ fileName: req.file.originalname, fileSize: req.file.size, filePath: req.file.path })
        .where(eq(documentsTable.id, existing[0].id));
      const updated = await db.select().from(documentsTable).where(eq(documentsTable.id, existing[0].id)).limit(1);
      res.json(updated[0]);
      return;
    }
    const inserted = await db.insert(documentsTable).values({
      submissionId,
      docType: docType as any,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      filePath: req.file.path,
    }).returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/documents/:documentId", requireAuth, async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const documentId = parseInt(req.params.documentId);

    const access = await ensureFileMutationAccess(req as any, submissionId);
    if ("error" in access) {
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }

    const document = await db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, documentId), eq(documentsTable.submissionId, submissionId)))
      .limit(1);

    if (!document[0]) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    safeUnlink(document[0].filePath);
    await db.delete(documentsTable).where(eq(documentsTable.id, documentId));

    res.json({ message: "Document deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);

    const access = await ensureSubmissionAccess(req as any, submissionId);
    if ("error" in access) {
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }
    const user = (req as any).user;
    const canDelete =
      user.role === "admin" ||
      (access.submission.authorId === user.id && ["submitted", "revision_required"].includes(access.submission.status));
    if (!canDelete) {
      res.status(403).json({ error: "Only admins or the owning author before final processing can delete submissions" });
      return;
    }

    const documents = await db.select().from(documentsTable).where(eq(documentsTable.submissionId, submissionId));
    for (const document of documents) {
      safeUnlink(document.filePath);
    }

    await db.delete(documentsTable).where(eq(documentsTable.submissionId, submissionId));
    await db.delete(reviewsTable).where(eq(reviewsTable.submissionId, submissionId));
    await db.delete(submissionsTable).where(eq(submissionsTable.id, submissionId));

    await logAction(req, "submission_deleted", {
      entityType: "submission",
      entityId: submissionId,
      detail: `Submission deleted: ${access.submission.title}`,
    });

    res.json({ message: "Submission deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
