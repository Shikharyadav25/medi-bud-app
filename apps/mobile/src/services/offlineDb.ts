import * as SQLite from 'expo-sqlite';
import type { SyncMutationDTO } from '@medi-bud/contracts';
import { apiClient } from './api/client';

let dbInstance: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('medibud_outbox.db');
    dbInstance.execSync(`
      CREATE TABLE IF NOT EXISTS pending_mutations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mutation_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        timezone TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return dbInstance;
}

export async function queueMobileMutation(mutation: SyncMutationDTO): Promise<void> {
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO pending_mutations 
     (mutation_id, user_id, device_id, entity_type, payload, payload_hash, occurred_at, timezone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      mutation.mutation_id,
      mutation.user_id,
      mutation.device_id,
      mutation.entity_type,
      JSON.stringify(mutation.payload),
      mutation.payload_hash,
      mutation.occurred_at,
      mutation.timezone,
      new Date().toISOString(),
    ]
  );
}

export async function getPendingMobileMutations(): Promise<SyncMutationDTO[]> {
  const db = getDb();
  const rows = db.getAllSync<{
    mutation_id: string;
    user_id: string;
    device_id: string;
    entity_type: 'health_log' | 'reminder_completion';
    payload: string;
    payload_hash: string;
    occurred_at: string;
    timezone: string;
  }>(`SELECT * FROM pending_mutations ORDER BY id ASC;`);

  return rows.map((r) => ({
    mutation_id: r.mutation_id,
    user_id: r.user_id,
    device_id: r.device_id,
    entity_type: r.entity_type,
    payload: JSON.parse(r.payload),
    payload_hash: r.payload_hash,
    occurred_at: r.occurred_at,
    timezone: r.timezone,
  }));
}

export async function replayPendingMobileMutations(): Promise<{
  synced: number;
  remaining: number;
}> {
  const pending = await getPendingMobileMutations();
  if (pending.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  const db = getDb();
  try {
    const res = await apiClient<{ results: Array<{ mutation_id: string; status: string }> }>(
      '/v1/sync/logs',
      {
        method: 'POST',
        body: JSON.stringify({ mutations: pending }),
      }
    );

    let synced = 0;
    if (res && res.results) {
      for (const item of res.results) {
        if (item.status === 'applied' || item.status === 'conflict') {
          db.runSync(`DELETE FROM pending_mutations WHERE mutation_id = ?;`, [item.mutation_id]);
          synced++;
        }
      }
    }

    const remainingRows = db.getAllSync(`SELECT COUNT(*) as count FROM pending_mutations;`);
    const remaining = (remainingRows[0] as { count: number })?.count ?? 0;
    return { synced, remaining };
  } catch (err) {
    console.warn('[Mobile Outbox] Sync replay deferred due to network error:', err);
    return { synced: 0, remaining: pending.length };
  }
}
