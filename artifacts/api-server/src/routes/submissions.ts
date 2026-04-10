import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { submissionsTable, documentsTable, reviewsTable, usersTable, departmentsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

  const canManage = user.role === "admin" || user.role === "editor" || current.authorId === user.id;
  if (!canManage) {
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
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(submissionsTable);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions) as any) as any;
    }
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count ?? 0);

    res.json({
      items: items.map(formatSub),
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
      reviews: reviews.map(r => ({ ...r.review, reviewerName: r.reviewerName })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/status", requireAuth, requireRole("editor", "admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
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

router.post("/:id/assign", requireAuth, requireRole("editor", "admin"), async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { reviewerId } = req.body;
    if (!reviewerId) {
      res.status(400).json({ error: "reviewerId required" });
      return;
    }
    const existing = await db.select().from(reviewsTable)
      .where(and(eq(reviewsTable.submissionId, submissionId), eq(reviewsTable.reviewerId, reviewerId)))
      .limit(1);
    if (existing[0]) {
      res.json(existing[0]);
      return;
    }
    const inserted = await db.insert(reviewsTable).values({
      submissionId,
      reviewerId: Number(reviewerId),
      status: "pending",
    }).returning();
    await db.update(submissionsTable).set({ status: "under_review", updatedAt: new Date() }).where(eq(submissionsTable.id, submissionId));
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
      res.status(400).json({ error: "docType required" });
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

    const access = await ensureSubmissionAccess(req as any, submissionId);
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
