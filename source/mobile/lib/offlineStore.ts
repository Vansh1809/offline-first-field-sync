import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type SyncStatus = "pending" | "synced" | "failed" | "conflict";
export type OperationType = "CREATE" | "UPDATE" | "DELETE";
export type Role = "admin" | "agent";

export type FieldRecord = {
  id: string;
  title: string;
  category: string;
  notes: string;
  location: string;
  owner: string;
  updatedAt: number;
  createdAt: number;
  deletedAt: number | null;
  syncStatus: SyncStatus;
};

export type SyncQueueItem = {
  id: string;
  recordId: string;
  operation: OperationType;
  payload: string;
  attempts: number;
  lastError: string | null;
  nextRetryAt: number;
  createdAt: number;
};

export type CurrentUser = {
  username: string;
  role: Role;
};

export type SyncResult = {
  pushed: number;
  conflicts: number;
  failed: number;
  message: string;
};

let database: import("expo-sqlite").SQLiteDatabase | null = null;
const WEB_STATE_KEY = "offline_first_field_web_state";

type WebState = {
  users: { username: string; pin: string; role: Role }[];
  session: CurrentUser | null;
  records: FieldRecord[];
  queue: SyncQueueItem[];
};

const defaultWebState: WebState = {
  users: [
    { username: "agent", pin: "1234", role: "agent" },
    { username: "admin", pin: "0000", role: "admin" },
  ],
  session: null,
  records: [],
  queue: [],
};

async function loadWebState(): Promise<WebState> {
  const raw = await AsyncStorage.getItem(WEB_STATE_KEY);
  if (!raw) return defaultWebState;
  return { ...defaultWebState, ...(JSON.parse(raw) as Partial<WebState>) };
}

async function saveWebState(state: WebState) {
  await AsyncStorage.setItem(WEB_STATE_KEY, JSON.stringify(state));
}

