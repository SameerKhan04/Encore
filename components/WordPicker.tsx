import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { hapticHeavy, hapticLight } from '@/services/haptics';

type WordPickerProps = {
  words: readonly string[];
  onSelectWord: (word: string) => void;
};

export function WordPicker({ words, onSelectWord }: WordPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedWord =
    selectedIndex !== null ? words[selectedIndex] ?? null : null;

  const onWordPress = (index: number) => {
    void hapticLight();
    setSelectedIndex(index);
  };

  const onSend = () => {
    if (!selectedWord) {
      return;
    }
    void hapticHeavy();
    onSelectWord(selectedWord);
  };

  return (
    <View style={styles.container}>
      <Text testID="word-picker-hint" style={styles.hint}>
        Pick one word from their lyrics — it can appear anywhere next turn.
      </Text>

      <View style={styles.transcript} accessibilityRole="text">
        {words.map((word, index) => {
          const selected = selectedIndex === index;
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
        <Text testID="selected-word" style={styles.selectedWord}>
          {selectedWord || '—'}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !selectedWord }}
        disabled={!selectedWord}
        onPress={onSend}
        style={[styles.sendButton, !selectedWord && styles.sendButtonDisabled]}
      >
        <Text style={styles.sendButtonText}>Send challenge</Text>
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
  selectedWord: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
