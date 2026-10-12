import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { TranscriptReview } from '@/components/TranscriptReview';
import {
  TurnTimers,
  remainingMs,
  shouldShowSingTimer,
} from '@/components/TurnTimers';
import { WordPicker } from '@/components/WordPicker';
import { colors, spacing, typography } from '@/constants/theme';
import type { AudioRecorder } from '@/services/audioRecorder';
import {
  createAppVoiceSession,
  voiceTransportLabel,
} from '@/services/appVoice';
import {
  createExpoAudioRecorder,
  isNativeAudioAvailable,
  requestAppMicrophonePermission,
} from '@/services/expoAudio';
import {
  canRecordLive as canRecordLiveNow,
  liveRecordBlockReason,
} from '@/services/liveRecordAvailability';
import { prepareMatchAudioRoute } from '@/services/matchAudioRoute';
import {
  syncVoiceMuteFromGame,
  type VoiceSession,
} from '@/services/matchVoice';

function RemoteVoiceView({ streamUrl }: { streamUrl: string }) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RTCView } = require('react-native-webrtc') as {
      RTCView: React.ComponentType<{
        streamURL: string;
        style?: object;
        objectFit?: string;
      }>;
    };
    return (
      <RTCView
        streamURL={streamUrl}
        objectFit="cover"
        style={styles.hiddenRemoteAudio}
      />
    );
  } catch {
    return null;
  }
}
import { isLocalPlayersTurn } from '@/services/onlineSync';
import { hasGeminiApiKey, transcribe } from '@/services/transcription';
import { canStopSingRecording } from '@/services/singRecording';
import {
  SING_MAX_MS,
  SING_MIN_MS,
  useGameStore,
} from '@/store/gameStore';
import { useOnlineStore } from '@/store/onlineStore';

