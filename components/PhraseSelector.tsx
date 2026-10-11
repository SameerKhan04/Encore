import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { hapticHeavy, hapticLight } from '@/services/haptics';
import {
  getSelectedPhrase,
  getSelectionWordCount,
  phraseMultiplier,
  reducePhraseSelection,
  type PhraseSelection,
} from '@/services/phraseSelection';

export type PassedChallenge = {
  phrase: string;
  wordCount: number;
  multiplier: number;
};

type PhraseSelectorProps = {
  words: readonly string[];
  onPassChallenge: (challenge: PassedChallenge) => void;
};

export function PhraseSelector({ words, onPassChallenge }: PhraseSelectorProps) {
  const [selection, setSelection] = useState<PhraseSelection>(null);

  const phrase = useMemo(
    () => getSelectedPhrase(words, selection),
    [words, selection],
  );
  const wordCount = getSelectionWordCount(selection);
  const multiplier = phraseMultiplier(wordCount);

  const onWordPress = (index: number) => {
    void hapticLight();
    setSelection((current) => reducePhraseSelection(current, index));
  };

  const onPass = () => {
    if (!selection || !phrase) {
      return;
    }
    void hapticHeavy();
    onPassChallenge({ phrase, wordCount, multiplier });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Tap a word, then expand left/right into a consecutive phrase.
      </Text>

      <View style={styles.transcript} accessibilityRole="text">
        {words.map((word, index) => {
          const selected =
            selection !== null &&
            index >= selection.start &&
            index <= selection.end;

          return (
            <Pressable
              key={`${word}-${index}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onWordPress(index)}
              style={[styles.wordChip, selected && styles.wordChipSelected]}
            >
              <Text style={[styles.wordText, selected && styles.wordTextSelected]}>
                {word}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Selected</Text>
        <Text testID="selected-phrase" style={styles.selectedPhrase}>
          {phrase || '—'}
        </Text>
      </View>

      <Text testID="phrase-multiplier" style={styles.multiplier}>
        {multiplier}x
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: wordCount === 0 }}
        disabled={wordCount === 0}
        onPress={onPass}
        style={[styles.passButton, wordCount === 0 && styles.passButtonDisabled]}
      >
        <Text style={styles.passButtonText}>Pass Challenge</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  transcript: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  wordChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  wordChipSelected: {
    backgroundColor: colors.accent,
  },
  wordText: {
    fontSize: typography.body,
    color: colors.text,
  },
  wordTextSelected: {
    color: colors.background,
    fontWeight: '700',
  },
  metaRow: {
    gap: spacing.xs,
  },
  metaLabel: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  selectedPhrase: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  multiplier: {
    fontSize: typography.title,
    color: colors.accent,
    fontWeight: '800',
  },
  passButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  passButtonDisabled: {
    opacity: 0.4,
  },
  passButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
