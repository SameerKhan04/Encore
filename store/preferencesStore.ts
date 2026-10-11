import { create } from 'zustand';

const DEFAULTS = {
  hapticsEnabled: true,
  volume: 1,
  hasCompletedOnboarding: false,
} as const;

type PreferencesStore = {
  hapticsEnabled: boolean;
  volume: number;
  hasCompletedOnboarding: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  completeOnboarding: () => void;
  clearCache: () => void;
};

function clampVolume(volume: number): number {
  if (volume < 0) return 0;
  if (volume > 1) return 1;
  return volume;
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  ...DEFAULTS,

  setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),

  setVolume: (volume) => set({ volume: clampVolume(volume) }),

  completeOnboarding: () => set({ hasCompletedOnboarding: true }),

  clearCache: () => set({ ...DEFAULTS }),
}));
