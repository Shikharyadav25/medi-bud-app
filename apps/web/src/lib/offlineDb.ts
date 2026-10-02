import Dexie, { type EntityTable } from 'dexie';
import type { SyncMutationDTO, HealthLogDTO, ProfileDTO } from '@medi-bud/contracts';
import { apiClient } from '@/lib/api';

export interface PendingMutationEntity extends SyncMutationDTO {
  id?: number;
}

export interface CachedLogEntity extends HealthLogDTO {
  id: string;
}

export interface CachedProfileEntity extends ProfileDTO {
  user_id: string;
}

class MediBudOfflineDatabase extends Dexie {
  pendingMutations!: EntityTable<PendingMutationEntity, 'id'>;
  cachedLogs!: EntityTable<CachedLogEntity, 'id'>;
  cachedProfile!: EntityTable<CachedProfileEntity, 'user_id'>;

  constructor() {
    super('MediBudWebDB');
    this.version(1).stores({
      pendingMutations: '++id, mutation_id, user_id, entity_type, occurred_at',
      cachedLogs: 'id, user_id, kind, occurred_at',
      cachedProfile: 'user_id',
    });
  }
}

export const offlineDb = new MediBudOfflineDatabase();

export async function queueOfflineMutation(
  mutation: Omit<PendingMutationEntity, 'id'>
): Promise<void> {
  await offlineDb.pendingMutations.add(mutation);
}

export async function replayPendingMutations(): Promise<{
  synced: number;
  conflicts: number;
  errors: number;
}> {
  const pending = await offlineDb.pendingMutations.toArray();
  if (pending.length === 0) {
    return { synced: 0, conflicts: 0, errors: 0 };
  }

  const batchPayload: SyncMutationDTO[] = pending.map((item) => ({
    mutation_id: item.mutation_id,
    user_id: item.user_id,
    device_id: item.device_id,
    entity_type: item.entity_type,
    payload: item.payload,
    payload_hash: item.payload_hash,
    occurred_at: item.occurred_at,
    timezone: item.timezone,
  }));

  try {
    const res = await apiClient.syncMutations(batchPayload);
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const result of res.results) {
      if (result.status === 'applied') {
        synced++;
        await offlineDb.pendingMutations.where('mutation_id').equals(result.mutation_id).delete();
      } else if (result.status === 'conflict') {
        conflicts++;
      } else {
        errors++;
      }
    }

    return { synced, conflicts, errors };
  } catch (error) {
    console.error('Offline sync replay failed:', error);
    return { synced: 0, conflicts: 0, errors: pending.length };
  }
}

export async function clearOfflineAccountData(): Promise<void> {
  await offlineDb.pendingMutations.clear();
  await offlineDb.cachedLogs.clear();
  await offlineDb.cachedProfile.clear();
}
