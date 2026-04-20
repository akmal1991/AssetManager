import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, submissionsTable, usersTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

function classifyVerdict(verdict?: string | null) {
  if (!verdict) return null;
  return verdict === "accept" || verdict === "minor_revision" ? "positive" : "negative";
}

function verdictFromTemplateRecommendation(recommendation?: string | null) {
  if (recommendation === "recommended") return "accept";
  if (recommendation === "revise") return "major_revision";
  if (recommendation === "reject") return "reject";
  return null;
}

const VALID_VERDICTS = new Set(["accept", "minor_revision", "major_revision", "reject"]);

function scoreOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 10) return null;
  return score;
}

function scoreOrDefault(value: unknown, fallback: number) {
  const score = scoreOrNull(value);
  return score ?? fallback;
}

function ensureEditableExpertReview(req: any, review: typeof reviewsTable.$inferSelect | undefined) {
  if (!review) {
    return { error: { status: 404, message: "Expert conclusion not found" } };
  }
  if (review.reviewerId !== req.user.id) {
    return { error: { status: 403, message: "Only the assigned Expert can edit this conclusion" } };
  }
  if (review.status === "submitted") {
    return { error: { status: 400, message: "Submitted expert conclusions cannot be changed" } };
  }
  return { review };
}

function mapReviewRow(row: any) {
  return {
    ...row.review,
    submissionTitle: row.submissionTitle,
    expertId: row.review.reviewerId,
    expertName: row.reviewerName,
    reviewerName: row.reviewerName,
    submission: row.submissionId == null ? null : {
      id: row.submissionId,
      title: row.submissionTitle,
      literatureType: row.submissionLiteratureType,
      scientificDirection: row.submissionScientificDirection,
      authorName: row.authorName,
      status: row.submissionStatus,
    },
  };
}

