import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, departmentsTable } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";

const router = Router();

function normalizeRole(role: unknown) {
  return role === "expert" ? "reviewer" : String(role ?? "");
}

function roleDisplayName(role: string) {
  return ({ author: "Author", editor: "Expert", reviewer: "Expert", publisher: "Publisher", admin: "Administrator" } as Record<string, string>)[role] ?? role;
}

function mapUser(row: { user: typeof usersTable.$inferSelect; deptName: string | null }) {
  return {
    id: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    phone: row.user.phone,
    role: row.user.role,
    productRole: row.user.role === "reviewer" || row.user.role === "editor" ? "expert" : row.user.role,
    roleLabel: roleDisplayName(row.user.role),
    departmentId: row.user.departmentId,
    departmentName: row.deptName,
    scientificDegree: row.user.scientificDegree,
    position: row.user.position,
    expertOrganization: row.user.expertOrganization,
    expertBio: row.user.expertBio,
    expertSpecialties: row.user.expertSpecialties,
    expertIsActive: row.user.expertIsActive,
    createdAt: row.user.createdAt,
  };
}

router.get("/", requireAuth, requireRole("admin", "editor", "publisher"), async (req, res) => {
  try {
    const rows = await db
      .select({ user: usersTable, deptName: departmentsTable.name })
      .from(usersTable)
      .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
      .orderBy(usersTable.createdAt);

    const roleFilter = req.query.role as string | undefined;
    const result = rows.filter(r => !roleFilter || r.user.role === roleFilter).map(mapUser);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/experts", requireAuth, requireRole("admin", "editor", "publisher", "reviewer", "author"), async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const rows = await db
      .select({ user: usersTable, deptName: departmentsTable.name })
      .from(usersTable)
      .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
      .where(and(inArray(usersTable.role, ["reviewer", "editor"]), eq(usersTable.expertIsActive, true)))
      .orderBy(usersTable.fullName);

    res.json(rows.map(mapUser));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = normalizeRole(req.body?.role);
    const allowedRoles = ["author", "editor", "reviewer", "publisher", "admin"];
    if (!role || !allowedRoles.includes(role)) {
      res.status(400).json({ error: "Valid role required" });
      return;
    }
    // Get old role for audit
    const before = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    const oldRole = before[0]?.role ?? "?";

    await db.update(usersTable).set({
      role,
      ...(role === "reviewer"
        ? { expertIsActive: true }
        : role === "author" || role === "publisher" || role === "admin"
          ? { expertIsActive: false }
          : {}),
    }).where(eq(usersTable.id, id));

    const updated = await db
      .select({ user: usersTable, deptName: departmentsTable.name })
      .from(usersTable)
      .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!updated[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const r = updated[0];
    await logAction(req, "role_changed", {
      entityType: "user", entityId: id,
      detail: `${r.user.email}: ${oldRole} → ${role}`,
    });
    res.json(mapUser(r));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/expert-profile", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { expertOrganization, expertBio, expertSpecialties, expertIsActive } = req.body ?? {};

    const before = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!before[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (before[0].role !== "reviewer" && before[0].role !== "editor") {
      res.status(400).json({ error: "Only expert accounts can be configured in the experts list" });
      return;
    }

    await db.update(usersTable).set({
      expertOrganization: expertOrganization == null ? null : String(expertOrganization).trim() || null,
      expertBio: expertBio == null ? null : String(expertBio).trim() || null,
      expertSpecialties: Array.isArray(expertSpecialties)
        ? expertSpecialties.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
        : before[0].expertSpecialties,
      expertIsActive: expertIsActive == null ? before[0].expertIsActive : Boolean(expertIsActive),
    }).where(eq(usersTable.id, id));

    const updated = await db
      .select({ user: usersTable, deptName: departmentsTable.name })
      .from(usersTable)
      .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!updated[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await logAction(req, "expert_profile_updated", {
      entityType: "user",
      entityId: id,
      detail: `Expert profile updated for ${updated[0].user.email}`,
    });

    res.json(mapUser(updated[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
