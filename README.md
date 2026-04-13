# Offline-First Mobile App for Low-Connectivity Environments

A production-oriented mobile application architecture designed for field teams working in rural, remote, and low-connectivity environments.

This project demonstrates how a mobile app can continue functioning when the internet is unavailable, safely store user data locally, and automatically synchronize changes with a remote server once connectivity is restored.

## Why This Project Matters

Many real-world users cannot rely on stable internet access. Rural healthcare workers, education survey teams, NGO field agents, agriculture teams, and remote workforce operators still need to capture accurate data even when the network is weak or unavailable.

This app follows an offline-first approach:

> Every user action is saved locally first. Sync happens later when connectivity is available.

That means no blocked workflows, no lost form submissions, and no dependency on constant internet access.

## Key Features

- Fully functional offline mode
- Offline login support
- Local data storage using SQLite on mobile devices
- Web-safe local storage fallback for browser preview
- Data entry forms that save without internet
- Local viewing, editing, and deletion
- Durable sync queue for CREATE, UPDATE, and DELETE operations
- Manual Sync Now action
- Background retry when network connectivity is detected
- Pending, Synced, and Failed sync status indicators
- Timestamp-based last-write-wins conflict resolution
- Partial sync failure handling
- Exponential retry metadata for failed operations
- Role-based demo users for admin and agent workflows
- Clean mobile UI optimized for low-end devices
- RESTful backend sync endpoint using Node.js and Express

## Demo Credentials

Use these demo offline accounts:

| Role | Username | PIN |
| --- | --- | --- |
| Field Agent | `agent` | `1234` |
| Admin | `admin` | `0000` |

These credentials are checked locally, so login still works without an internet connection.

## Tech Stack

### Mobile

- Expo / React Native
- Expo Router
- SQLite for native local persistence
- AsyncStorage fallback for web preview
- Expo Network for connectivity checks
- Context-based state management
- Repository-style local data layer

### Backend

- Node.js
- Express
- REST API
- OpenAPI contract
- Timestamp-based sync conflict handling

## Offline-First Data Flow

1. User creates, edits, or deletes a record.
2. The app writes the change to local storage first.
3. The app adds a durable operation to the sync queue.
4. The UI immediately shows the local change with a Pending status.
5. When connectivity is available, the sync manager sends queued operations to the server.
6. The server accepts newer records and returns conflicts when server data is newer.
7. The client updates local records and removes successful queue items.
8. Failed operations remain queued with retry metadata.

## Sync Queue Model

Each queued operation stores:

- Queue ID
- Record ID
- Operation type: CREATE, UPDATE, DELETE
- Payload snapshot
- Attempt count
- Last error
- Next retry timestamp
- Created timestamp

This prevents data loss during offline usage and allows retry after partial failures.

## Conflict Resolution

The app uses timestamp-based conflict resolution:

- If the incoming local record has a newer or equal `updatedAt`, the server accepts it.
- If the server already has a newer record, the server returns a conflict.
- The client applies the newer server record locally.

This is a last-write-wins strategy and can be extended later for manual merge review.

## API Endpoint

```http
POST /api/sync/records
```

### Request

```json
{
  "clientId": "device-or-install-id",
  "operations": [
    {
      "queueId": "queue_123",
      "recordId": "record_123",
      "operation": "CREATE",
      "updatedAt": 1710000000000,
      "payload": {
        "id": "record_123",
        "title": "Clinic visit",
        "category": "Healthcare",
        "notes": "Captured offline",
        "location": "Village block A",
        "owner": "agent",
        "updatedAt": 1710000000000,
        "createdAt": 1710000000000,
        "deletedAt": null,
        "syncStatus": "pending"
      }
    }
  ]
}
```

### Response

```json
{
  "acceptedIds": ["queue_123"],
  "conflicts": [],
  "serverRecords": []
}
```

## Project Structure

```text
source/
  mobile/
    app/                 # Expo Router screens
    components/          # Shared UI components
    contexts/            # Offline data provider
    lib/offlineStore.ts  # SQLite repository and sync manager
    constants/           # Design tokens
  api-server/
    src/routes/sync.ts   # REST sync endpoint
  api-spec/
    openapi.yaml         # API contract
assets/
  linkedin-screenshots/  # Images for sharing the project
```

## Important Files

- `source/mobile/lib/offlineStore.ts` — local database, sync queue, retry logic, conflict handling
- `source/mobile/contexts/OfflineDataContext.tsx` — app state and background sync orchestration
- `source/mobile/app/(tabs)/index.tsx` — offline login and data capture
- `source/mobile/app/(tabs)/records.tsx` — local viewing/editing/deleting
- `source/mobile/app/(tabs)/sync.tsx` — sync status and API contract explanation
- `source/api-server/src/routes/sync.ts` — server sync endpoint
- `source/api-spec/openapi.yaml` — REST API design

## Future Improvements

- Encryption at rest for SQLite data
- Real database-backed server persistence
- User authentication integration
- Push/background tasks for native sync scheduling
- Data compression for low-bandwidth sync
- Manual conflict review screen
- Audit logs for sensitive field operations
- Modular domains for healthcare, education, agriculture, and logistics

## Use Cases

This architecture is suitable for:

- Rural healthcare data collection
- Education field surveys
- NGO and government field operations
- Agriculture inspections
- Supply-chain tracking
- Remote workforce reporting
- Low-connectivity enterprise apps

## Core Lesson

Offline support is not just a feature. For many users, it is the foundation of reliability, accessibility, and trust.
