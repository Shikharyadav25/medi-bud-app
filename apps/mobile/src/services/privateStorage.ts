import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const queues = new Map<string, Promise<unknown>>();
async function serial<T>(key: string, action: () => Promise<T>): Promise<T> {
  const pending = (queues.get(key) || Promise.resolve())
    .catch(() => undefined)
    .then(action);
  queues.set(key, pending);
  try {
    return await pending;
  } finally {
    if (queues.get(key) === pending) queues.delete(key);
  }
}
function metadata(raw: string) {
  const value = JSON.parse(raw);
  if (
    typeof value.generation !== "string" ||
    !Number.isInteger(value.count) ||
    value.count < 1 ||
    value.count > 2000
  )
    throw new Error("Invalid protected-storage metadata");
  return value as { generation: string; count: number };
}
// Native health caches and sessions use protected storage, in small atomic generations.
// Web health caches remain in memory; web auth uses the Supabase storage adapter.
export const privateStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return null;
    return serial(key, async () => {
      const raw = await SecureStore.getItemAsync(key, options);
      if (!raw) return null;
      const { generation, count } = metadata(raw);
      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(key + "." + generation + "." + i, options),
        ),
      );
      return parts.every((p) => p !== null) ? parts.join("") : null;
    });
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return;
    await serial(key, async () => {
      const old = await SecureStore.getItemAsync(key, options);
      const generation = Date.now() + "-" + Math.random().toString(36).slice(2);
      const parts = value.match(/[\s\S]{1,400}/g) || [""];
      if (parts.length > 2000)
        throw new Error("Protected storage record exceeds the size limit");
      for (let i = 0; i < parts.length; i++)
        await SecureStore.setItemAsync(
          key + "." + generation + "." + i,
          parts[i],
          options,
        );
      await SecureStore.setItemAsync(
        key,
        JSON.stringify({ generation, count: parts.length }),
        options,
      );
      if (old) {
        const previous = metadata(old);
        for (let i = 0; i < previous.count; i++)
          await SecureStore.deleteItemAsync(
            key + "." + previous.generation + "." + i,
            options,
          );
      }
    });
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") return;
    await serial(key, async () => {
      const raw = await SecureStore.getItemAsync(key, options);
      await SecureStore.deleteItemAsync(key, options);
      if (raw) {
        const previous = metadata(raw);
        for (let i = 0; i < previous.count; i++)
          await SecureStore.deleteItemAsync(
            key + "." + previous.generation + "." + i,
            options,
          );
      }
    });
  },
};
