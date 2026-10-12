import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { resolveAsyncStorage } from '@/services/asyncStorage';

const STORAGE_KEY = 'encore.preferences.v1';

const DEFAULTS = {
  hapticsEnabled: true,
  volume: 1,
  hasCompletedOnboarding: false,
  demoMode: false,
} as const;

export type PreferencesStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type PreferencesState = {
  hapticsEnabled: boolean;
  volume: number;
  hasCompletedOnboarding: boolean;
  demoMode: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setDemoMode: (enabled: boolean) => void;
  completeOnboarding: () => void;
  clearCache: () => void;
};

type PreferencesDeps = {
  storage: PreferencesStorage;
};

function clampVolume(volume: number): number {
  if (volume < 0) return 0;
  if (volume > 1) return 1;
  return volume;
}

export function createMemoryPreferencesStorage(
  initial?: Record<string, string>,
): PreferencesStorage {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
}

export function createPreferencesStore(
  deps: PreferencesDeps,
): UseBoundStore<StoreApi<PreferencesState>> {
  return create<PreferencesState>((set, get) => {
    const write = async () => {
      const state = get();
      await deps.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          hapticsEnabled: state.hapticsEnabled,
          volume: state.volume,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
          demoMode: state.demoMode,
        }),
      );
    };

    return {
      ...DEFAULTS,
      hydrated: false,

      hydrate: async () => {
        try {
          const raw = await deps.storage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<typeof DEFAULTS>;
            set({
              hapticsEnabled:
                parsed.hapticsEnabled ?? DEFAULTS.hapticsEnabled,
              volume:
                typeof parsed.volume === 'number'
                  ? clampVolume(parsed.volume)
                  : DEFAULTS.volume,
              hasCompletedOnboarding:
                parsed.hasCompletedOnboarding ??
                DEFAULTS.hasCompletedOnboarding,
              demoMode: parsed.demoMode ?? DEFAULTS.demoMode,
              hydrated: true,
            });
            return;
          }
        } catch {
          // Fall through to defaults.
        }
        set({ hydrated: true });
      },

      persist: async () => {
        await write();
      },

      setHapticsEnabled: (enabled) => {
        set({ hapticsEnabled: enabled });
        void write();
      },

      setVolume: (volume) => {
        set({ volume: clampVolume(volume) });
        void write();
      },

      setDemoMode: (enabled) => {
        set({ demoMode: enabled });
        void write();
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
        void write();
      },

      clearCache: () => {
        set({ ...DEFAULTS, hydrated: true });
        void write();
      },
    };
  });
}

function createAppStorage(): PreferencesStorage {
  if (process.env.NODE_ENV === 'test') {
    return createMemoryPreferencesStorage();
  }
  return resolveAsyncStorage() ?? createMemoryPreferencesStorage();
}

/** App singleton — preferences survive restarts. */
export const usePreferencesStore = createPreferencesStore({
  storage: createAppStorage(),
});
