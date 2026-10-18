import type { SyncMutationDTO } from "@medi-bud/contracts";
import { apiClient } from "./api/client";
import { supabase } from "./supabase";
import { privateStorage } from "./privateStorage";

let writes = Promise.resolve();
async function owner() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sign in to use offline entries.");
  return session.user.id;
}
async function read(uid: string): Promise<SyncMutationDTO[]> {
  const raw = await privateStorage.getItem("medibud.outbox." + uid);
  return raw ? JSON.parse(raw) : [];
}
export async function queueMobileMutation(
  mutation: SyncMutationDTO,
): Promise<void> {
  const uid = await owner();
  if (mutation.user_id !== uid) throw new Error("Entry owner mismatch.");
  const action = writes.then(async () => {
    const current = await read(uid);
    const existing = current.find(
      (m) => m.mutation_id === mutation.mutation_id,
    );
    if (existing && JSON.stringify(existing) !== JSON.stringify(mutation))
      throw new Error("This entry ID already exists.");
    if (!existing)
      await privateStorage.setItem(
        "medibud.outbox." + uid,
        JSON.stringify([...current, mutation]),
      );
  });
  writes = action.catch(() => undefined);
  return action;
}
export async function getPendingMobileMutations(): Promise<SyncMutationDTO[]> {
  await writes;
  return read(await owner());
}
export async function replayPendingMobileMutations(): Promise<{
  synced: number;
  remaining: number;
}> {
  const uid = await owner();
  const pending = await getPendingMobileMutations();
  if (!pending.length) return { synced: 0, remaining: 0 };
  try {
    const result = await apiClient<{
      results: Array<{ mutation_id: string; status: string }>;
    }>("/v1/sync/logs", {
      method: "POST",
      body: JSON.stringify({ mutations: pending.slice(0, 100) }),
    });
    const applied = new Set(
      result.results
        .filter((r) => r.status === "applied")
        .map((r) => r.mutation_id),
    );
    const action = writes.then(async () => {
      const current = await read(uid);
      await privateStorage.setItem(
        "medibud.outbox." + uid,
        JSON.stringify(current.filter((m) => !applied.has(m.mutation_id))),
      );
    });
    writes = action.catch(() => undefined);
    await action;
    return { synced: applied.size, remaining: (await read(uid)).length };
  } catch {
    return { synced: 0, remaining: pending.length };
  }
}
