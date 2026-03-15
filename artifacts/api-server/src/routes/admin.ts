import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable } from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/stats", requireAuth, requireRole("admin", "editor"), async (_req, res) => {
  try {
    const subStats = await db
      .select({
        status: submissionsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(submissionsTable)
      .groupBy(submissionsTable.status);

    const userStats = await db
      .select({
        role: usersTable.role,
        count: sql<number>`count(*)`,
      })
      .from(usersTable)
      .groupBy(usersTable.role);

    const getCount = (arr: { status?: string; count: number }[], key: string) =>
      Number(arr.find((r: any) => r.status === key)?.count ?? 0);
    const getUserCount = (arr: { role?: string; count: number }[], key: string) =>
      Number(arr.find((r: any) => r.role === key)?.count ?? 0);

    const totalSubs = subStats.reduce((s, r) => s + Number(r.count), 0);
    const totalUsers = userStats.reduce((s, r) => s + Number(r.count), 0);

    res.json({
      totalSubmissions: totalSubs,
      pendingReview: getCount(subStats as any, "submitted"),
      underReview: getCount(subStats as any, "under_review"),
      accepted: getCount(subStats as any, "accepted"),
      rejected: getCount(subStats as any, "rejected"),
      published: getCount(subStats as any, "published"),
      totalUsers,
      totalReviewers: getUserCount(userStats as any, "reviewer"),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
