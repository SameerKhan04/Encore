import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { areLabRoutesEnabled } from '@/services/labRoutes';
import { GAME_STATES, useGameStore } from '@/store/gameStore';

export default function DebugGameScreen() {
  const state = useGameStore((s) => s.state);
  const forceState = useGameStore((s) => s.forceState);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    if (!areLabRoutesEnabled()) {
      router.replace('/(tabs)');
    }
  }, []);

  if (!areLabRoutesEnabled()) {
    return null;
  }

  return (
    <Screen style={styles.screen}>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Game State Debug</Text>
      <Text style={styles.stateLabel} testID="game-state-label">
        {`State: ${state}`}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={reset}
        style={[styles.button, styles.resetButton]}
      >
        <Text style={styles.buttonText}>Reset</Text>
      </Pressable>

      <View style={styles.list}>
        {GAME_STATES.map((gameState) => (
          <Pressable
            key={gameState}
            accessibilityRole="button"
            onPress={() => forceState(gameState)}
            style={[
              styles.button,
              state === gameState && styles.activeButton,
            ]}
          >
            <Text style={styles.buttonText}>Force {gameState}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
  },
  container: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stateLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  activeButton: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resetButton: {
    backgroundColor: colors.danger,
    marginBottom: spacing.md,
  },
  buttonText: {
    color: colors.text,
    fontSize: typography.body,
  },
});
