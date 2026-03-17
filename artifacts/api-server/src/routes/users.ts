import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, departmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { logAction } from "../lib/audit.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "editor"), async (req, res) => {
  try {
    const rows = await db
      .select({ user: usersTable, deptName: departmentsTable.name })
      .from(usersTable)
      .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
      .orderBy(usersTable.createdAt);

    const roleFilter = req.query.role as string | undefined;
    const result = rows
      .filter(r => !roleFilter || r.user.role === roleFilter)
      .map(r => ({
        id: r.user.id,
        fullName: r.user.fullName,
        email: r.user.email,
        phone: r.user.phone,
        role: r.user.role,
        departmentId: r.user.departmentId,
        departmentName: r.deptName,
        scientificDegree: r.user.scientificDegree,
        position: r.user.position,
        createdAt: r.user.createdAt,
      }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ error: "role required" });
      return;
    }
    // Get old role for audit
    const before = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    const oldRole = before[0]?.role ?? "?";

    await db.update(usersTable).set({ role }).where(eq(usersTable.id, id));

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
    res.json({
      id: r.user.id,
      fullName: r.user.fullName,
      email: r.user.email,
      role: r.user.role,
      departmentId: r.user.departmentId,
      departmentName: r.deptName,
      scientificDegree: r.user.scientificDegree,
      position: r.user.position,
      createdAt: r.user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
