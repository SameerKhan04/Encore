import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function HomeScreen() {
  const state = useGameStore((s) => s.state);
  const hasCompletedOnboarding = usePreferencesStore(
    (s) => s.hasCompletedOnboarding,
  );

  return (
    <Screen style={styles.screen}>
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.tagline}>{brand.tagline}</Text>
      <Text style={styles.status}>Phase 5 phrase engine ready</Text>
      <Text style={styles.stateLine}>{`State: ${state}`}</Text>

      <View style={styles.actions}>
        <Link href="/audio-lab" asChild>
          <Pressable accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Party Mode</Text>
          </Pressable>
        </Link>

        <Link href="/word-selection" asChild>
          <Pressable accessibilityRole="button" style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Word Selection</Text>
          </Pressable>
        </Link>

        <Pressable
          accessibilityRole="button"
          style={[styles.secondaryButton, styles.disabledButton]}
          disabled
        >
          <Text style={styles.secondaryButtonText}>Online Match</Text>
          <Text style={styles.caption}>Coming in Phase 7</Text>
        </Pressable>

        {!hasCompletedOnboarding ? (
          <Link href="/onboarding" asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>How to play</Text>
            </Pressable>
          </Link>
        ) : null}

        <Link href="/debug-game" asChild>
          <Pressable accessibilityRole="button" style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Open state debug</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: typography.brand,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  status: {
    fontSize: typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  stateLine: {
    fontSize: typography.body,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  caption: {
    marginTop: spacing.xs,
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  ghostButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
});
