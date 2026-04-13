# API Design

## Sync Records

```http
POST /api/sync/records
```

This endpoint accepts queued mobile operations and returns accepted queue IDs, conflicts, and the latest server-side records.

## Request Body

```ts
type SyncRecordsRequest = {
  clientId: string;
  operations: SyncOperation[];
};

type SyncOperation = {
  queueId: string;
  recordId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  updatedAt: number;
  payload: FieldRecord;
};
```

## Field Record

```ts
type FieldRecord = {
  id: string;
  title: string;
  category: string;
  notes: string;
  location: string;
  owner: string;
  updatedAt: number;
  createdAt: number;
  deletedAt: number | null;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
};
```

## Response Body

```ts
type SyncRecordsResponse = {
  acceptedIds: string[];
  conflicts: {
    queueId: string;
    serverRecord: FieldRecord;
  }[];
  serverRecords: FieldRecord[];
};
```

## Behavior

- Malformed operations are ignored.
- If no server record exists, the incoming record is accepted.
- If the incoming record is newer or equal, it is accepted.
- If the server record is newer, a conflict is returned.
- The client removes accepted queue items locally.
- The client applies server records locally.

## Production Notes

For a production backend, replace the in-memory map with PostgreSQL or MongoDB persistence and add authentication, authorization, audit logging, and request validation.
