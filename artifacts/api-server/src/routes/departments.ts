import { Router } from "express";
import { db } from "@workspace/db";
import { departmentsTable, submissionsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";
import { parseRouteId } from "../lib/params.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const depts = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
    res.json(depts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "name required" });
      return;
    }
    const inserted = await db.insert(departmentsTable).values({ name: name.trim() }).returning();
    res.status(201).json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    const existing = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const updatedUsers = await tx
        .update(usersTable)
        .set({ departmentId: null })
        .where(eq(usersTable.departmentId, id))
        .returning({ id: usersTable.id });
      const updatedSubmissions = await tx
        .update(submissionsTable)
        .set({ departmentId: null, updatedAt: new Date() })
        .where(eq(submissionsTable.departmentId, id))
        .returning({ id: submissionsTable.id });
      await tx.delete(departmentsTable).where(eq(departmentsTable.id, id));

      return {
        usersUpdated: updatedUsers.length,
        submissionsUpdated: updatedSubmissions.length,
      };
    });

    res.json({ message: "Deleted", ...result });
  } catch (err: any) {
    console.error("Failed to delete department", err);
    res.status(500).json({ error: "Department could not be deleted" });
  }
});

export default router;