function db() {
  if (Platform.OS === "web") {
    throw new Error("SQLite is only opened on native platforms.");
  }
  if (!database) {
    const SQLite = require("expo-sqlite") as typeof import("expo-sqlite");
    database = SQLite.openDatabaseSync("offline_first_field.db");
  }
  return database;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function initializeDatabase() {
  if (Platform.OS === "web") {
    const raw = await AsyncStorage.getItem(WEB_STATE_KEY);
    if (!raw) await saveWebState(defaultWebState);
    return;
  }

  const database = db();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      key TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS field_records (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT NOT NULL,
      location TEXT NOT NULL,
      owner TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      deletedAt INTEGER,
      syncStatus TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      recordId TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      lastError TEXT,
      nextRetryAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_queue_retry ON sync_queue(nextRetryAt, createdAt);
    CREATE INDEX IF NOT EXISTS idx_records_updated ON field_records(updatedAt);
  `);

  const seeded = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM users",
  );
  if (!seeded || seeded.count === 0) {
    await database.runAsync(
      "INSERT INTO users (username, pin, role) VALUES (?, ?, ?), (?, ?, ?)",
      ["agent", "1234", "agent", "admin", "0000", "admin"],
    );
  }
}

export async function authenticateOffline(username: string, pin: string) {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    const user = state.users.find(
      (candidate) =>
        candidate.username.toLowerCase() === username.trim().toLowerCase() &&
        candidate.pin === pin.trim(),
    );
    if (!user) {
      throw new Error("No offline user matches those credentials.");
    }
    state.session = { username: user.username, role: user.role };
    await saveWebState(state);
    return state.session;
  }

  const user = await db().getFirstAsync<CurrentUser>(
    "SELECT username, role FROM users WHERE lower(username) = lower(?) AND pin = ?",
    [username.trim(), pin.trim()],
  );
  if (!user) {
    throw new Error("No offline user matches those credentials.");
  }
  await db().runAsync(
    "INSERT OR REPLACE INTO session (key, username, role) VALUES ('current', ?, ?)",
    [user.username, user.role],
  );
  return user;
}

export async function getCurrentUser() {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    return state.session;
  }

  return db().getFirstAsync<CurrentUser>(
    "SELECT username, role FROM session WHERE key = 'current'",
  );
}

export async function logoutUser() {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.session = null;
    await saveWebState(state);
    return;
  }

  await db().runAsync("DELETE FROM session WHERE key = 'current'");
}

export async function getNetworkOnline() {
  const state = await Network.getNetworkStateAsync();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function listRecords(includeDeleted = false) {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    return state.records
      .filter((record) => includeDeleted || record.deletedAt === null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const where = includeDeleted ? "" : "WHERE deletedAt IS NULL";
  return db().getAllAsync<FieldRecord>(
    `SELECT * FROM field_records ${where} ORDER BY updatedAt DESC`,
  );
}

export async function listQueue() {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    return [...state.queue].sort((a, b) => a.createdAt - b.createdAt);
  }

  return db().getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue ORDER BY createdAt ASC",
  );
}

async function enqueue(operation: OperationType, record: FieldRecord) {
  const now = Date.now();
  const item: SyncQueueItem = {
    id: createId("queue"),
    recordId: record.id,
    operation,
    payload: JSON.stringify(record),
    attempts: 0,
    lastError: null,
    nextRetryAt: now,
    createdAt: now,
  };

  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.queue.push(item);
    await saveWebState(state);
    return;
  }

  await db().runAsync(
    `INSERT INTO sync_queue
      (id, recordId, operation, payload, attempts, lastError, nextRetryAt, createdAt)
      VALUES (?, ?, ?, ?, 0, NULL, ?, ?)`,
    [
      item.id,
      item.recordId,
      item.operation,
      item.payload,
      item.nextRetryAt,
      item.createdAt,
    ],
  );
}

export async function saveRecord(input: {
  id?: string;
  title: string;
  category: string;
  notes: string;
  location: string;
  owner: string;
}) {
  const now = Date.now();
  if (Platform.OS === "web") {
    const state = await loadWebState();
    const existing = input.id
      ? state.records.find((record) => record.id === input.id)
      : null;
    const record: FieldRecord = {
      id: input.id ?? createId("record"),
      title: input.title.trim(),
      category: input.category.trim() || "General",
      notes: input.notes.trim(),
      location: input.location.trim() || "Unspecified",
      owner: input.owner,
      updatedAt: now,
      createdAt: existing?.createdAt ?? now,
      deletedAt: null,
      syncStatus: "pending",
    };
    state.records = [
      record,
      ...state.records.filter((candidate) => candidate.id !== record.id),
    ];
    await saveWebState(state);
    await enqueue(existing ? "UPDATE" : "CREATE", record);
    return record;
  }

  const existing = input.id
    ? await db().getFirstAsync<FieldRecord>(
        "SELECT * FROM field_records WHERE id = ?",
        [input.id],
      )
    : null;
  const record: FieldRecord = {
    id: input.id ?? createId("record"),
    title: input.title.trim(),
    category: input.category.trim() || "General",
    notes: input.notes.trim(),
    location: input.location.trim() || "Unspecified",
    owner: input.owner,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
    deletedAt: null,
    syncStatus: "pending",
  };

  await db().runAsync(
    `INSERT OR REPLACE INTO field_records
      (id, title, category, notes, location, owner, updatedAt, createdAt, deletedAt, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.title,
      record.category,
      record.notes,
      record.location,
      record.owner,
      record.updatedAt,
      record.createdAt,
      record.deletedAt,
      record.syncStatus,
    ],
  );
  await enqueue(existing ? "UPDATE" : "CREATE", record);
  return record;
}

export async function deleteRecord(record: FieldRecord, actor: string) {
  const deleted: FieldRecord = {
    ...record,
    owner: actor,
    updatedAt: Date.now(),
    deletedAt: Date.now(),
    syncStatus: "pending",
  };
  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.records = state.records.map((candidate) =>
      candidate.id === deleted.id ? deleted : candidate,
    );
    await saveWebState(state);
    await enqueue("DELETE", deleted);
    return;
  }

  await db().runAsync(
    "UPDATE field_records SET updatedAt = ?, deletedAt = ?, syncStatus = ?, owner = ? WHERE id = ?",
    [deleted.updatedAt, deleted.deletedAt, "pending", actor, deleted.id],
  );
  await enqueue("DELETE", deleted);
}

function apiBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : null;
}

async function markQueueFailed(items: SyncQueueItem[], error: string) {
  const now = Date.now();
  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.queue = state.queue.map((queueItem) => {
      const item = items.find((candidate) => candidate.id === queueItem.id);
      if (!item) return queueItem;
      const attempts = item.attempts + 1;
      return {
        ...queueItem,
        attempts,
        lastError: error,
        nextRetryAt: now + Math.min(30 * 60_000, 2 ** attempts * 10_000),
      };
    });
    state.records = state.records.map((record) =>
      items.some((item) => item.recordId === record.id)
        ? { ...record, syncStatus: "failed" }
        : record,
    );
    await saveWebState(state);
    return;
  }

  await Promise.all(
    items.map((item) => {
      const attempts = item.attempts + 1;
      const delay = Math.min(30 * 60_000, 2 ** attempts * 10_000);
      return db().runAsync(
        "UPDATE sync_queue SET attempts = ?, lastError = ?, nextRetryAt = ? WHERE id = ?",
        [attempts, error, now + delay, item.id],
      );
    }),
  );
  await Promise.all(
    items.map((item) =>
      db().runAsync("UPDATE field_records SET syncStatus = 'failed' WHERE id = ?", [
        item.recordId,
      ]),
    ),
  );
}

