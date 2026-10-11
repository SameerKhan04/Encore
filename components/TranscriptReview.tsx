import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import {
  verifyLooksLikeLyrics,
  type LyricsVerifyResult,
} from '@/services/lyricsVerify';
import { containsChallengePhrase } from '@/services/transcription';

type TranscriptReviewProps = {
  initialText: string;
  challengePhrase: string;
  onConfirm: (editedText: string) => void;
  /** Injected for tests; defaults to Gemini soft verify. */
  verifyLyrics?: (text: string) => Promise<LyricsVerifyResult>;
};

export function TranscriptReview({
  initialText,
  challengePhrase,
  onConfirm,
  verifyLyrics = verifyLooksLikeLyrics,
}: TranscriptReviewProps) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  const onPressConfirm = async () => {
    if (checking) {
      return;
    }
    if (!containsChallengePhrase(text, challengePhrase)) {
      setError('Challenge phrase must appear in the lyrics');
      setSoftWarning(null);
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const verdict = await verifyLyrics(text);
      if (!verdict.looksLikeLyrics) {
        setSoftWarning(
          verdict.reason?.trim() ||
            "These might not look like song lyrics. You can edit or continue anyway.",
        );
        return;
      }
      setSoftWarning(null);
      onConfirm(text);
    } finally {
      setChecking(false);
    }
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
        onChangeText={(next) => {
          setText(next);
          setSoftWarning(null);
        }}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        editable={!checking}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {softWarning ? (
        <View style={styles.warningBox}>
          <Text style={styles.warning}>{softWarning}</Text>
          <View style={styles.warningActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSoftWarning(null);
                onConfirm(text);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Continue anyway</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSoftWarning(null);
              }}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onPressConfirm();
          }}
          style={styles.button}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.buttonText}>Confirm lyrics</Text>
          )}
        </Pressable>
      )}
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
  warningBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
  },
  warning: {
    color: colors.accent,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  warningActions: {
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
  secondaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
  editButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body,
  },
});
