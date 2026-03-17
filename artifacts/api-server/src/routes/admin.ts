import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable, auditLogsTable, emailTemplatesTable } from "@workspace/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";

const router = Router();

/* ── STATS ── */
router.get("/stats", requireAuth, requireRole("admin", "editor"), async (_req, res) => {
  try {
    const subStats = await db
      .select({ status: submissionsTable.status, count: sql<number>`count(*)` })
      .from(submissionsTable)
      .groupBy(submissionsTable.status);

    const userStats = await db
      .select({ role: usersTable.role, count: sql<number>`count(*)` })
      .from(usersTable)
      .groupBy(usersTable.role);

    const bySub = (key: string) => Number(subStats.find((r: any) => r.status === key)?.count ?? 0);
    const byRole = (key: string) => Number(userStats.find((r: any) => r.role === key)?.count ?? 0);

    res.json({
      totalSubmissions: subStats.reduce((s, r) => s + Number(r.count), 0),
      totalUsers: userStats.reduce((s, r) => s + Number(r.count), 0),
      totalAuthors: byRole("author"),
      totalEditors: byRole("editor"),
      totalReviewers: byRole("reviewer"),
      totalAdmins: byRole("admin"),
      published: bySub("published"),
      submissionsByStatus: {
        submitted: bySub("submitted"),
        under_review: bySub("under_review"),
        revision_required: bySub("revision_required"),
        accepted: bySub("accepted"),
        rejected: bySub("rejected"),
        published: bySub("published"),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── AUDIT LOGS ── */
router.get("/audit-logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit ?? 50));
    const offset = Number(req.query.offset ?? 0);
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable);
    res.json({ items: logs, total: Number(total[0]?.count ?? 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── EMAIL TEMPLATES ── */
router.get("/email-templates", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.id);
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/email-templates/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { subject, body, isActive } = req.body;
    const updated = await db
      .update(emailTemplatesTable)
      .set({
        ...(subject != null ? { subject } : {}),
        ...(body != null ? { body } : {}),
        ...(isActive != null ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(emailTemplatesTable.id, id))
      .returning();
    if (!updated[0]) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    await logAction(req, "email_template_updated", {
      entityType: "email_template", entityId: id, detail: `Template "${updated[0].key}" updated`,
    });
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