export default function OnlineScreen() {
  const status = useOnlineStore((s) => s.status);
  const inviteCode = useOnlineStore((s) => s.inviteCode);
  const role = useOnlineStore((s) => s.role);
  const matchId = useOnlineStore((s) => s.matchId);
  const playerId = useOnlineStore((s) => s.playerId);
  const guestJoined = useOnlineStore((s) => s.guestJoined);
  const error = useOnlineStore((s) => s.error);
  const remoteSnapshot = useOnlineStore((s) => s.remoteSnapshot);
  const createRoom = useOnlineStore((s) => s.createRoom);
  const joinRoom = useOnlineStore((s) => s.joinRoom);
  const leaveRoom = useOnlineStore((s) => s.leaveRoom);
  const publishLocalSnapshot = useOnlineStore((s) => s.publishLocalSnapshot);

  const state = useGameStore((s) => s.state);
  const activePlayer = useGameStore((s) => s.activePlayer);
  const challengePhrase = useGameStore((s) => s.challengePhrase);
  const transcriptWords = useGameStore((s) => s.transcriptWords);
  const scores = useGameStore((s) => s.scores);
  const lastPoints = useGameStore((s) => s.lastPoints);
  const thinkDeadlineAt = useGameStore((s) => s.thinkDeadlineAt);
  const countdownEndsAt = useGameStore((s) => s.countdownEndsAt);
  const singStartedAt = useGameStore((s) => s.singStartedAt);
  const startPartyMatch = useGameStore((s) => s.startPartyMatch);
  const beginThinkPhase = useGameStore((s) => s.beginThinkPhase);
  const beginCountdown = useGameStore((s) => s.beginCountdown);
  const failThinkTimeout = useGameStore((s) => s.failThinkTimeout);
  const recordDemoPerformance = useGameStore((s) => s.recordDemoPerformance);
  const applyPerformanceTranscript = useGameStore(
    (s) => s.applyPerformanceTranscript,
  );
  const pickingPlayer = useGameStore((s) => s.pickingPlayer);
  const confirmEditedTranscript = useGameStore((s) => s.confirmEditedTranscript);
  const opponentSelectWord = useGameStore((s) => s.opponentSelectWord);
  const handOffToOpponent = useGameStore((s) => s.handOffToOpponent);
  const completeMatch = useGameStore((s) => s.completeMatch);
  const resetGame = useGameStore((s) => s.reset);
  const applyRemoteSnapshot = useGameStore((s) => s.applyRemoteSnapshot);
  const takePublishableSnapshot = useGameStore((s) => s.takePublishableSnapshot);

  const [joinCode, setJoinCode] = useState('');
  const recorderRef = useRef<AudioRecorder | null>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const maxStopFiredRef = useRef(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const geminiReady = hasGeminiApiKey();
  // Online play ignores preferences demoMode so the opponent always gets Record
  // when the device supports it (Demo Mode was hiding the button after Audio Lab).
  const canRecordLive = canRecordLiveNow({ nativeReady, geminiReady });
  const recordBlockReason = liveRecordBlockReason({ nativeReady, geminiReady });
  const busy = status === 'creating' || status === 'joining';
  const inMatch = status === 'ready' && state !== 'IDLE';
  const myTurn =
    role !== null && isLocalPlayersTurn(role, activePlayer);
  const localSeat = role === 'host' ? 'A' : role === 'guest' ? 'B' : null;
  const myPick = localSeat !== null && pickingPlayer === localSeat;
  const canStop = canStopSingRecording({
    singStartedAt,
    now,
  });

  const publish = async () => {
    const snapshot = takePublishableSnapshot();
    await publishLocalSnapshot(snapshot);
  };

  useEffect(() => {
    if (!remoteSnapshot) {
      return;
    }
    applyRemoteSnapshot(remoteSnapshot);
  }, [remoteSnapshot, applyRemoteSnapshot]);

  useEffect(() => {
    if (status !== 'opponentLeft') {
      return;
    }
    void voiceRef.current?.disconnect();
    voiceRef.current = null;
    setVoiceConnected(false);
    setRemoteStreamUrl(null);
  }, [status]);

  const ensureRecorder = () => {
    if (recorderRef.current) {
      setNativeReady(true);
      return true;
    }
    if (!isNativeAudioAvailable()) {
      setNativeReady(false);
      return false;
    }
    try {
      recorderRef.current = createExpoAudioRecorder();
      setNativeReady(true);
      return true;
    } catch {
      setNativeReady(false);
      return false;
    }
  };

  useEffect(() => {
    ensureRecorder();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !matchId || !playerId || !role) {
      return;
    }
    let cancelled = false;
    const voice = createAppVoiceSession({
      isOfferer: role === 'host',
      onRemoteStreamUrl: (url) => {
        if (!cancelled) {
          setRemoteStreamUrl(url);
        }
      },
    });
    voiceRef.current = voice;
    void (async () => {
      await prepareMatchAudioRoute();
      if (cancelled) {
        return;
      }
      await voice.connect({ matchId, localPlayerId: playerId });
      if (cancelled) {
        return;
      }
      setVoiceConnected(true);
      if (localSeat) {
        syncVoiceMuteFromGame(voice, {
          state: useGameStore.getState().state,
          localSeat,
          activePlayer: useGameStore.getState().activePlayer,
        });
        setVoiceMuted(voice.outgoingMuted);
      }
    })();
    return () => {
      cancelled = true;
      void voice.disconnect();
      voiceRef.current = null;
      setVoiceConnected(false);
      setVoiceMuted(false);
      setRemoteStreamUrl(null);
    };
  }, [status, matchId, playerId, role, localSeat]);

  useEffect(() => {
    const voice = voiceRef.current;
    if (!voice || !localSeat || voice.status !== 'connected') {
      return;
    }
    syncVoiceMuteFromGame(voice, { state, localSeat, activePlayer });
    setVoiceMuted(voice.outgoingMuted);
  }, [state, localSeat, activePlayer]);

  useEffect(() => {
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      const game = useGameStore.getState();
      if (game.state === 'PLAYER_PREPARING') {
        game.failThinkTimeout(tick);
      } else if (
        game.state === 'PLAYER_COUNTDOWN' &&
        game.countdownEndsAt != null &&
        tick >= game.countdownEndsAt
      ) {
        maxStopFiredRef.current = false;
        game.startTimedSinging(tick);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Re-check mic when this seat becomes the active singer (e.g. after handoff).
  useEffect(() => {
    if (myTurn && state === 'PLAYER_SINGING') {
      ensureRecorder();
    }
  }, [myTurn, state]);

  const leave = () => {
    void voiceRef.current?.disconnect();
    voiceRef.current = null;
    setVoiceConnected(false);
    setVoiceMuted(false);
    setRemoteStreamUrl(null);
    void leaveRoom().then(() => {
      resetGame();
      setRecording(false);
      setProcessing(false);
      setRecordError(null);
    });
  };

  const startOnlineMatch = async () => {
    startPartyMatch();
    await publish();
  };

  const startLiveRecording = async () => {
    setRecordError(null);
    if (!recorderRef.current) {
      setRecordError('Microphone not ready.');
      return;
    }
    const permission = await requestAppMicrophonePermission();
    if (permission === 'denied') {
      setRecordError('Microphone permission denied.');
      return;
    }
    try {
      await recorderRef.current.start();
      setRecording(true);
    } catch {
      setRecordError("We couldn't start recording. Try again.");
    }
  };

  const stopLiveRecording = async () => {
    setRecordError(null);
    if (!recorderRef.current || processing) {
      return;
    }
    setProcessing(true);
    try {
      const uri = await recorderRef.current.stop();
      const result = await transcribe(uri, { demoMode: false });
      applyPerformanceTranscript(result.words);
      await publish();
    } catch (err) {
      setRecordError(
        err instanceof Error
          ? err.message
          : "We couldn't hear that clearly. Try again.",
      );
    } finally {
      setRecording(false);
      setProcessing(false);
    }
  };

  // Auto-start capture when the sing window begins.
  useEffect(() => {
    if (
      !myTurn ||
      state !== 'PLAYER_SINGING' ||
      !canRecordLive ||
      recording ||
      processing
    ) {
      return;
    }
    void startLiveRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, myTurn, canRecordLive]);

  // At 40s: stop+transcribe if recording, otherwise advance the FSM (demo path).
  useEffect(() => {
    if (
      !myTurn ||
      state !== 'PLAYER_SINGING' ||
      singStartedAt == null ||
      maxStopFiredRef.current
    ) {
      return;
    }
    if (now - singStartedAt < SING_MAX_MS) {
      return;
    }
    maxStopFiredRef.current = true;
    if (recording && !processing) {
      void stopLiveRecording();
    } else if (!recording && !processing) {
      useGameStore.getState().autoStopSingMax(Date.now());
      void publish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state, singStartedAt, recording, processing, myTurn]);

  if (status === 'opponentLeft') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Online Match</Text>
        <Text style={styles.error}>Opponent left</Text>
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </Screen>
    );
  }

  if (status === 'idle' || status === 'error') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Online Match</Text>
        <Text style={styles.caption}>
          Create a room and share the invite code, or join a friend across the
          world.
        </Text>
        <View style={styles.block}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void createRoom();
            }}
            style={styles.primaryButton}
            disabled={busy}
          >
            <Text style={styles.primaryButtonText}>Create match</Text>
          </Pressable>
          <Text style={styles.label}>Have a code?</Text>
          <TextInput
            accessibilityLabel="Invite code"
            autoCapitalize="characters"
            autoCorrect={false}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="ABC123"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void joinRoom(joinCode);
            }}
            style={styles.secondaryButton}
            disabled={busy || !joinCode.trim()}
          >
            <Text style={styles.secondaryButtonText}>Join match</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </Screen>
    );
  }

  if (status === 'waiting' || status === 'creating') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Online Match</Text>
        <Text style={styles.label}>Your invite code</Text>
        <Text style={styles.code}>{inviteCode ?? '…'}</Text>
        <Text style={styles.caption}>Waiting for opponent…</Text>
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </Screen>
    );
  }

  if (status === 'joining') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Online Match</Text>
        <Text style={styles.caption}>Joining match…</Text>
      </Screen>
    );
  }

  // status === 'ready'
  if (!inMatch) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Online Match</Text>
        <Text style={styles.ready}>Match ready</Text>
        <Text style={styles.caption}>
          {`You are ${role === 'host' ? 'Player A (host)' : 'Player B (guest)'}`}
        </Text>
        <Text style={styles.caption}>{`Code: ${inviteCode}`}</Text>
        {role === 'host' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void startOnlineMatch();
            }}
            style={styles.primaryButton}
            disabled={!guestJoined}
          >
            <Text style={styles.primaryButtonText}>Start online match</Text>
          </Pressable>
        ) : (
          <Text style={styles.caption}>
            Waiting for the host to start the match…
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Leave match</Text>
        </Pressable>
      </Screen>
    );
  }

  if (state === 'MATCH_COMPLETE') {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.title}>Match complete</Text>
        <Text style={styles.scores}>{`A ${scores.A} · B ${scores.B}`}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={leave}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Back to lobby</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Online Match</Text>
      <Text style={styles.player}>
        {`You are Player ${role === 'host' ? 'A' : 'B'} · Active: ${activePlayer}`}
      </Text>
      <Text style={styles.challenge}>{`Challenge: ${challengePhrase}`}</Text>
      <Text style={styles.caption}>{`State: ${state}`}</Text>
      <Text style={styles.scores}>{`Score A ${scores.A} · B ${scores.B}`}</Text>
      {voiceConnected ? (
        <Text testID="voice-status" style={styles.caption}>
          {voiceMuted
            ? 'Voice: listening (your mic muted)'
            : voiceTransportLabel() === 'live'
              ? remoteStreamUrl
                ? 'Voice: live'
                : 'Voice: connecting audio…'
              : 'Voice: stub — use the Encore APK + reload JS for real audio'}
        </Text>
      ) : null}
      {remoteStreamUrl ? <RemoteVoiceView streamUrl={remoteStreamUrl} /> : null}

      {!myTurn ? (
        <Text style={styles.waiting}>
          {`Waiting for Player ${activePlayer}…`}
        </Text>
      ) : null}

      {myTurn && state === 'PLAYER_PREPARING' && thinkDeadlineAt != null ? (
        <TurnTimers
          mode="think"
          remainingMs={remainingMs(thinkDeadlineAt, now)}
          onExpired={() => {
            failThinkTimeout(Date.now());
            void publish();
          }}
        />
      ) : null}

      {myTurn && state === 'PLAYER_COUNTDOWN' && countdownEndsAt != null ? (
        <TurnTimers
          mode="countdown"
          remainingMs={remainingMs(countdownEndsAt, now)}
        />
      ) : null}

      {myTurn &&
      shouldShowSingTimer({ state, processing }) &&
      singStartedAt != null ? (
        <TurnTimers
          mode="sing"
          elapsedMs={Math.max(0, now - singStartedAt)}
          minMs={SING_MIN_MS}
          maxMs={SING_MAX_MS}
        />
      ) : null}

      {myTurn && state === 'ROUND_START' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            beginThinkPhase(Date.now());
            void publish();
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>I'm ready</Text>
        </Pressable>
      ) : null}

      {myTurn && state === 'PLAYER_PREPARING' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            beginCountdown(Date.now());
            void publish();
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Start singing</Text>
        </Pressable>
      ) : null}

      {myTurn && state === 'PLAYER_SINGING' ? (
        <View style={styles.block}>
          {canRecordLive ? (
            recording || processing ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!canStop) {
                    return;
                  }
                  void stopLiveRecording();
                }}
                style={[styles.primaryButton, styles.stopButton]}
                disabled={processing || !canStop}
              >
                <Text style={styles.primaryButtonText}>
                  {processing
                    ? 'Transcribing…'
                    : canStop
                      ? 'Stop & transcribe'
                      : 'Keep singing…'}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.caption}>Recording starts automatically…</Text>
            )
          ) : (
            <Text style={styles.caption}>{recordBlockReason}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              recordDemoPerformance();
              void publish();
            }}
            style={styles.secondaryButton}
            disabled={recording || processing}
          >
            <Text style={styles.secondaryButtonText}>Demo sing (mock lyrics)</Text>
          </Pressable>
          {recordError ? <Text style={styles.error}>{recordError}</Text> : null}
        </View>
      ) : null}

      {myTurn && state === 'PERFORMANCE_VERIFIED' ? (
        <View style={styles.block}>
          <Text style={styles.verified}>Performance verified</Text>
          <Text style={styles.caption}>{`+${lastPoints} points`}</Text>
          <TranscriptReview
            key={transcriptWords.join(' ')}
            initialText={transcriptWords.join(' ')}
            challengePhrase={challengePhrase}
            onConfirm={(edited) => {
              confirmEditedTranscript(edited);
              void publish();
            }}
          />
        </View>
      ) : null}

      {state === 'WORD_SELECTION' && myPick ? (
        <WordPicker
          words={transcriptWords}
          onSelectWord={(word) => {
            opponentSelectWord(word);
            void publish();
          }}
        />
      ) : null}

      {state === 'WORD_SELECTION' && !myPick ? (
        <Text style={styles.waiting}>
          Waiting for opponent to pick a challenge word…
        </Text>
      ) : null}

      {myTurn && state === 'CHALLENGE_SENT' ? (
        <View style={styles.block}>
          <Text style={styles.caption}>
            Challenge locked. Hand off to your opponent online.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              handOffToOpponent();
              void publish();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Send to opponent</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              completeMatch();
              void publish();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>End match</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={leave}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Leave match</Text>
      </Pressable>
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
  block: {
    gap: spacing.md,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  code: {
    fontSize: typography.brand,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.accent,
  },
  ready: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.accent,
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
  waiting: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  verified: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.body,
    letterSpacing: 2,
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
  // Zero-size sink so Android actually plays remote WebRTC audio.
  hiddenRemoteAudio: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
});
