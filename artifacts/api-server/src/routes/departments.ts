import { Router } from "express";
import { db } from "@workspace/db";
import { departmentsTable } from "@workspace/db/schema";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const depts = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
    res.json(depts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
