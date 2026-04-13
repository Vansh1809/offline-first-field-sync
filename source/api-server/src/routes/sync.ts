import { Router, type Request, type Response } from "express";

type RemoteRecord = {
  id: string;
  title: string;
  category: string;
  notes: string;
  location: string;
  owner: string;
  updatedAt: number;
  createdAt: number;
  deletedAt: number | null;
  syncStatus: string;
};

type SyncOperation = {
  queueId: string;
  recordId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: RemoteRecord;
  updatedAt: number;
};

const router = Router();
const remoteRecords = new Map<string, RemoteRecord>();

function isRecord(value: unknown): value is RemoteRecord {
  const record = value as Partial<RemoteRecord>;
  return (
    typeof record?.id === "string" &&
    typeof record.title === "string" &&
    typeof record.updatedAt === "number" &&
    typeof record.createdAt === "number"
  );
}

function isOperation(value: unknown): value is SyncOperation {
  const operation = value as Partial<SyncOperation>;
  return (
    typeof operation?.queueId === "string" &&
    typeof operation.recordId === "string" &&
    ["CREATE", "UPDATE", "DELETE"].includes(operation.operation ?? "") &&
    isRecord(operation.payload)
  );
}

router.post("/sync/records", (req: Request, res: Response) => {
  const operations = Array.isArray(req.body?.operations)
    ? req.body.operations
    : [];
  const acceptedIds: string[] = [];
  const conflicts: { queueId: string; serverRecord: RemoteRecord }[] = [];

  for (const rawOperation of operations) {
    if (!isOperation(rawOperation)) {
      req.log.warn({ rawOperation }, "Rejected malformed sync operation");
      continue;
    }

    const operation = rawOperation;
    const incoming = {
      ...operation.payload,
      syncStatus: "synced",
    };
    const existing = remoteRecords.get(operation.recordId);

    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      remoteRecords.set(operation.recordId, incoming);
      acceptedIds.push(operation.queueId);
    } else {
      conflicts.push({
        queueId: operation.queueId,
        serverRecord: existing,
      });
    }
  }

  res.json({
    acceptedIds,
    conflicts,
    serverRecords: [...remoteRecords.values()],
  });
});

export default router;