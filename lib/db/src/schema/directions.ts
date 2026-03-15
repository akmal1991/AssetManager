import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const scientificDirectionsTable = pgTable("scientific_directions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ScientificDirection = typeof scientificDirectionsTable.$inferSelect;
