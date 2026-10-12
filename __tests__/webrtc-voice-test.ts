import {
  createMemoryVoiceSession,
  createWebRtcVoiceSession,
  isWebRtcNativeAvailable,
  resolveVoiceSessionFactory,
  type WebRtcAdapter,
} from '@/services/matchVoice';
import { createMemoryVoiceSignaling } from '@/services/voiceSignaling';

function createFakeRtcAdapter(): WebRtcAdapter {
  let iceHandler: ((candidate: Record<string, unknown>) => void) | null = null;

  return {
    createPeerConnection: () => {
      const remoteHandlers: Array<(event: { streams: unknown[] }) => void> = [];
      const pc = {
        localDescription: null as { type: string; sdp: string } | null,
        remoteDescription: null as { type: string; sdp: string } | null,
        onicecandidate: null as null | ((ev: { candidate: unknown }) => void),
        ontrack: null as null | ((ev: { streams: unknown[] }) => void),
        async createOffer() {
          return { type: 'offer', sdp: 'fake-offer' };
        },
        async createAnswer() {
          return { type: 'answer', sdp: 'fake-answer' };
        },
        async setLocalDescription(desc: { type: string; sdp: string }) {
          pc.localDescription = desc;
        },
        async setRemoteDescription(desc: { type: string; sdp: string }) {
          pc.remoteDescription = desc;
          if (desc.type === 'offer') {
            // peer ready for answer path
          }
          for (const handler of remoteHandlers) {
            handler({ streams: [{ id: 'remote' }] });
          }
        },
        async addIceCandidate(_candidate: unknown) {
          return;
        },
        addTrack() {
          return null;
        },
        close() {
          return;
        },
        getSenders() {
          return [
            {
              track: {
                kind: 'audio',
                enabled: true,
              },
            },
          ];
        },
      };
      // Expose ice hook for tests that need it.
      iceHandler = (candidate) => {
        pc.onicecandidate?.({ candidate });
      };
      void iceHandler;
      return pc;
    },
    getUserMedia: async () => ({
      getTracks: () => [{ kind: 'audio', enabled: true, stop: () => undefined }],
    }),
  };
}

describe('createWebRtcVoiceSession', () => {
  it('completes an offer/answer handshake over signaling', async () => {
    const signaling = createMemoryVoiceSignaling();
    const rtc = createFakeRtcAdapter();

    const host = createWebRtcVoiceSession({
      signaling,
      rtc,
      isOfferer: true,
    });
    const guest = createWebRtcVoiceSession({
      signaling,
      rtc: createFakeRtcAdapter(),
      isOfferer: false,
    });

    await Promise.all([
      host.connect({ matchId: 'm-rtc', localPlayerId: 'host-1' }),
      guest.connect({ matchId: 'm-rtc', localPlayerId: 'guest-1' }),
    ]);

    expect(host.status).toBe('connected');
    expect(guest.status).toBe('connected');

    host.setOutgoingMuted(true);
    expect(host.outgoingMuted).toBe(true);

    await host.disconnect();
    await guest.disconnect();
    expect(host.status).toBe('idle');
  });
});

describe('resolveVoiceSessionFactory', () => {
  it('uses memory when WebRTC native is unavailable', () => {
    const factory = resolveVoiceSessionFactory({
      webRtcAvailable: false,
      signaling: createMemoryVoiceSignaling(),
    });
    const session = factory({ isOfferer: true });
    expect(session).toEqual(expect.objectContaining({ status: 'idle' }));
  });

  it('reports native availability helper as a boolean', () => {
    expect(typeof isWebRtcNativeAvailable()).toBe('boolean');
  });

  it('falls back to createMemoryVoiceSession shape', async () => {
    const session = createMemoryVoiceSession();
    await session.connect({ matchId: 'x', localPlayerId: 'p' });
    expect(session.status).toBe('connected');
  });
});
