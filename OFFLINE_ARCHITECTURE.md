# Offline-First Architecture

## Principle

The application is designed around one rule:

> All CRUD operations hit local storage first.

Network availability should improve the experience, not determine whether the app can function.

## Layers

### UI Layer

Screens allow users to log in, capture records, browse records, edit records, delete records, and monitor sync status.

### State Layer

The offline data provider coordinates:

- Current user session
- Online/offline status
- Local records
- Sync queue items
- Manual sync
- Background sync attempts

### Repository/Data Layer

The local store handles:

- Database initialization
- Local users
- Session persistence
- Field records
- Sync queue operations
- Save/edit/delete mutations
- Sync processing

### Sync Layer

The sync manager:

1. Checks network state.
2. Reads due queue items.
3. Sends operations to the backend.
4. Applies accepted remote state locally.
5. Removes successful queue items.
6. Marks failed operations with retry metadata.
7. Resolves conflicts using timestamps.

## Local Tables

### users

Stores demo offline users.

### session

Stores the current offline session.

### field_records

Stores local data records.

### sync_queue

Stores unsynced operations.

## Retry Logic

Failed queue items are not deleted. Instead, they store:

- Attempt count
- Last error
- Next retry timestamp

Retry delay grows exponentially and is capped to avoid aggressive network usage.

## Conflict Resolution

Conflict handling uses `updatedAt` timestamps.

- Newer local update wins.
- Newer server update wins.
- Equal timestamp accepts the incoming update.

This is simple, deterministic, and suitable for many field data workflows.

## Data Loss Prevention

The app avoids data loss by:

- Saving locally before syncing
- Keeping queued operations durable
- Not deleting failed queue items
- Applying remote state only after server response
- Separating local UI updates from remote sync success