async function upsertRemoteRecord(record: FieldRecord) {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    const syncedRecord = { ...record, syncStatus: "synced" as const };
    state.records = [
      syncedRecord,
      ...state.records.filter((candidate) => candidate.id !== record.id),
    ];
    await saveWebState(state);
    return;
  }

  await db().runAsync(
    `INSERT OR REPLACE INTO field_records
      (id, title, category, notes, location, owner, updatedAt, createdAt, deletedAt, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.title,
      record.category,
      record.notes,
      record.location,
      record.owner,
      record.updatedAt,
      record.createdAt,
      record.deletedAt,
      "synced",
    ],
  );
}

async function removeQueueItems(ids: string[]) {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.queue = state.queue.filter((item) => !ids.includes(item.id));
    await saveWebState(state);
    return;
  }
  await Promise.all(
    ids.map((id) => db().runAsync("DELETE FROM sync_queue WHERE id = ?", [id])),
  );
}

async function markRecordsSynced(items: SyncQueueItem[]) {
  if (Platform.OS === "web") {
    const state = await loadWebState();
    state.records = state.records.map((record) =>
      items.some((item) => item.recordId === record.id) && record.deletedAt === null
        ? { ...record, syncStatus: "synced" }
        : record,
    );
    await saveWebState(state);
    return;
  }
  await Promise.all(
    items.map((item) =>
      db().runAsync(
        "UPDATE field_records SET syncStatus = 'synced' WHERE id = ? AND deletedAt IS NULL",
        [item.recordId],
      ),
    ),
  );
}

export async function processSyncQueue(force = false): Promise<SyncResult> {
  const online = await getNetworkOnline();
  const baseUrl = apiBaseUrl();
  if (!online) {
    return {
      pushed: 0,
      conflicts: 0,
      failed: 0,
      message: "Device is offline. Changes are safely queued locally.",
    };
  }
  if (!baseUrl) {
    return {
      pushed: 0,
      conflicts: 0,
      failed: 0,
      message: "No remote endpoint is configured for this build.",
    };
  }

  const now = Date.now();
  const allItems = await listQueue();
  const dueItems = force
    ? allItems
    : allItems.filter((item) => item.nextRetryAt <= now);
  if (dueItems.length === 0) {
    return {
      pushed: 0,
      conflicts: 0,
      failed: 0,
      message: "No pending changes need syncing.",
    };
  }

  try {
    const response = await fetch(`${baseUrl}/sync/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "identity",
      },
      body: JSON.stringify({
        clientId: process.env.EXPO_PUBLIC_REPL_ID ?? "local-device",
        operations: dueItems.map((item) => ({
          queueId: item.id,
          recordId: item.recordId,
          operation: item.operation,
          payload: JSON.parse(item.payload) as FieldRecord,
          updatedAt: JSON.parse(item.payload).updatedAt as number,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Remote sync failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      acceptedIds: string[];
      conflicts: { queueId: string; serverRecord: FieldRecord }[];
      serverRecords: FieldRecord[];
    };

    const accepted = new Set(data.acceptedIds);
    await Promise.all(
      data.serverRecords.map((record) => upsertRemoteRecord(record)),
    );
    await Promise.all(
      data.conflicts.map((conflict) => upsertRemoteRecord(conflict.serverRecord)),
    );
    await removeQueueItems([
      ...dueItems.filter((item) => accepted.has(item.id)).map((item) => item.id),
      ...data.conflicts.map((conflict) => conflict.queueId),
    ]);
    await markRecordsSynced(dueItems.filter((item) => accepted.has(item.id)));

    const failed = dueItems.length - accepted.size - data.conflicts.length;
    if (failed > 0) {
      await markQueueFailed(
        dueItems.filter(
          (item) =>
            !accepted.has(item.id) &&
            !data.conflicts.some((conflict) => conflict.queueId === item.id),
        ),
        "Remote server did not accept the operation.",
      );
    }

    return {
      pushed: accepted.size,
      conflicts: data.conflicts.length,
      failed,
      message:
        data.conflicts.length > 0
          ? "Sync completed with timestamp conflicts resolved by latest update."
          : "Sync completed successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync failure";
    await markQueueFailed(dueItems, message);
    return {
      pushed: 0,
      conflicts: 0,
      failed: dueItems.length,
      message,
    };
  }
}