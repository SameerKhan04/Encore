import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhraseSelector } from '@/components/PhraseSelector';
import { Screen } from '@/components/Screen';
import { TranscriptReview } from '@/components/TranscriptReview';
import { colors, spacing, typography } from '@/constants/theme';
import type { AudioRecorder } from '@/services/audioRecorder';
import {
  createExpoAudioRecorder,
  isNativeAudioAvailable,
  requestAppMicrophonePermission,
} from '@/services/expoAudio';
import { hasGeminiApiKey, transcribe } from '@/services/transcription';
import { useGameStore } from '@/store/gameStore';
import { usePreferencesStore } from '@/store/preferencesStore';

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
  const applyPerformanceTranscript = useGameStore(
    (s) => s.applyPerformanceTranscript,
  );
  const confirmEditedTranscript = useGameStore((s) => s.confirmEditedTranscript);
  const passChallengeToOpponent = useGameStore((s) => s.passChallengeToOpponent);
  const handOffToOpponent = useGameStore((s) => s.handOffToOpponent);
  const completeMatch = useGameStore((s) => s.completeMatch);
  const reset = useGameStore((s) => s.reset);
  const demoMode = usePreferencesStore((s) => s.demoMode);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const [nativeReady, setNativeReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const geminiReady = hasGeminiApiKey();
  const canRecordLive = !demoMode && nativeReady && geminiReady;

  useEffect(() => {
    if (!isNativeAudioAvailable()) {
      setNativeReady(false);
      return;
    }
    try {
      recorderRef.current = createExpoAudioRecorder();
      setNativeReady(true);
    } catch {
      setNativeReady(false);
    }
  }, []);

  const startLiveRecording = async () => {
    setError(null);
    if (!recorderRef.current) {
      setError('Microphone not ready.');
      return;
    }
    const permission = await requestAppMicrophonePermission();
    if (permission === 'denied') {
      setError('Microphone permission denied.');
      return;
    }
    try {
      await recorderRef.current.start();
      setRecording(true);
    } catch {
      setError("We couldn't start recording. Try again.");
    }
  };

  const stopLiveRecording = async () => {
    setError(null);
    if (!recorderRef.current || processing) {
      return;
    }
    // Keep the Stop button mounted until apply finishes — swapping it for
    // Record mid-press can defer React state updates until the next tap.
    setProcessing(true);
    try {
      const uri = await recorderRef.current.stop();
      const result = await transcribe(uri, { demoMode: false });
      applyPerformanceTranscript(result.words);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We couldn't hear that clearly. Try again.";
      setError(message);
    } finally {
      setRecording(false);
      setProcessing(false);
    }
  };

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

      {state === 'PLAYER_SINGING' || state === 'PROCESSING_AUDIO' ? (
        <View style={styles.block}>
          {state === 'PROCESSING_AUDIO' || processing ? (
            <Text style={styles.caption}>Transcribing with Gemini…</Text>
          ) : null}
          {canRecordLive ? (
            recording || processing ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void stopLiveRecording();
                }}
                style={[styles.primaryButton, styles.stopButton]}
                disabled={processing}
              >
                <Text style={styles.primaryButtonText}>
                  {processing ? 'Transcribing…' : 'Stop & transcribe'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void startLiveRecording();
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Record & transcribe</Text>
              </Pressable>
            )
          ) : (
            <Text style={styles.caption}>
              {demoMode
                ? 'Demo Mode on — using mock lyrics.'
                : !geminiReady
                  ? 'Add EXPO_PUBLIC_GEMINI_API_KEY to .env, then reload.'
                  : 'Mic unavailable — using mock lyrics.'}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={recordDemoPerformance}
            style={styles.secondaryButton}
            disabled={recording || processing}
          >
            <Text style={styles.secondaryButtonText}>Demo sing (mock lyrics)</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : null}

      {state === 'PERFORMANCE_VERIFIED' ? (
        <View style={styles.block}>
          <Text style={styles.verified}>Performance verified</Text>
          <Text style={styles.caption}>{`+${lastPoints} points`}</Text>
          <TranscriptReview
            key={transcriptWords.join(' ')}
            initialText={transcriptWords.join(' ')}
            challengePhrase={challengePhrase}
            onConfirm={(edited) => {
              confirmEditedTranscript(edited);
            }}
          />
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
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: colors.danger,
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
  error: {
    color: colors.danger,
    fontSize: typography.caption,
  },
});
