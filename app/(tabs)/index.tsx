import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, colors, spacing, typography } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

export default function HomeScreen() {
  const state = useGameStore((s) => s.state);

  return (
    <View style={styles.container} testID="home-shell">
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.tagline}>{brand.tagline}</Text>
      <Text style={styles.status}>Phase 2 state machine ready</Text>
      <Text style={styles.stateLine}>State: {state}</Text>
      <Link href="/debug-game" asChild>
        <Pressable accessibilityRole="button" style={styles.debugButton}>
          <Text style={styles.debugButtonText}>Open state debug</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
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
  debugButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  debugButtonText: {
    color: colors.text,
    fontSize: typography.body,
  },
});
