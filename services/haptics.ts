import { usePreferencesStore } from '@/store/preferencesStore';

type ImpactStyle = 'light' | 'medium' | 'heavy';

async function impactAsync(style: ImpactStyle): Promise<void> {
  if (!usePreferencesStore.getState().hapticsEnabled) {
    return;
  }

  try {
    // Lazy require — keeps unit tests free of native module crashes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Haptics = require('expo-haptics') as typeof import('expo-haptics');
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    } as const;
    await Haptics.impactAsync(map[style]);
  } catch {
    // Native haptics unavailable (web / tests).
  }
}

export function hapticLight(): Promise<void> {
  return impactAsync('light');
}

export function hapticMedium(): Promise<void> {
  return impactAsync('medium');
}

export function hapticHeavy(): Promise<void> {
  return impactAsync('heavy');
}
