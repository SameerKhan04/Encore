import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PhraseSelector, type PassedChallenge } from '@/components/PhraseSelector';
import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

export default function WordSelectionScreen() {
  const sendChallenge = useGameStore((s) => s.sendChallenge);
  const forceState = useGameStore((s) => s.forceState);
  const state = useGameStore((s) => s.state);
  const words = mockTranscribe().words;
  const [passed, setPassed] = useState<PassedChallenge | null>(null);

  const onPassChallenge = (challenge: PassedChallenge) => {
    setPassed(challenge);
    if (state !== 'WORD_SELECTION') {
      forceState('WORD_SELECTION');
    }
    sendChallenge();
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Pick their next challenge</Text>
      <Text style={styles.caption}>
        Phase 5 — consecutive phrase selection
      </Text>

      <PhraseSelector words={words} onPassChallenge={onPassChallenge} />

      {passed ? (
        <Text testID="passed-challenge" style={styles.passed}>
          {passed.phrase}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  passed: {
    marginTop: spacing.md,
    fontSize: typography.body,
    color: colors.accent,
    fontWeight: '700',
  },
});
