export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type FileSystemLegacyLike = {
  documentDirectory: string | null;
  getInfoAsync: (
    uri: string,
  ) => Promise<{ exists: boolean; isDirectory?: boolean }>;
  makeDirectoryAsync: (
    uri: string,
    opts?: { intermediates?: boolean },
  ) => Promise<void>;
  readAsStringAsync: (uri: string) => Promise<string>;
  writeAsStringAsync: (uri: string, contents: string) => Promise<void>;
  deleteAsync: (
    uri: string,
    opts?: { idempotent?: boolean },
  ) => Promise<void>;
};

function looksLikeStorage(value: unknown): value is KeyValueStorage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as KeyValueStorage;
  return (
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  );
}

/** Peel Metro/CJS `default` nesting until we find get/set/remove. */
export function unwrapStorageModule(mod: unknown): KeyValueStorage | null {
  let current: unknown = mod;
  for (let i = 0; i < 4; i += 1) {
    if (looksLikeStorage(current)) {
      return current;
    }
    if (current && typeof current === 'object' && 'default' in current) {
      current = (current as { default: unknown }).default;
      continue;
    }
    break;
  }
  return null;
}

function tryNativeAsyncStorage(): KeyValueStorage | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-async-storage/async-storage');
    return unwrapStorageModule(mod);
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[encore] AsyncStorage native unavailable',
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
}

/**
 * Survives Expo reload when AsyncStorage native module is missing from the
 * current dev client (common until a rebuild after adding the package).
 */
export function createFileSystemKeyValueStorage(
  fs?: FileSystemLegacyLike,
): KeyValueStorage | null {
  try {
    const FS =
      fs ??
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-file-system/legacy') as FileSystemLegacyLike);
    const root = FS.documentDirectory;
    if (!root) {
      return null;
    }
    const dir = `${root}encore-kv/`;
    let ready: Promise<void> | null = null;
    const ensureDir = () => {
      if (!ready) {
        ready = (async () => {
          const info = await FS.getInfoAsync(dir);
          if (!info.exists) {
            await FS.makeDirectoryAsync(dir, { intermediates: true });
          }
        })();
      }
      return ready;
    };
    const fileFor = (key: string) => `${dir}${encodeURIComponent(key)}.txt`;

    return {
      async getItem(key) {
        await ensureDir();
        try {
          return await FS.readAsStringAsync(fileFor(key));
        } catch {
          return null;
        }
      },
      async setItem(key, value) {
        await ensureDir();
        await FS.writeAsStringAsync(fileFor(key), value);
      },
      async removeItem(key) {
        await ensureDir();
        await FS.deleteAsync(fileFor(key), { idempotent: true });
      },
    };
  } catch (err) {
    if (__DEV__) {
      console.warn(
        '[encore] file-system KV unavailable',
        err instanceof Error ? err.message : err,
      );
    }
    return null;
  }
}

/**
 * Prefer native AsyncStorage; fall back to expo-file-system so auth/profile
 * survive reload even on an older dev client.
 */
export function resolveAsyncStorage(): KeyValueStorage | null {
  return tryNativeAsyncStorage() ?? createFileSystemKeyValueStorage();
}

export function createMemoryKeyValueStorage(
  initial?: Record<string, string>,
): KeyValueStorage {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}
