import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { hasSupabaseConfig } from '@/services/supabaseConfig';
import { getSupabaseClient } from '@/services/supabaseClient';

export { hasSupabaseConfig };
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '@/services/inviteCode';
import type {
  MatchRoomView,
  MatchSnapshot,
  MatchTransport,
} from '@/services/matchRoom';

export type SupabaseMatchRow = {
  id: string;
  invite_code: string;
  host_id: string;
  guest_id: string | null;
  abandoned_by: string | null;
  snapshot: MatchSnapshot;
};

/** Insert payload omits abandoned_by so create works before the column migrates. */
export type SupabaseMatchInsert = Omit<SupabaseMatchRow, 'abandoned_by'>;

export type SupabaseMatchDeps = {
  generateId: () => string;
  generateCode: () => string;
  insertMatch: (row: SupabaseMatchInsert) => Promise<void>;
  findByInviteCode: (code: string) => Promise<SupabaseMatchRow | null>;
  updateGuest: (
    matchId: string,
    guestId: string,
  ) => Promise<SupabaseMatchRow>;
  updateSnapshot: (
    matchId: string,
    snapshot: MatchSnapshot,
  ) => Promise<SupabaseMatchRow>;
  markAbandoned: (
    matchId: string,
    playerId: string,
  ) => Promise<SupabaseMatchRow>;
  subscribeMatch: (
    matchId: string,
    onRow: (row: SupabaseMatchRow) => void,
  ) => () => void;
};

const DEFAULT_SNAPSHOT: MatchSnapshot = {
  challengePhrase: 'love',
  activePlayer: 'A',
  pickingPlayer: null,
  scores: { A: 0, B: 0 },
  gameState: 'IDLE',
  transcriptWords: [],
  thinkDeadlineAt: null,
  revision: 0,
};

function toView(row: SupabaseMatchRow): MatchRoomView {
  return {
    matchId: row.id,
    inviteCode: row.invite_code,
    hostId: row.host_id,
    guestId: row.guest_id,
    guestJoined: row.guest_id !== null,
    abandonedBy: row.abandoned_by ?? null,
    snapshot: {
      ...DEFAULT_SNAPSHOT,
      ...row.snapshot,
      thinkDeadlineAt: row.snapshot?.thinkDeadlineAt ?? null,
    },
  };
}

/** Injectable Supabase match transport (table + realtime). */
export function createSupabaseMatchTransport(
  deps: SupabaseMatchDeps,
): MatchTransport {
  return {
    async createMatch(hostId) {
      const inviteCode = deps.generateCode();
      const id = deps.generateId();
      const row: SupabaseMatchInsert = {
        id,
        invite_code: inviteCode,
        host_id: hostId,
        guest_id: null,
        snapshot: DEFAULT_SNAPSHOT,
      };
      await deps.insertMatch(row);
      return {
        matchId: id,
        inviteCode,
        playerId: hostId,
        role: 'host',
        guestJoined: false,
      };
    },

    async joinMatch(rawCode, guestId) {
      const inviteCode = normalizeInviteCode(rawCode);
      if (!isValidInviteCode(inviteCode)) {
        throw new Error('Invalid invite code');
      }
      const existing = await deps.findByInviteCode(inviteCode);
      if (!existing) {
        throw new Error('Invite code not found');
      }
      if (existing.guest_id && existing.guest_id !== guestId) {
        throw new Error('Match already has a guest');
      }
      const row = await deps.updateGuest(existing.id, guestId);
      return {
        matchId: row.id,
        inviteCode: row.invite_code,
        playerId: guestId,
        role: 'guest',
        guestJoined: true,
      };
    },

    async publishSnapshot(matchId, snapshot) {
      await deps.updateSnapshot(matchId, snapshot);
    },

    async leaveMatch(matchId, playerId) {
      await deps.markAbandoned(matchId, playerId);
    },

    subscribe(matchId, onUpdate) {
      return deps.subscribeMatch(matchId, (row) => {
        onUpdate(toView(row));
      });
    },
  };
}

/** UUID-shaped id without `crypto` (unavailable in RN / Expo Go). */
export function createMatchId(random: () => number = Math.random): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const nibble = Math.floor(random() * 16);
    const value = char === 'x' ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Real Supabase wiring when env vars are present. */
export function createLiveSupabaseMatchTransport(
  client: SupabaseClient = getSupabaseClient() ??
    createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    ),
): MatchTransport {
  return createSupabaseMatchTransport({
    generateId: () => createMatchId(),
    generateCode: () => generateInviteCode(),
    insertMatch: async (row) => {
      const { error } = await client.from('encore_matches').insert(row);
      if (error) {
        throw new Error(error.message);
      }
    },
    findByInviteCode: async (code) => {
      const { data, error } = await client
        .from('encore_matches')
        .select('*')
        .eq('invite_code', code)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as SupabaseMatchRow | null) ?? null;
    },
    updateGuest: async (matchId, guestId) => {
      const { data, error } = await client
        .from('encore_matches')
        .update({ guest_id: guestId })
        .eq('id', matchId)
        .select('*')
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as SupabaseMatchRow;
    },
    updateSnapshot: async (matchId, snapshot) => {
      const { data, error } = await client
        .from('encore_matches')
        .update({ snapshot })
        .eq('id', matchId)
        .select('*')
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as SupabaseMatchRow;
    },
    markAbandoned: async (matchId, playerId) => {
      const { data, error } = await client
        .from('encore_matches')
        .update({ abandoned_by: playerId })
        .eq('id', matchId)
        .select('*')
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as SupabaseMatchRow;
    },
    subscribeMatch: (matchId, onRow) => {
      const channel = client
        .channel(`encore-match-${matchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'encore_matches',
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as SupabaseMatchRow | null;
            if (row) {
              onRow(row);
            }
          },
        )
        .subscribe();

      void client
        .from('encore_matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            onRow(data as SupabaseMatchRow);
          }
        });

      return () => {
        void client.removeChannel(channel);
      };
    },
  });
}
