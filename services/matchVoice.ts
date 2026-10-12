import { buildIceServers } from '@/services/iceServers';
import type { VoiceSignaling } from '@/services/voiceSignaling';
import type { GameState, PlayerId } from '@/store/gameStore';

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type VoiceSession = {
  status: VoiceStatus;
  outgoingMuted: boolean;
  incomingMuted: boolean;
  connect: (opts: {
    matchId: string;
    localPlayerId: string;
  }) => Promise<void>;
  disconnect: () => Promise<void>;
  setOutgoingMuted: (muted: boolean) => void;
  setIncomingMuted: (muted: boolean) => void;
};

export type WebRtcMediaStream = {
  getTracks: () => Array<{
    kind: string;
    enabled: boolean;
    stop: () => void;
  }>;
};

export type WebRtcPeerConnection = {
  onicecandidate: null | ((ev: { candidate: unknown }) => void);
  ontrack: null | ((ev: { streams: unknown[]; track?: { kind: string; enabled: boolean } }) => void);
  createOffer: () => Promise<{ type: string; sdp: string }>;
  createAnswer: () => Promise<{ type: string; sdp: string }>;
  setLocalDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  setRemoteDescription: (desc: { type: string; sdp: string }) => Promise<void>;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  addTrack: (track: unknown, stream: WebRtcMediaStream) => unknown;
  getSenders: () => Array<{ track: { kind: string; enabled: boolean } | null }>;
  getReceivers?: () => Array<{ track: { kind: string; enabled: boolean } | null }>;
  close: () => void;
};

export type WebRtcAdapter = {
  createPeerConnection: () => WebRtcPeerConnection;
  getUserMedia: () => Promise<WebRtcMediaStream>;
};

const SING_MUTE_STATES: readonly GameState[] = [
  'PLAYER_COUNTDOWN',
  'PLAYER_SINGING',
  'PROCESSING_AUDIO',
];

/**
 * Mute local outbound only while the opponent is in a sing window —
 * so the peer can hear the singer live, and the listener does not talk over.
 */
export function shouldMuteLocalVoice(opts: {
  state: GameState;
  localSeat: PlayerId;
  activePlayer: PlayerId;
}): boolean {
  if (!SING_MUTE_STATES.includes(opts.state)) {
    return false;
  }
  return opts.activePlayer !== opts.localSeat;
}

/** Singer should not hear the opponent during their performance window. */
export function shouldMuteIncomingVoice(opts: {
  state: GameState;
  localSeat: PlayerId;
  activePlayer: PlayerId;
}): boolean {
  if (!SING_MUTE_STATES.includes(opts.state)) {
    return false;
  }
  return opts.activePlayer === opts.localSeat;
}

export function syncVoiceMuteFromGame(
  voice: VoiceSession,
  opts: {
    state: GameState;
    localSeat: PlayerId;
    activePlayer: PlayerId;
  },
): void {
  if (voice.status !== 'connected') {
    return;
  }
  voice.setOutgoingMuted(shouldMuteLocalVoice(opts));
  voice.setIncomingMuted(shouldMuteIncomingVoice(opts));
}

function serializeIceCandidate(candidate: unknown): Record<string, unknown> | null {
  if (candidate == null) {
    return null;
  }
  if (typeof candidate === 'object' && candidate !== null && 'toJSON' in candidate) {
    const json = (candidate as { toJSON: () => Record<string, unknown> }).toJSON();
    return json;
  }
  if (typeof candidate === 'object') {
    return candidate as Record<string, unknown>;
  }
  return { candidate: String(candidate) };
}

/**
 * In-memory voice session for tests / Expo Go without native WebRTC.
 */
export function createMemoryVoiceSession(): VoiceSession {
  const session: VoiceSession = {
    status: 'idle',
    outgoingMuted: false,
    incomingMuted: false,
    connect: async () => {
      session.status = 'connected';
      session.outgoingMuted = false;
      session.incomingMuted = false;
    },
    disconnect: async () => {
      session.status = 'idle';
      session.outgoingMuted = false;
      session.incomingMuted = false;
    },
    setOutgoingMuted: (muted) => {
      session.outgoingMuted = muted;
    },
    setIncomingMuted: (muted) => {
      session.incomingMuted = muted;
    },
  };
  return session;
}

export function isWebRtcNativeAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react-native-webrtc');
    return true;
  } catch {
    return false;
  }
}

export function createNativeWebRtcAdapter(): WebRtcAdapter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webrtc = require('react-native-webrtc') as {
      registerGlobals?: () => void;
      RTCPeerConnection: new (config?: object) => WebRtcPeerConnection;
      mediaDevices: {
        getUserMedia: (constraints: object) => Promise<WebRtcMediaStream>;
      };
    };
    webrtc.registerGlobals?.();
    return {
      createPeerConnection: () =>
        new webrtc.RTCPeerConnection({
          iceServers: buildIceServers(),
        }),
      getUserMedia: () =>
        webrtc.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        }),
    };
  } catch {
    return null;
  }
}

type WebRtcSessionOpts = {
  signaling: VoiceSignaling;
  rtc: WebRtcAdapter;
  isOfferer: boolean;
  /** Called when a remote media stream URL is ready (for RTCView playback). */
  onRemoteStreamUrl?: (url: string | null) => void;
};

