import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { WordPicker } from '@/components/WordPicker';
import { colors, spacing, typography } from '@/constants/theme';
import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

export default function WordSelectionScreen() {
  const opponentSelectWord = useGameStore((s) => s.opponentSelectWord);
  const words = mockTranscribe().words;
  const [passed, setPassed] = useState<string | null>(null);

  const onSelectWord = (word: string) => {
    setPassed(word);
    opponentSelectWord(word);
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Pick their next challenge</Text>
      <Text style={styles.caption}>
        Opponent picks one word — it can appear anywhere in the next lyrics.
      </Text>

      <WordPicker words={words} onSelectWord={onSelectWord} />

      {passed ? (
        <Text testID="passed-challenge" style={styles.passed}>
          {passed}
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
