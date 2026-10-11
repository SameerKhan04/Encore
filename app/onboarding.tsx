import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function OnboardingScreen() {
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);

  const onContinue = () => {
    completeOnboarding();
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      // Router may be unavailable outside a navigation tree (unit tests).
    }
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.tagline}>{brand.tagline}</Text>

      <View style={styles.steps}>
        <Text style={styles.step}>1. Sing a word or phrase from the challenge.</Text>
        <Text style={styles.step}>
          2. Your performance is transcribed into lyrics.
        </Text>
        <Text style={styles.step}>
          3. Your opponent picks the next challenge from those lyrics.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    gap: spacing.md,
  },
  brand: {
    fontSize: typography.brand,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.accent,
    textAlign: 'center',
  },
  tagline: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  steps: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  step: {
    fontSize: typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
