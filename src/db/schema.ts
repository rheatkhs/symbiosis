import { pgTable, uuid, varchar, bigint, timestamp, text, integer, index } from "drizzle-orm/pg-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ── Accounts Table ─────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  remoteName: varchar("remote_name", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  storageUsed: bigint("storage_used", { mode: "number" }).notNull().default(0),
  storageLimit: bigint("storage_limit", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Transfers Table ────────────────────────────────────────────────────────

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: varchar("file_path", { length: 1000 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
}, (table) => {
  return {
    accountIdIdx: index("transfers_account_id_idx").on(table.accountId),
    statusIdx: index("transfers_status_idx").on(table.status),
    startedAtIdx: index("transfers_started_at_idx").on(table.startedAt),
  };
});

// ── System Config Table ────────────────────────────────────────────────────

export const systemConfig = pgTable("system_config", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Type Inference Exports ─────────────────────────────────────────────────

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Transfer = InferSelectModel<typeof transfers>;
export type NewTransfer = InferInsertModel<typeof transfers>;

export type SystemConfig = InferSelectModel<typeof systemConfig>;
export type NewSystemConfig = InferInsertModel<typeof systemConfig>;
