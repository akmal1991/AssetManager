import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable, departmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, phone, password, departmentId, scientificDegree, position } = req.body;
    if (!fullName || !email || !password) {
      res.status(400).json({ error: "fullName, email, password required" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.insert(usersTable).values({
      fullName,
      email,
      phone: phone ?? null,
      passwordHash,
      role: "author",
      departmentId: departmentId ? Number(departmentId) : null,
      scientificDegree: scientificDegree ?? "none",
      position: position ?? "teacher",
    }).returning();
    const user = inserted[0];
    const token = signToken(user.id);
    const dept = departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId!)).limit(1) : [];
    res.status(201).json({
      user: formatUser(user, dept[0]?.name),
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken(user.id);
    const dept = user.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId)).limit(1) : [];
    res.json({ user: formatUser(user, dept[0]?.name), token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const dept = user.departmentId ? await db.select().from(departmentsTable).where(eq(departmentsTable.id, user.departmentId)).limit(1) : [];
  res.json(formatUser(user, dept[0]?.name));
});

function formatUser(user: any, deptName?: string) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: deptName ?? null,
    scientificDegree: user.scientificDegree,
    position: user.position,
    createdAt: user.createdAt,
  };
}

export default router;
