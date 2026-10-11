import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhraseSelector } from '@/components/PhraseSelector';
import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

export default function PartyScreen() {
  const state = useGameStore((s) => s.state);
  const activePlayer = useGameStore((s) => s.activePlayer);
  const challengePhrase = useGameStore((s) => s.challengePhrase);
  const transcriptWords = useGameStore((s) => s.transcriptWords);
  const scores = useGameStore((s) => s.scores);
  const lastPoints = useGameStore((s) => s.lastPoints);
  const startPartyMatch = useGameStore((s) => s.startPartyMatch);
  const beginPreparing = useGameStore((s) => s.beginPreparing);
  const startSinging = useGameStore((s) => s.startSinging);
  const recordDemoPerformance = useGameStore((s) => s.recordDemoPerformance);
  const beginWordSelection = useGameStore((s) => s.beginWordSelection);
  const passChallengeToOpponent = useGameStore((s) => s.passChallengeToOpponent);
  const handOffToOpponent = useGameStore((s) => s.handOffToOpponent);
  const completeMatch = useGameStore((s) => s.completeMatch);
  const reset = useGameStore((s) => s.reset);

  if (state === 'IDLE') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Party Mode</Text>
        <Text style={styles.caption}>
          Pass-and-play offline — one device, two singers.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={startPartyMatch}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Start Party Match</Text>
        </Pressable>
      </Screen>
    );
  }

  if (state === 'MATCH_COMPLETE') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Match complete</Text>
        <Text testID="final-scores" style={styles.scores}>
          {`A ${scores.A} · B ${scores.B}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={reset}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Back to lobby</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Party Mode</Text>
      <Text testID="active-player" style={styles.player}>
        {`Player ${activePlayer}`}
      </Text>
      <Text style={styles.challenge}>{`Challenge: ${challengePhrase}`}</Text>
      <Text style={styles.caption}>{`State: ${state}`}</Text>
      <Text style={styles.scores}>{`Score A ${scores.A} · B ${scores.B}`}</Text>

      {state === 'ROUND_START' || state === 'PLAYER_PREPARING' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (state === 'ROUND_START') {
              beginPreparing();
            }
            startSinging();
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>I'm ready</Text>
        </Pressable>
      ) : null}

      {state === 'PLAYER_SINGING' ? (
        <Pressable
          accessibilityRole="button"
          onPress={recordDemoPerformance}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Demo sing</Text>
        </Pressable>
      ) : null}

      {state === 'PERFORMANCE_VERIFIED' ? (
        <View style={styles.block}>
          <Text style={styles.verified}>Performance verified</Text>
          <Text style={styles.caption}>{`+${lastPoints} points`}</Text>
          <Text style={styles.lyrics}>{transcriptWords.join(' ')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={beginWordSelection}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Pick challenge phrase</Text>
          </Pressable>
        </View>
      ) : null}

      {state === 'WORD_SELECTION' ? (
        <PhraseSelector
          words={transcriptWords}
          onPassChallenge={({ phrase, multiplier }) => {
            passChallengeToOpponent(phrase, multiplier);
          }}
        />
      ) : null}

      {state === 'CHALLENGE_SENT' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>
            Challenge locked. Pass the device to the other player.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handOffToOpponent}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Hand device to opponent</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={completeMatch}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>End match</Text>
          </Pressable>
        </View>
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
  player: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  challenge: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  scores: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  block: {
    gap: spacing.md,
  },
  verified: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  lyrics: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body,
  },
});
