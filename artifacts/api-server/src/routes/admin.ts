import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, usersTable, auditLogsTable, emailTemplatesTable, departmentsTable, reviewsTable, documentsTable } from "@workspace/db/schema";
import { sql, eq, desc, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";
import { parseRouteId } from "../lib/params.js";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import fs from "fs";

const router = Router();

const ALLOWED_ROLES = ["author", "editor", "reviewer", "publisher", "admin"] as const;
type UserRole = typeof ALLOWED_ROLES[number];

function isUserRole(role: string): role is UserRole {
  return (ALLOWED_ROLES as readonly string[]).includes(role);
}

function normalizeRole(role: unknown): UserRole | "" {
  const normalized = role === "expert" ? "reviewer" : String(role ?? "author");
  return isUserRole(normalized) ? normalized : "";
}

function roleDisplayName(role: string) {
  return ({ author: "Author", editor: "Expert", reviewer: "Expert", publisher: "Publisher", admin: "Administrator" } as Record<string, string>)[role] ?? role;
}

function safeUnlink(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete uploaded file while deleting user: ${filePath}`, error);
  }
}

/* ── STATS ── */
router.get("/stats", requireAuth, requireRole("admin", "editor", "publisher"), async (_req, res) => {
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
      totalExperts: byRole("editor") + byRole("reviewer"),
      totalPublishers: byRole("publisher"),
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
    const {
      fullName,
      email,
      password,
      role: requestedRole = "author",
      departmentId,
      scientificDegree,
      position,
      expertOrganization,
      expertBio,
      expertSpecialties,
      expertIsActive,
    } = req.body ?? {};
    const role = normalizeRole(requestedRole);
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "fullName, email va password majburiy" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
      return;
    }
    if (!role) {
      res.status(400).json({ error: "Valid role required" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const isExpertRole = role === "reviewer" || role === "editor";
    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash,
      role,
      departmentId: departmentId || null,
      scientificDegree: scientificDegree || "none",
      position: position || "teacher",
      expertOrganization: isExpertRole && expertOrganization ? String(expertOrganization).trim() : null,
      expertBio: isExpertRole && expertBio ? String(expertBio).trim() : null,
      expertSpecialties: isExpertRole && Array.isArray(expertSpecialties)
        ? expertSpecialties.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
        : [],
      expertIsActive: isExpertRole ? expertIsActive !== false : false,
    }).returning();

    await logAction(req, "user_registered", {
      entityType: "user", entityId: user.id,
      detail: `Admin created user: ${email} [${roleDisplayName(role)}]`,
    });
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── DELETE USER ── */
router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    const authUser = (req as any).user;
    if (authUser.id === id) {
      res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
      return;
    }

    const target = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!target[0]) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }
    if (target[0].role === "admin") {
      const adminCount = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "admin"));
      if (Number(adminCount[0]?.count ?? 0) <= 1) {
        res.status(400).json({ error: "Oxirgi administratorni o'chirib bo'lmaydi" });
        return;
      }
    }

    const authoredSubmissions = await db
      .select({ id: submissionsTable.id })
      .from(submissionsTable)
      .where(eq(submissionsTable.authorId, id));
    const authoredSubmissionIds = authoredSubmissions.map((submission) => submission.id);
    const ownedDocuments = authoredSubmissionIds.length > 0
      ? await db.select().from(documentsTable).where(inArray(documentsTable.submissionId, authoredSubmissionIds))
      : [];

    const deletedCounts = await db.transaction(async (tx) => {
      const deletedDocuments = authoredSubmissionIds.length > 0
        ? await tx.delete(documentsTable).where(inArray(documentsTable.submissionId, authoredSubmissionIds)).returning({ id: documentsTable.id })
        : [];
      const deletedSubmissionReviews = authoredSubmissionIds.length > 0
        ? await tx.delete(reviewsTable).where(inArray(reviewsTable.submissionId, authoredSubmissionIds)).returning({ id: reviewsTable.id })
        : [];
      const deletedExpertReviews = await tx.delete(reviewsTable).where(eq(reviewsTable.reviewerId, id)).returning({ id: reviewsTable.id });
      const deletedSubmissions = authoredSubmissionIds.length > 0
        ? await tx.delete(submissionsTable).where(inArray(submissionsTable.id, authoredSubmissionIds)).returning({ id: submissionsTable.id })
        : [];
      const deletedUsers = await tx.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });

      return {
        documents: deletedDocuments.length,
        reviews: deletedSubmissionReviews.length + deletedExpertReviews.length,
        submissions: deletedSubmissions.length,
        users: deletedUsers.length,
      };
    });

    for (const document of ownedDocuments) {
      safeUnlink(document.filePath);
    }

    await logAction(req, "user_deleted", {
      entityType: "user", entityId: id,
      detail: `User deleted: ${target[0].email} (${deletedCounts.submissions} submissions, ${deletedCounts.reviews} reviews, ${deletedCounts.documents} documents)`,
    });
    res.json({ ok: true, deleted: deletedCounts });
  } catch (err: any) {
    console.error("Failed to delete user", err);
    res.status(500).json({ error: "Foydalanuvchini o'chirib bo'lmadi. Bog'liq yozuvlarni tekshiring." });
  }
});

/* ── RESET USER PASSWORD ── */
router.patch("/users/:id/password", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
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
    const id = parseRouteId(req.params.id);
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
        Rol: { author: "Muallif", editor: "Ekspert", reviewer: "Ekspert", publisher: "Noshir", admin: "Administrator" }[u.Rol] || u.Rol,
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
router.get("/export/submissions", requireAuth, requireRole("admin", "editor", "publisher"), async (req, res) => {
  try {
    const rows = await db
      .select({
        ID: submissionsTable.id,
        "Sarlavha": submissionsTable.title,
        "Muallif": usersTable.fullName,
        "Muallif email": usersTable.email,
        "Tur": submissionsTable.literatureType,
        "Holat": submissionsTable.status,
        "Ekspert izohi": submissionsTable.editorNotes,
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
      darslik: "Darslik",
      oquv_qollanma: "O'quv qo'llanma",
      monografiya: "Monografiya",
      oquv_uslubiy_qollanma: "O'quv-uslubiy qo'llanma",
      uslubiy_korsatma: "Uslubiy ko'rsatma",
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
router.get("/export/reviews", requireAuth, requireRole("admin", "editor", "publisher"), async (req, res) => {
  try {
    const rows = await db
      .select({
        "Xulosa ID": reviewsTable.id,
        "Ariza sarlavhasi": submissionsTable.title,
        "Ariza turi": submissionsTable.literatureType,
        "Muallif": usersTable.fullName,
        "Ekspert ID": reviewsTable.reviewerId,
        "Holat": reviewsTable.status,
        "Ilmiy ahamiyat": reviewsTable.scientificSignificance,
        "Metodologiya": reviewsTable.methodology,
        "Tuzilish ravshanligi": reviewsTable.structureClarity,
        "Originalligi": reviewsTable.originality,
        "Xulosa": reviewsTable.conclusionSummary,
        "Tavsiyalar": reviewsTable.recommendation,
        "Verdikt": reviewsTable.verdict,
        "Turkum": reviewsTable.classification,
        "Muallifga izoh": reviewsTable.commentsForAuthor,
        "Ekspert jarayoniga izoh": reviewsTable.commentsForEditor,
        "Yakunlangan sana": reviewsTable.submittedAt,
        "Tayinlangan sana": reviewsTable.assignedAt,
      })
      .from(reviewsTable)
      .leftJoin(submissionsTable, eq(reviewsTable.submissionId, submissionsTable.id))
      .leftJoin(usersTable, eq(submissionsTable.authorId, usersTable.id))
      .orderBy(desc(reviewsTable.assignedAt));

    const REVIEW_TYPE_UZ: Record<string, string> = {
      darslik: "Darslik",
      oquv_qollanma: "O'quv qo'llanma",
      monografiya: "Monografiya",
      oquv_uslubiy_qollanma: "O'quv-uslubiy qo'llanma",
      uslubiy_korsatma: "Uslubiy ko'rsatma",
    };
    const REVIEW_STATUS_UZ: Record<string, string> = { pending: "Kutilmoqda", submitted: "Yuborilgan" };
    const VERDICT_UZ: Record<string, string> = {
      accept: "Qabul qilish",
      minor_revision: "Kichik tuzatish",
      major_revision: "Qayta ishlash",
      reject: "Rad etish",
    };
    const CLASSIFICATION_UZ: Record<string, string> = { positive: "Ijobiy", negative: "Salbiy" };

    const ws = XLSX.utils.json_to_sheet(
      rows.map(r => ({
        ...r,
        "Ariza turi": REVIEW_TYPE_UZ[r["Ariza turi"] || ""] || r["Ariza turi"],
        "Holat": REVIEW_STATUS_UZ[r["Holat"] || ""] || r["Holat"],
        "Verdikt": VERDICT_UZ[r["Verdikt"] || ""] || r["Verdikt"],
        "Turkum": CLASSIFICATION_UZ[r["Turkum"] || ""] || r["Turkum"],
        "Yakunlangan sana": r["Yakunlangan sana"] ? new Date(r["Yakunlangan sana"]).toLocaleDateString("uz-UZ") : "",
        "Tayinlangan sana": r["Tayinlangan sana"] ? new Date(r["Tayinlangan sana"]).toLocaleDateString("uz-UZ") : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekspert xulosalari");
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
router.get("/export/stats", requireAuth, requireRole("admin", "editor", "publisher"), async (req, res) => {
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
      author: "Mualliflar", editor: "Ekspertlar", reviewer: "Ekspertlar", publisher: "Noshirlar", admin: "Adminlar",
    };

    const wsStatus = XLSX.utils.json_to_sheet(
      subStats.map(r => ({ "Holat": STATUS_UZ[r.status] || r.status, "Soni": Number(r.count) }))
    );
    const combinedUserStats = Object.values(
      userStats.reduce<Record<string, { Rol: string; Soni: number }>>((acc, row) => {
        const roleLabel = ROLE_UZ[row.role] || row.role;
        acc[roleLabel] = acc[roleLabel] ?? { Rol: roleLabel, Soni: 0 };
        acc[roleLabel].Soni += Number(row.count);
        return acc;
      }, {}),
    );
    const wsUsers = XLSX.utils.json_to_sheet(combinedUserStats);
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
