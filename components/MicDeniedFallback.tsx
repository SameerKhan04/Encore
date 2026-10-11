import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';

type MicDeniedFallbackProps = {
  onOpenSettings: () => void;
};

export function MicDeniedFallback({ onOpenSettings }: MicDeniedFallbackProps) {
  const setDemoMode = usePreferencesStore((s) => s.setDemoMode);

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Microphone access needed</Text>
      <Text style={styles.body}>
        ENCORE needs the microphone so you can sing your challenge. Without it,
        we cannot capture your performance.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Open Settings</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => setDemoMode(true)}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Play in Demo/Mock Mode</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: typography.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body,
  },
});
