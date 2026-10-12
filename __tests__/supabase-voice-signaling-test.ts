import { createSupabaseVoiceSignaling } from '@/services/supabaseVoiceSignaling';
import type { VoiceSignal } from '@/services/voiceSignaling';

describe('createSupabaseVoiceSignaling', () => {
  it('publishes a signal row and notifies peer subscribers', async () => {
    const rows: VoiceSignal[] = [];
    const listeners = new Map<string, Set<(signal: VoiceSignal) => void>>();

    const signaling = createSupabaseVoiceSignaling({
      insertSignal: async (signal) => {
        rows.push(signal);
        const handlers = listeners.get(signal.matchId);
        if (!handlers) {
          return;
        }
        for (const handler of handlers) {
          handler(signal);
        }
      },
      subscribeSignals: (matchId, onSignal) => {
        let set = listeners.get(matchId);
        if (!set) {
          set = new Set();
          listeners.set(matchId, set);
        }
        set.add(onSignal);
        return () => {
          set?.delete(onSignal);
        };
      },
    });

    const received: VoiceSignal[] = [];
    signaling.subscribe('match-1', 'guest-1', (signal) => {
      if (signal.fromPlayerId !== 'guest-1') {
        received.push(signal);
      }
    });

    await signaling.publish({
      matchId: 'match-1',
      fromPlayerId: 'host-1',
      type: 'offer',
      payload: { sdp: 'o' },
    });

    expect(rows).toHaveLength(1);
    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe('offer');
  });
});
