import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { db } from "./index";
import {
  auditLogsTable,
  departmentsTable,
  emailTemplatesTable,
  scientificDirectionsTable,
  usersTable,
} from "./schema";
import {
  seedDepartments,
  seedEmailTemplates,
  seedScientificDirections,
} from "./seed-data";

let initialized = false;

export async function initializeDatabase() {
  if (initialized) {
    return;
  }

  const [{ value: departmentsCount }] = await db
    .select({ value: count() })
    .from(departmentsTable);
  if (departmentsCount === 0) {
    await db.insert(departmentsTable).values(
      seedDepartments.map((name) => ({ name })),
    );
  }

  const [{ value: directionsCount }] = await db
    .select({ value: count() })
    .from(scientificDirectionsTable);
  if (directionsCount === 0) {
    await db.insert(scientificDirectionsTable).values(
      seedScientificDirections.map((name) => ({ name })),
    );
  }

  const [{ value: templatesCount }] = await db
    .select({ value: count() })
    .from(emailTemplatesTable);
  if (templatesCount === 0) {
    await db.insert(emailTemplatesTable).values(
      seedEmailTemplates.map((template) => ({ ...template })),
    );
  }

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(usersTable);
  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash("Admin@Uni2026!", 10);
    await db.insert(usersTable).values({
      fullName: "System Administrator",
      email: "admin@uni.uz",
      passwordHash,
      role: "admin",
      scientificDegree: "none",
      position: "teacher",
    });

    await db.insert(auditLogsTable).values({
      action: "database_initialized",
      detail: "Database initialized with seed data",
    });
  }

  initialized = true;
}
