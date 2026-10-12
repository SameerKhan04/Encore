import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/services/supabaseClient';

import type { VoiceSignal, VoiceSignaling } from '@/services/voiceSignaling';

export type SupabaseVoiceSignalingDeps = {
  insertSignal: (signal: VoiceSignal) => Promise<void>;
  subscribeSignals: (
    matchId: string,
    onSignal: (signal: VoiceSignal) => void,
  ) => () => void;
};

export function createSupabaseVoiceSignaling(
  deps: SupabaseVoiceSignalingDeps,
): VoiceSignaling {
  return {
    async publish(signal) {
      await deps.insertSignal(signal);
    },

    subscribe(matchId, localPlayerId, onSignal) {
      return deps.subscribeSignals(matchId, (signal) => {
        if (signal.fromPlayerId === localPlayerId) {
          return;
        }
        onSignal(signal);
      });
    },
  };
}

type VoiceSignalRow = {
  match_id: string;
  from_player_id: string;
  type: VoiceSignal['type'];
  payload: Record<string, unknown>;
};

function rowToSignal(row: VoiceSignalRow): VoiceSignal {
  return {
    matchId: row.match_id,
    fromPlayerId: row.from_player_id,
    type: row.type,
    payload: row.payload ?? {},
  };
}

/** Live Supabase table + realtime wiring for voice SDP/ICE. */
export function createLiveSupabaseVoiceSignaling(
  client: SupabaseClient,
): VoiceSignaling {
  return createSupabaseVoiceSignaling({
    insertSignal: async (signal) => {
      const { error } = await client.from('encore_voice_signals').insert({
        match_id: signal.matchId,
        from_player_id: signal.fromPlayerId,
        type: signal.type,
        payload: signal.payload,
      });
      if (error) {
        throw error;
      }
    },
    subscribeSignals: (matchId, onSignal) => {
      const channel = client
        .channel(`voice:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'encore_voice_signals',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            onSignal(rowToSignal(payload.new as VoiceSignalRow));
          },
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  });
}

export function createSupabaseVoiceClientFromEnv(): SupabaseClient | null {
  const shared = getSupabaseClient();
  if (shared) {
    return shared;
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    return null;
  }
  return createClient(url, key);
}
