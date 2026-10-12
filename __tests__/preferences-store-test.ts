import {
  createMemoryPreferencesStorage,
  createPreferencesStore,
  usePreferencesStore,
} from '@/store/preferencesStore';

describe('preferencesStore', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
  });

  it('starts with sensible defaults', () => {
    const state = usePreferencesStore.getState();
    expect(state.hapticsEnabled).toBe(true);
    expect(state.volume).toBe(1);
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('toggles haptics and clamps volume', () => {
    usePreferencesStore.getState().setHapticsEnabled(false);
    usePreferencesStore.getState().setVolume(2);
    expect(usePreferencesStore.getState().hapticsEnabled).toBe(false);
    expect(usePreferencesStore.getState().volume).toBe(1);
  });
});

describe('preferencesStore persistence', () => {
  it('rehydrates toggles from storage', async () => {
    const storage = createMemoryPreferencesStorage();
    const first = createPreferencesStore({ storage });
    await first.getState().hydrate();
    first.getState().setHapticsEnabled(false);
    first.getState().setVolume(0.4);
    first.getState().completeOnboarding();
    await first.getState().persist();

    const second = createPreferencesStore({ storage });
    await second.getState().hydrate();

    expect(second.getState().hapticsEnabled).toBe(false);
    expect(second.getState().volume).toBe(0.4);
    expect(second.getState().hasCompletedOnboarding).toBe(true);
  });
});
