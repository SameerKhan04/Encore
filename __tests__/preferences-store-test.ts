import { usePreferencesStore } from '@/store/preferencesStore';

describe('preferences store', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
  });

  it('defaults haptics on, full volume, and onboarding incomplete', () => {
    const prefs = usePreferencesStore.getState();

    expect(prefs.hapticsEnabled).toBe(true);
    expect(prefs.volume).toBe(1);
    expect(prefs.hasCompletedOnboarding).toBe(false);
  });

  it('toggles haptics', () => {
    usePreferencesStore.getState().setHapticsEnabled(false);
    expect(usePreferencesStore.getState().hapticsEnabled).toBe(false);

    usePreferencesStore.getState().setHapticsEnabled(true);
    expect(usePreferencesStore.getState().hapticsEnabled).toBe(true);
  });

  it('clamps volume between 0 and 1', () => {
    usePreferencesStore.getState().setVolume(1.5);
    expect(usePreferencesStore.getState().volume).toBe(1);

    usePreferencesStore.getState().setVolume(-0.2);
    expect(usePreferencesStore.getState().volume).toBe(0);

    usePreferencesStore.getState().setVolume(0.4);
    expect(usePreferencesStore.getState().volume).toBe(0.4);
  });

  it('marks onboarding complete', () => {
    usePreferencesStore.getState().completeOnboarding();
    expect(usePreferencesStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('clearCache restores defaults including onboarding', () => {
    usePreferencesStore.getState().setHapticsEnabled(false);
    usePreferencesStore.getState().setVolume(0.2);
    usePreferencesStore.getState().completeOnboarding();

    usePreferencesStore.getState().clearCache();

    const prefs = usePreferencesStore.getState();
    expect(prefs.hapticsEnabled).toBe(true);
    expect(prefs.volume).toBe(1);
    expect(prefs.hasCompletedOnboarding).toBe(false);
  });
});
