import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { MicDeniedFallback } from '@/components/MicDeniedFallback';
import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import type { AudioRecorder } from '@/services/audioRecorder';
import {
  createExpoAudioRecorder,
  isNativeAudioAvailable,
  requestAppMicrophonePermission,
} from '@/services/expoAudio';
import { MOCK_LYRIC_BLOCK } from '@/services/mockTranscription';
import { hasGeminiApiKey, transcribe } from '@/services/transcription';
import { usePreferencesStore } from '@/store/preferencesStore';

type LabStatus = 'idle' | 'recording' | 'processing' | 'ready' | 'denied';

export default function AudioLabScreen() {
  const demoMode = usePreferencesStore((s) => s.demoMode);
  const setDemoMode = usePreferencesStore((s) => s.setDemoMode);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [status, setStatus] = useState<LabStatus>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [source, setSource] = useState<'gemini' | 'mock' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeReady, setNativeReady] = useState(false);
  const geminiReady = hasGeminiApiKey();

  useEffect(() => {
    if (!isNativeAudioAvailable()) {
      setDemoMode(true);
      setNativeReady(false);
      return;
    }

    try {
      recorderRef.current = createExpoAudioRecorder();
      setNativeReady(true);
    } catch {
      setDemoMode(true);
      setNativeReady(false);
    }
  }, [setDemoMode]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const startRecording = async () => {
    setError(null);

    if (demoMode || !nativeReady || !recorderRef.current) {
      setStatus('recording');
      return;
    }

    const permission = await requestAppMicrophonePermission();
    if (permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      await recorderRef.current.start();
      setStatus('recording');
    } catch {
      setError("We couldn't hear that clearly. Try again.");
      setStatus('idle');
    }
  };

  const stopRecording = async () => {
    if (status === 'processing') {
      return;
    }
    setError(null);
    // Stay on the Stop control until transcription finishes — swapping to Start
    // mid-press can defer setState until the next tap on RN.
    setStatus('processing');

    try {
      const recordingUri =
        demoMode || !recorderRef.current
          ? 'demo://mock-recording'
          : await recorderRef.current.stop();
      const useMock = demoMode || !geminiReady;
      const result = await transcribe(recordingUri, { demoMode: useMock });
      setUri(recordingUri);
      setTranscript(result.text);
      setSource(useMock ? 'mock' : 'gemini');
      setStatus('ready');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "We couldn't hear that clearly. Try again.";
      setError(message);
      setStatus('idle');
    }
  };

  if (status === 'denied' && !demoMode) {
    return <MicDeniedFallback onOpenSettings={openSettings} />;
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Audio Lab</Text>
      <Text style={styles.caption}>
        Mic capture + Gemini transcription (mock when Demo Mode / no key)
      </Text>
      {demoMode ? (
        <Text style={styles.badge}>Demo/Mock Mode</Text>
      ) : null}
      {!demoMode && !geminiReady ? (
        <Text style={styles.badge}>No Gemini key — using mock</Text>
      ) : null}
      {!demoMode && geminiReady ? (
        <Text style={styles.badgeReady}>Gemini key loaded</Text>
      ) : null}

      <Text style={styles.status}>{`Status: ${status}`}</Text>

      <View style={styles.actions}>
        {status === 'recording' || status === 'processing' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void stopRecording();
            }}
            style={[styles.button, styles.stopButton]}
            disabled={status === 'processing'}
          >
            <Text style={styles.buttonText}>
              {status === 'processing' ? 'Transcribing…' : 'Stop recording'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void startRecording();
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start recording</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uri ? <Text style={styles.meta}>{`URI: ${uri}`}</Text> : null}
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.label}>
            {source === 'gemini' ? 'Gemini transcript' : 'Mock transcript'}
          </Text>
          <Text style={styles.transcript}>{transcript}</Text>
          <Link href="/word-selection" asChild>
            <Pressable accessibilityRole="button" style={styles.button}>
              <Text style={styles.buttonText}>Select challenge phrase</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <Text style={styles.meta}>Expected mock lyrics: {MOCK_LYRIC_BLOCK}</Text>
      )}
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
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    color: colors.accent,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  badgeReady: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    color: colors.accent,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  status: {
    fontSize: typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: typography.body,
  },
  error: {
    color: colors.danger,
    fontSize: typography.body,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  transcriptBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body,
  },
  transcript: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
