import { Hono } from "hono";
import { db } from "../db";
import { accounts, transfers } from "../db/schema";
import { rcloneService } from "../services/rcloneService";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

const router = new Hono();

// ── Helpers & Validators ───────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function isValidRemoteName(name: string): boolean {
  // Remote names in Rclone should be simple identifiers: alpha-numeric, underscores, hyphens.
  // No slashes, dots, colons, or path traversal.
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

// ── Stats Endpoint ──────────────────────────────────────────────────────────

router.get("/stats", async (c) => {
  try {
    const health = await rcloneService.checkHealth();

    // Aggregations using SQL snippets for compatibility
    const accountsCountResult = await db.select({ count: sql<number>`count(*)` }).from(accounts);
    const totalAccounts = accountsCountResult[0]?.count ?? 0;

    const transfersCountResult = await db
      .select({
        streaming: sql<number>`count(*) filter (where status = 'streaming')`,
        completed: sql<number>`count(*) filter (where status = 'completed')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
      })
      .from(transfers);

    const activeTransfers = transfersCountResult[0]?.streaming ?? 0;
    const completedTransfers = transfersCountResult[0]?.completed ?? 0;
    const failedTransfers = transfersCountResult[0]?.failed ?? 0;

    const storageSumResult = await db.select({ total: sql<number>`coalesce(sum(storage_used), 0)` }).from(accounts);
    const totalStorageUsed = Number(storageSumResult[0]?.total ?? 0);

    return c.json({
      totalAccounts,
      activeTransfers,
      completedTransfers,
      failedTransfers,
      totalStorageUsed,
      rcloneHealthy: health.healthy,
    });
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err);
    return c.json({ error: "Failed to load dashboard statistics", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ── Accounts Endpoints ─────────────────────────────────────────────────────

// List all accounts
router.get("/accounts", async (c) => {
  try {
    const list = await db.select().from(accounts).orderBy(desc(accounts.createdAt));
    return c.json(list);
  } catch (err) {
    console.error("Failed to list accounts:", err);
    return c.json({ error: "Failed to retrieve accounts" }, 500);
  }
});

// Create new account
router.post("/accounts", async (c) => {
  try {
    const body = await c.req.json();
    const { name, remoteName, provider, storageLimit } = body;

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return c.json({ error: "Account display name is required" }, 400);
    }
    if (!remoteName || typeof remoteName !== "string" || !isValidRemoteName(remoteName)) {
      return c.json({ error: "Remote name must be alphanumeric and cannot contain special characters or path traversals" }, 400);
    }
    if (!provider || typeof provider !== "string" || !provider.trim()) {
      return c.json({ error: "Provider type is required" }, 400);
    }

    // Storage limit parsing
    let limitValue: number | null = null;
    if (storageLimit !== undefined && storageLimit !== null) {
      const parsed = Number(storageLimit);
      if (isNaN(parsed) || parsed < 0) {
        return c.json({ error: "Storage limit must be a positive number" }, 400);
      }
      limitValue = parsed;
    }

    // Insert
    const [inserted] = await db
      .insert(accounts)
      .values({
        name: name.trim(),
        remoteName: remoteName.trim(),
        provider: provider.trim(),
        storageLimit: limitValue,
      })
      .returning();

    return c.json(inserted, 201);
  } catch (err) {
    console.error("Failed to create account:", err);
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return c.json({ error: "An account with this remote name already exists" }, 400);
    }
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// Get single account
router.get("/accounts/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidUuid(id)) {
    return c.json({ error: "Invalid account UUID format" }, 400);
  }

  try {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    return c.json(account);
  } catch (err) {
    console.error("Failed to retrieve account:", err);
    return c.json({ error: "Failed to retrieve account" }, 500);
  }
});

// Update account
router.put("/accounts/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidUuid(id)) {
    return c.json({ error: "Invalid account UUID format" }, 400);
  }

  try {
    const body = await c.req.json();
    const { name, provider, status, storageLimit, storageUsed } = body;
    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return c.json({ error: "Display name cannot be empty" }, 400);
      }
      updateData.name = name.trim();
    }

    if (provider !== undefined) {
      if (typeof provider !== "string" || !provider.trim()) {
        return c.json({ error: "Provider cannot be empty" }, 400);
      }
      updateData.provider = provider.trim();
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !["active", "paused", "error"].includes(status)) {
        return c.json({ error: "Invalid status value" }, 400);
      }
      updateData.status = status;
    }

    if (storageLimit !== undefined) {
      if (storageLimit === null) {
        updateData.storageLimit = null;
      } else {
        const parsed = Number(storageLimit);
        if (isNaN(parsed) || parsed < 0) {
          return c.json({ error: "Storage limit must be a positive number" }, 400);
        }
        updateData.storageLimit = parsed;
      }
    }

    if (storageUsed !== undefined) {
      const parsed = Number(storageUsed);
      if (isNaN(parsed) || parsed < 0) {
        return c.json({ error: "Storage used must be a positive number" }, 400);
      }
      updateData.storageUsed = parsed;
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Account not found" }, 404);
    }

    return c.json(updated);
  } catch (err) {
    console.error("Failed to update account:", err);
    return c.json({ error: "Failed to update account" }, 500);
  }
});

// Delete account
router.delete("/accounts/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidUuid(id)) {
    return c.json({ error: "Invalid account UUID format" }, 400);
  }

  try {
    const [deleted] = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    if (!deleted) {
      return c.json({ error: "Account not found" }, 404);
    }
    return c.body(null, 204);
  } catch (err) {
    console.error("Failed to delete account:", err);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

// ── Transfers Endpoints ────────────────────────────────────────────────────

// List transfers with pagination and filter params
router.get("/transfers", async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const status = c.req.query("status");
    const accountId = c.req.query("accountId");
    const from = c.req.query("from");
    const to = c.req.query("to");

    // Compose where conditions dynamic array
    const conditions = [];

    if (status) {
      conditions.push(eq(transfers.status, status));
    }

    if (accountId) {
      if (!isValidUuid(accountId)) {
        return c.json({ error: "Invalid accountId UUID format" }, 400);
      }
      conditions.push(eq(transfers.accountId, accountId));
    }

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(transfers.startedAt, fromDate));
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        conditions.push(lte(transfers.startedAt, toDate));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get transfers count query
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    // Get transfers listing
    const data = await db
      .select()
      .from(transfers)
      .where(whereClause)
      .orderBy(desc(transfers.startedAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("Failed to query transfers:", err);
    return c.json({ error: "Failed to query transfers" }, 500);
  }
});

// Get single transfer
router.get("/transfers/:id", async (c) => {
  const id = c.req.param("id");
  if (!isValidUuid(id)) {
    return c.json({ error: "Invalid transfer UUID format" }, 400);
  }

  try {
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
    if (!transfer) {
      return c.json({ error: "Transfer not found" }, 404);
    }
    return c.json(transfer);
  } catch (err) {
    console.error("Failed to query transfer:", err);
    return c.json({ error: "Failed to retrieve transfer log" }, 500);
  }
});

export default router;
