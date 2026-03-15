import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, submissionsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("reviewer", "admin", "editor"), async (req, res) => {
  try {
    const user = (req as any).user;
    const query = db
      .select({
        review: reviewsTable,
        submissionTitle: submissionsTable.title,
        reviewerName: usersTable.fullName,
      })
      .from(reviewsTable)
      .leftJoin(submissionsTable, eq(reviewsTable.submissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id));

    const rows = user.role === "reviewer"
      ? await query.where(eq(reviewsTable.reviewerId, user.id))
      : await query;

    res.json(rows.map(r => ({
      ...r.review,
      submissionTitle: r.submissionTitle,
      reviewerName: r.reviewerName,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        review: reviewsTable,
        submissionTitle: submissionsTable.title,
        reviewerName: usersTable.fullName,
      })
      .from(reviewsTable)
      .leftJoin(submissionsTable, eq(reviewsTable.submissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id))
      .where(eq(reviewsTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const r = rows[0];
    res.json({ ...r.review, submissionTitle: r.submissionTitle, reviewerName: r.reviewerName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, requireRole("reviewer"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    const review = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    if (!review[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (review[0].reviewerId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { scientificSignificance, methodology, structureClarity, originality, commentsForAuthor, commentsForEditor, verdict } = req.body;
    await db.update(reviewsTable).set({
      scientificSignificance: Number(scientificSignificance),
      methodology: Number(methodology),
      structureClarity: Number(structureClarity),
      originality: Number(originality),
      commentsForAuthor: commentsForAuthor ?? null,
      commentsForEditor: commentsForEditor ?? null,
      verdict,
      status: "submitted",
      submittedAt: new Date(),
    }).where(eq(reviewsTable.id, id));
    const updated = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
