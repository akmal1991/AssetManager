import { Router } from "express";
import { db } from "@workspace/db";
import { scientificDirectionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const dirs = await db.select().from(scientificDirectionsTable).orderBy(scientificDirectionsTable.name);
    res.json(dirs);
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
    const inserted = await db.insert(scientificDirectionsTable).values({ name: name.trim() }).returning();
    res.status(201).json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(scientificDirectionsTable).where(eq(scientificDirectionsTable.id, id));
    res.json({ message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
