import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { containsChallengePhrase } from '@/services/transcription';

type TranscriptReviewProps = {
  initialText: string;
  challengePhrase: string;
  onConfirm: (editedText: string) => void;
};

export function TranscriptReview({
  initialText,
  challengePhrase,
  onConfirm,
}: TranscriptReviewProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  const onPressConfirm = () => {
    if (!containsChallengePhrase(text, challengePhrase)) {
      setError('Challenge phrase must appear in the lyrics');
      return;
    }
    setError(null);
    onConfirm(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Review & edit lyrics</Text>
      <Text style={styles.hint}>
        {`Challenge phrase required: “${challengePhrase}”`}
      </Text>
      <TextInput
        accessibilityLabel="Transcript editor"
        multiline
        value={text}
        onChangeText={setText}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPressConfirm}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Confirm lyrics</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  input: {
    minHeight: 120,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: typography.body,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