router.get("/", requireAuth, requireRole("reviewer", "publisher", "admin", "editor"), async (req, res) => {
  try {
    const user = (req as any).user;
    const query = db
      .select({
        review: reviewsTable,
        submissionId: submissionsTable.id,
        submissionTitle: submissionsTable.title,
        submissionLiteratureType: submissionsTable.literatureType,
        submissionScientificDirection: submissionsTable.scientificDirection,
        submissionStatus: submissionsTable.status,
        authorName: usersTable.fullName,
        reviewerName: usersTable.fullName,
      })
      .from(reviewsTable)
      .leftJoin(submissionsTable, eq(reviewsTable.submissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(reviewsTable.reviewerId, usersTable.id));

    const rows = user.role === "reviewer"
      ? await query.where(eq(reviewsTable.reviewerId, user.id))
      : await query;

    const submissionIds = rows.map((row) => row.review.submissionId);
    const submissions = submissionIds.length > 0
      ? await db.select({ id: submissionsTable.id, authorId: submissionsTable.authorId }).from(submissionsTable).where(inArray(submissionsTable.id, submissionIds))
      : [];
    const authorUserIds = submissions.map((submission) => submission.authorId);
    const authors = authorUserIds.length > 0
      ? await db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(inArray(usersTable.id, authorUserIds))
      : [];
    const authorMap = new Map(submissions.map((submission) => {
      const author = authors.find((userRow) => userRow.id === submission.authorId);
      return [submission.id, author?.fullName ?? null] as const;
    }));

    res.json(rows.map((row) => mapReviewRow({ ...row, authorName: authorMap.get(row.review.submissionId) ?? null })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = (req as any).user;
    const rows = await db
      .select({
        review: reviewsTable,
        submissionId: submissionsTable.id,
        submissionTitle: submissionsTable.title,
        submissionLiteratureType: submissionsTable.literatureType,
        submissionScientificDirection: submissionsTable.scientificDirection,
        submissionStatus: submissionsTable.status,
        submissionAuthorId: submissionsTable.authorId,
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
    const canView =
      user.role === "admin" ||
      user.role === "editor" ||
      user.role === "publisher" ||
      r.review.reviewerId === user.id ||
      r.submissionAuthorId === user.id;
    if (!canView) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const submission = await db.select({ authorId: submissionsTable.authorId }).from(submissionsTable).where(eq(submissionsTable.id, r.review.submissionId)).limit(1);
    const author = submission[0]
      ? await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, submission[0].authorId)).limit(1)
      : [];
    res.json(mapReviewRow({ ...r, authorName: author[0]?.fullName ?? null }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/draft", requireAuth, requireRole("reviewer"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const review = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    const access = ensureEditableExpertReview(req as any, review[0]);
    if ("error" in access) {
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }

    const {
      scientificSignificance,
      methodology,
      structureClarity,
      originality,
      conclusionSummary,
      conclusionForm,
      strengths,
      weaknesses,
      recommendation,
      commentsForAuthor,
      commentsForEditor,
      verdict,
    } = req.body ?? {};

    const normalizedScores = {
      ...(scientificSignificance != null ? { scientificSignificance: scoreOrNull(scientificSignificance) } : {}),
      ...(methodology != null ? { methodology: scoreOrNull(methodology) } : {}),
      ...(structureClarity != null ? { structureClarity: scoreOrNull(structureClarity) } : {}),
      ...(originality != null ? { originality: scoreOrNull(originality) } : {}),
    };
    if (Object.values(normalizedScores).some((score) => score == null)) {
      res.status(400).json({ error: "Scores must be integers from 1 to 10" });
      return;
    }
    if (verdict && !VALID_VERDICTS.has(verdict)) {
      res.status(400).json({ error: "Invalid verdict" });
      return;
    }

    await db.update(reviewsTable).set({
      ...normalizedScores,
      conclusionSummary: conclusionSummary == null ? access.review.conclusionSummary : String(conclusionSummary).trim() || null,
      conclusionForm: conclusionForm && typeof conclusionForm === "object" ? conclusionForm : access.review.conclusionForm,
      strengths: strengths == null ? access.review.strengths : String(strengths).trim() || null,
      weaknesses: weaknesses == null ? access.review.weaknesses : String(weaknesses).trim() || null,
      recommendation: recommendation == null ? access.review.recommendation : String(recommendation).trim() || null,
      commentsForAuthor: commentsForAuthor == null ? access.review.commentsForAuthor : String(commentsForAuthor).trim() || null,
      commentsForEditor: commentsForEditor == null ? access.review.commentsForEditor : String(commentsForEditor).trim() || null,
      verdict: verdict ?? access.review.verdict,
      classification: verdict ? classifyVerdict(verdict) : access.review.classification,
    }).where(eq(reviewsTable.id, id));

    const updated = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, requireRole("reviewer"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const review = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
    const access = ensureEditableExpertReview(req as any, review[0]);
    if ("error" in access) {
      res.status(access.error.status).json({ error: access.error.message });
      return;
    }
    const {
      scientificSignificance,
      methodology,
      structureClarity,
      originality,
      conclusionSummary,
      conclusionForm,
      strengths,
      weaknesses,
      recommendation,
      commentsForAuthor,
      commentsForEditor,
      verdict,
    } = req.body ?? {};
    const templateRecommendation = conclusionForm?.finalRecommendation as string | undefined;
    const finalVerdict = verdict || verdictFromTemplateRecommendation(templateRecommendation);
    const summary = conclusionSummary || conclusionForm?.finalNote || conclusionForm?.purposeRelevance;
    const officialRecommendation = recommendation || templateRecommendation;

    if (!finalVerdict || !summary || !officialRecommendation) {
      res.status(400).json({ error: "final conclusion, conclusion summary and recommendation are required" });
      return;
    }
    if (!VALID_VERDICTS.has(finalVerdict)) {
      res.status(400).json({ error: "Invalid verdict" });
      return;
    }
    const normalizedScores = {
      scientificSignificance: scoreOrDefault(scientificSignificance, 8),
      methodology: scoreOrDefault(methodology, 8),
      structureClarity: scoreOrDefault(structureClarity, 8),
      originality: scoreOrDefault(originality, 8),
    };
    const classification = classifyVerdict(finalVerdict);
    await db.update(reviewsTable).set({
      scientificSignificance: normalizedScores.scientificSignificance,
      methodology: normalizedScores.methodology,
      structureClarity: normalizedScores.structureClarity,
      originality: normalizedScores.originality,
      conclusionSummary: String(summary).trim(),
      conclusionForm: conclusionForm && typeof conclusionForm === "object" ? conclusionForm : {},
      strengths: strengths == null ? null : String(strengths).trim() || null,
      weaknesses: weaknesses == null ? null : String(weaknesses).trim() || null,
      recommendation: String(officialRecommendation).trim(),
      commentsForAuthor: commentsForAuthor ?? null,
      commentsForEditor: commentsForEditor ?? null,
      verdict: finalVerdict,
      classification,
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