/** Peer voice session over injectable RTC + signaling (testable without native). */
export function createWebRtcVoiceSession(
  opts: WebRtcSessionOpts,
): VoiceSession {
  let pc: WebRtcPeerConnection | null = null;
  let localStream: WebRtcMediaStream | null = null;
  let remoteTracks: Array<{ kind: string; enabled: boolean }> = [];
  let unsubscribe: (() => void) | null = null;
  let matchId = '';
  let localPlayerId = '';
  const pendingIce: unknown[] = [];

  const applyIncomingMute = (muted: boolean) => {
    for (const track of remoteTracks) {
      if (track.kind === 'audio') {
        track.enabled = !muted;
      }
    }
    for (const receiver of pc?.getReceivers?.() ?? []) {
      if (receiver.track?.kind === 'audio') {
        receiver.track.enabled = !muted;
      }
    }
  };

  const session: VoiceSession = {
    status: 'idle',
    outgoingMuted: false,
    incomingMuted: false,

    connect: async (connectOpts) => {
      matchId = connectOpts.matchId;
      localPlayerId = connectOpts.localPlayerId;
      session.status = 'connecting';

      localStream = await opts.rtc.getUserMedia();
      pc = opts.rtc.createPeerConnection();
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }

      pc.ontrack = (ev) => {
        remoteTracks = [];
        for (const stream of ev.streams ?? []) {
          const media = stream as WebRtcMediaStream & { toURL?: () => string };
          if (typeof media.getTracks === 'function') {
            remoteTracks.push(...media.getTracks());
          }
          if (typeof media.toURL === 'function') {
            opts.onRemoteStreamUrl?.(media.toURL());
          }
        }
        if (ev.track) {
          remoteTracks.push(ev.track);
          ev.track.enabled = !session.incomingMuted;
        }
        applyIncomingMute(session.incomingMuted);
      };

      pc.onicecandidate = (ev) => {
        const payload = serializeIceCandidate(ev.candidate);
        if (!payload) {
          return;
        }
        void opts.signaling.publish({
          matchId,
          fromPlayerId: localPlayerId,
          type: 'ice',
          payload: { candidate: payload },
        });
      };

      const flushIce = async () => {
        if (!pc) {
          return;
        }
        while (pendingIce.length > 0) {
          const next = pendingIce.shift();
          try {
            await pc.addIceCandidate(next);
          } catch {
            // Ignore stale candidates.
          }
        }
      };

      const handleSignal = (signal: {
        type: string;
        payload: Record<string, unknown>;
      }) => {
        void (async () => {
          if (!pc) {
            return;
          }
          if (signal.type === 'offer' && !opts.isOfferer) {
            await pc.setRemoteDescription({
              type: 'offer',
              sdp: String(signal.payload.sdp ?? ''),
            });
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await opts.signaling.publish({
              matchId,
              fromPlayerId: localPlayerId,
              type: 'answer',
              payload: { type: answer.type, sdp: answer.sdp },
            });
          } else if (signal.type === 'answer' && opts.isOfferer) {
            await pc.setRemoteDescription({
              type: 'answer',
              sdp: String(signal.payload.sdp ?? ''),
            });
            await flushIce();
          } else if (signal.type === 'ice' && signal.payload.candidate) {
            pendingIce.push(signal.payload.candidate);
            await flushIce();
          }
        })();
      };

      unsubscribe = opts.signaling.subscribe(
        matchId,
        localPlayerId,
        handleSignal,
      );

      if (opts.isOfferer) {
        await Promise.resolve();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await opts.signaling.publish({
          matchId,
          fromPlayerId: localPlayerId,
          type: 'offer',
          payload: { type: offer.type, sdp: offer.sdp },
        });
      }

      session.status = 'connected';
      session.outgoingMuted = false;
      session.incomingMuted = false;
    },

    disconnect: async () => {
      unsubscribe?.();
      unsubscribe = null;
      for (const track of localStream?.getTracks() ?? []) {
        track.stop();
      }
      localStream = null;
      remoteTracks = [];
      pendingIce.length = 0;
      pc?.close();
      pc = null;
      session.status = 'idle';
      session.outgoingMuted = false;
      session.incomingMuted = false;
    },

    setOutgoingMuted: (muted) => {
      session.outgoingMuted = muted;
      for (const sender of pc?.getSenders() ?? []) {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = !muted;
        }
      }
    },

    setIncomingMuted: (muted) => {
      session.incomingMuted = muted;
      applyIncomingMute(muted);
    },
  };

  return session;
}

export function resolveVoiceSessionFactory(opts: {
  webRtcAvailable: boolean;
  signaling: VoiceSignaling;
  rtc?: WebRtcAdapter | null;
}): (sessionOpts: { isOfferer: boolean }) => VoiceSession {
  return ({ isOfferer }) => {
    if (!opts.webRtcAvailable) {
      return createMemoryVoiceSession();
    }
    const rtc = opts.rtc ?? createNativeWebRtcAdapter();
    if (!rtc) {
      return createMemoryVoiceSession();
    }
    return createWebRtcVoiceSession({
      signaling: opts.signaling,
      rtc,
      isOfferer,
    });
  };
}
