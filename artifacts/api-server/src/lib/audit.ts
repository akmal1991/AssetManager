import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import type { Request } from "express";

export async function logAction(
  req: Request,
  action: string,
  opts?: {
    entityType?: string;
    entityId?: string | number;
    detail?: string;
  }
) {
  try {
    const user = (req as any).user;
    await db.insert(auditLogsTable).values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      action,
      entityType: opts?.entityType ?? null,
      entityId: opts?.entityId != null ? String(opts.entityId) : null,
      detail: opts?.detail ?? null,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null,
    });
  } catch {
    // audit log failures must never break the main flow
  }
}
