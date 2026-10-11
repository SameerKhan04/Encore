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
import {
  MOCK_LYRIC_BLOCK,
  mockTranscribe,
} from '@/services/mockTranscription';
import { usePreferencesStore } from '@/store/preferencesStore';

type LabStatus = 'idle' | 'recording' | 'processing' | 'ready' | 'denied';

export default function AudioLabScreen() {
  const demoMode = usePreferencesStore((s) => s.demoMode);
  const setDemoMode = usePreferencesStore((s) => s.setDemoMode);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [status, setStatus] = useState<LabStatus>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeReady, setNativeReady] = useState(false);

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
    setError(null);

    try {
      setStatus('processing');
      const recordingUri =
        demoMode || !recorderRef.current
          ? 'demo://mock-recording'
          : await recorderRef.current.stop();
      setUri(recordingUri);
      const result = mockTranscribe(recordingUri);
      setTranscript(result.text);
      setStatus('ready');
    } catch {
      setError("We couldn't hear that clearly. Try again.");
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
        Phase 4 — mic capture + mock transcription
      </Text>
      {demoMode ? (
        <Text style={styles.badge}>Demo/Mock Mode</Text>
      ) : null}

      <Text style={styles.status}>{`Status: ${status}`}</Text>

      <View style={styles.actions}>
        {status === 'recording' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void stopRecording();
            }}
            style={[styles.button, styles.stopButton]}
          >
            <Text style={styles.buttonText}>Stop recording</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void startRecording();
            }}
            style={styles.button}
            disabled={status === 'processing'}
          >
            <Text style={styles.buttonText}>Start recording</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uri ? <Text style={styles.meta}>{`URI: ${uri}`}</Text> : null}
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.label}>Mock transcript</Text>
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
    justifyContent: 'center',
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
