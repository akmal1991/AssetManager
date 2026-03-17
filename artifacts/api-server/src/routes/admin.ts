import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable, auditLogsTable, emailTemplatesTable, departmentsTable, reviewsTable } from "@workspace/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

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

/* ── CREATE USER ── */
router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { fullName, email, password, role, departmentId, scientificDegree, position } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "fullName, email va password majburiy" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash,
      role: role || "author",
      departmentId: departmentId || null,
      scientificDegree: scientificDegree || "none",
      position: position || "teacher",
    }).returning();

    await logAction(req, "user_registered", {
      entityType: "user", entityId: user.id,
      detail: `Admin created user: ${email} [${role || "author"}]`,
    });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE USER ── */
router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const authUser = (req as any).user;
    if (authUser.userId === id) {
      res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
      return;
    }
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }
    await logAction(req, "user_deleted", {
      entityType: "user", entityId: id,
      detail: `User deleted: ${deleted.email}`,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── RESET USER PASSWORD ── */
router.patch("/users/:id/password", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Parol kamida 6 belgidan iborat bo'lishi kerak" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [updated] = await db.update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, email: usersTable.email });
    if (!updated) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }
    await logAction(req, "password_reset", {
      entityType: "user", entityId: id,
      detail: `Password reset for: ${updated.email}`,
    });
    res.json({ ok: true });
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

/* ── EXCEL EXPORTS ── */

/* Export: all users */
router.get("/export/users", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const users = await db
      .select({
        ID: usersTable.id,
        "To'liq ismi": usersTable.fullName,
        Email: usersTable.email,
        Rol: usersTable.role,
        "Ilmiy daraja": usersTable.scientificDegree,
        Lavozim: usersTable.position,
        "Ro'yxatdan o'tgan sana": usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(usersTable.role, usersTable.fullName);

    const ws = XLSX.utils.json_to_sheet(
      users.map(u => ({
        ...u,
        Rol: { author: "Muallif", editor: "Muharrir", reviewer: "Taqrizchi", admin: "Administrator" }[u.Rol] || u.Rol,
        "Ro'yxatdan o'tgan sana": u["Ro'yxatdan o'tgan sana"]
          ? new Date(u["Ro'yxatdan o'tgan sana"]).toLocaleDateString("uz-UZ") : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Foydalanuvchilar");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAction(req, "export_users", { detail: `Users Excel export (${users.length} rows)` });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="foydalanuvchilar_${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Export: all submissions */
router.get("/export/submissions", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await db
      .select({
        ID: submissionsTable.id,
        "Sarlavha": submissionsTable.title,
        "Muallif": usersTable.fullName,
        "Muallif email": usersTable.email,
        "Tur": submissionsTable.literatureType,
        "Holat": submissionsTable.status,
        "Muharrir izohi": submissionsTable.editorNotes,
        "Yuborilgan sana": submissionsTable.createdAt,
        "Yangilangan sana": submissionsTable.updatedAt,
      })
      .from(submissionsTable)
      .leftJoin(usersTable, eq(submissionsTable.authorId, usersTable.id))
      .orderBy(desc(submissionsTable.createdAt));

    const STATUS_UZ: Record<string, string> = {
      submitted: "Yuborilgan",
      under_review: "Taqrizda",
      revision_required: "Tuzatish kerak",
      accepted: "Qabul qilindi",
      rejected: "Rad etildi",
      published: "Nashr qilindi",
    };
    const TYPE_UZ: Record<string, string> = {
      textbook: "Darslik",
      monograph: "Monografiya",
      manual: "O'quv qo'llanma",
      tutorial: "Uslubiy ko'rsatma",
      lecture_notes: "Ma'ruza matni",
      workbook: "Amaliy qo'llanma",
    };

    const ws = XLSX.utils.json_to_sheet(
      rows.map(r => ({
        ...r,
        "Tur": TYPE_UZ[r["Tur"] || ""] || r["Tur"],
        "Holat": STATUS_UZ[r["Holat"] || ""] || r["Holat"],
        "Yuborilgan sana": r["Yuborilgan sana"] ? new Date(r["Yuborilgan sana"]).toLocaleDateString("uz-UZ") : "",
        "Yangilangan sana": r["Yangilangan sana"] ? new Date(r["Yangilangan sana"]).toLocaleDateString("uz-UZ") : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arizalar");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAction(req, "export_submissions", { detail: `Submissions Excel export (${rows.length} rows)` });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="arizalar_${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Export: all reviews */
router.get("/export/reviews", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const reviewerAlias = db.$with("reviewer_alias").as(
      db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email }).from(usersTable)
    );
    const authorAlias = db.$with("author_alias").as(
      db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable)
    );

    const rows = await db
      .select({
        "Taqriz ID": reviewsTable.id,
        "Ariza sarlavhasi": submissionsTable.title,
        "Ariza turi": submissionsTable.literatureType,
        "Muallif": usersTable.fullName,
        "Taqrizchi ID": reviewsTable.reviewerId,
        "Holat": reviewsTable.status,
        "Umumiy baho": reviewsTable.overallScore,
        "Ilmiy qiymat": reviewsTable.scientificValue,
        "Amaliy qiymat": reviewsTable.practicalValue,
        "Originalligi": reviewsTable.originality,
        "Adabiyotlar": reviewsTable.literatureReview,
        "Yozim sifati": reviewsTable.writingQuality,
        "Xulosa": reviewsTable.conclusion,
        "Izoh": reviewsTable.notes,
        "Yakunlangan sana": reviewsTable.completedAt,
        "Tayinlangan sana": reviewsTable.createdAt,
      })
      .from(reviewsTable)
      .leftJoin(submissionsTable, eq(reviewsTable.submissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(submissionsTable.authorId, usersTable.id))
      .orderBy(desc(reviewsTable.createdAt));

    const ws = XLSX.utils.json_to_sheet(
      rows.map(r => ({
        ...r,
        "Ariza turi": { textbook: "Darslik", monograph: "Monografiya", manual: "O'quv qo'llanma" }[r["Ariza turi"] || ""] || r["Ariza turi"],
        "Holat": { pending: "Kutilmoqda", in_progress: "Jarayonda", completed: "Tugatildi" }[r["Holat"] || ""] || r["Holat"],
        "Yakunlangan sana": r["Yakunlangan sana"] ? new Date(r["Yakunlangan sana"]).toLocaleDateString("uz-UZ") : "",
        "Tayinlangan sana": r["Tayinlangan sana"] ? new Date(r["Tayinlangan sana"]).toLocaleDateString("uz-UZ") : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Taqrizlar");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAction(req, "export_reviews", { detail: `Reviews Excel export (${rows.length} rows)` });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="taqrizlar_${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Export: statistics summary */
router.get("/export/stats", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const subStats = await db
      .select({ status: submissionsTable.status, count: sql<number>`count(*)` })
      .from(submissionsTable)
      .groupBy(submissionsTable.status);
    const userStats = await db
      .select({ role: usersTable.role, count: sql<number>`count(*)` })
      .from(usersTable)
      .groupBy(usersTable.role);

    const STATUS_UZ: Record<string, string> = {
      submitted: "Yuborilgan", under_review: "Taqrizda", revision_required: "Tuzatish kerak",
      accepted: "Qabul qilindi", rejected: "Rad etildi", published: "Nashr qilindi",
    };
    const ROLE_UZ: Record<string, string> = {
      author: "Mualliflar", editor: "Muharrirlar", reviewer: "Taqrizchilar", admin: "Adminlar",
    };

    const wsStatus = XLSX.utils.json_to_sheet(
      subStats.map(r => ({ "Holat": STATUS_UZ[r.status] || r.status, "Soni": Number(r.count) }))
    );
    const wsUsers = XLSX.utils.json_to_sheet(
      userStats.map(r => ({ "Rol": ROLE_UZ[r.role] || r.role, "Soni": Number(r.count) }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsStatus, "Arizalar holati");
    XLSX.utils.book_append_sheet(wb, wsUsers, "Foydalanuvchilar roli");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAction(req, "export_stats", { detail: "Statistics Excel export" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="statistika_${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
