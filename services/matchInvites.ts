import { normalizePublicId } from '@/services/profileDirectory';
import { getSupabaseClient } from '@/services/supabaseClient';
import { hasSupabaseConfig } from '@/services/supabaseConfig';

export type MatchInviteStatus =
  | 'pending'
  | 'cancelled'
  | 'expired'
  | 'accepted';

export type MatchInvite = {
  id: string;
  fromId: string;
  toId: string;
  matchId: string;
  inviteCode: string;
  status: MatchInviteStatus;
};

export type MatchInviteService = {
  sendInvite: (input: {
    fromId: string;
    toId: string;
    matchId: string;
    inviteCode: string;
  }) => Promise<MatchInvite>;
  listIncoming: (publicId: string) => Promise<MatchInvite[]>;
  cancelInvitesForMatch: (matchId: string) => Promise<MatchInvite[]>;
  getInvite: (inviteId: string) => Promise<MatchInvite | null>;
  isJoinable: (invite: MatchInvite) => boolean;
  subscribeIncoming: (
    publicId: string,
    onInvite: (invite: MatchInvite) => void,
  ) => () => void;
};

export function createMemoryMatchInviteService(): MatchInviteService {
  const rows = new Map<string, MatchInvite>();
  const listeners = new Map<string, Set<(invite: MatchInvite) => void>>();
  let seq = 0;

  const notify = (invite: MatchInvite) => {
    const set = listeners.get(invite.toId);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(invite);
    }
  };

  return {
    async sendInvite(input) {
      seq += 1;
      const invite: MatchInvite = {
        id: `mi-${seq}`,
        fromId: normalizePublicId(input.fromId),
        toId: normalizePublicId(input.toId),
        matchId: input.matchId,
        inviteCode: input.inviteCode,
        status: 'pending',
      };
      rows.set(invite.id, invite);
      notify(invite);
      return invite;
    },

    async listIncoming(rawId) {
      const publicId = normalizePublicId(rawId);
      return [...rows.values()].filter(
        (row) => row.toId === publicId && row.status === 'pending',
      );
    },

    async cancelInvitesForMatch(matchId) {
      const cancelled: MatchInvite[] = [];
      for (const [id, row] of rows) {
        if (row.matchId === matchId && row.status === 'pending') {
          const next = { ...row, status: 'cancelled' as const };
          rows.set(id, next);
          cancelled.push(next);
          notify(next);
        }
      }
      return cancelled;
    },

    async getInvite(inviteId) {
      return rows.get(inviteId) ?? null;
    },

    isJoinable(invite) {
      return invite.status === 'pending';
    },

    subscribeIncoming(rawId, onInvite) {
      const publicId = normalizePublicId(rawId);
      let set = listeners.get(publicId);
      if (!set) {
        set = new Set();
        listeners.set(publicId, set);
      }
      set.add(onInvite);
      return () => {
        set?.delete(onInvite);
      };
    },
  };
}

type SupabaseInviteRow = {
  id: string;
  from_id: string;
  to_id: string;
  match_id: string;
  invite_code: string;
  status: MatchInviteStatus;
};

type SupabaseInviteClient = {
  from: (table: string) => {
    insert: (row: {
      from_id: string;
      to_id: string;
      match_id: string;
      invite_code: string;
      status: MatchInviteStatus;
    }) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: SupabaseInviteRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{
          data: SupabaseInviteRow[] | null;
          error: { message: string } | null;
        }>;
        maybeSingle: () => Promise<{
          data: SupabaseInviteRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (row: { status: MatchInviteStatus }) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => Promise<{
            data: SupabaseInviteRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  channel: (name: string) => {
    on: (
      event: string,
      filter: object,
      callback: (payload: { new: SupabaseInviteRow }) => void,
    ) => { subscribe: () => unknown };
  };
  removeChannel: (channel: unknown) => void;
};

function rowToInvite(row: SupabaseInviteRow): MatchInvite {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    matchId: row.match_id,
    inviteCode: row.invite_code,
    status: row.status ?? 'pending',
  };
}

export function createSupabaseMatchInviteService(
  client: SupabaseInviteClient,
): MatchInviteService {
  return {
    async sendInvite(input) {
      const { data, error } = await client
        .from('encore_match_invites')
        .insert({
          from_id: normalizePublicId(input.fromId),
          to_id: normalizePublicId(input.toId),
          match_id: input.matchId,
          invite_code: input.inviteCode,
          status: 'pending',
        })
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not send invite');
      }
      return rowToInvite(data);
    },

    async listIncoming(rawId) {
      const { data, error } = await client
        .from('encore_match_invites')
        .select('*')
        .eq('to_id', normalizePublicId(rawId))
        .eq('status', 'pending');
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map(rowToInvite);
    },

    async cancelInvitesForMatch(matchId) {
      const { data, error } = await client
        .from('encore_match_invites')
        .update({ status: 'cancelled' })
        .eq('match_id', matchId)
        .eq('status', 'pending')
        .select('*');
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map(rowToInvite);
    },

    async getInvite(inviteId) {
      const { data, error } = await client
        .from('encore_match_invites')
        .select('*')
        .eq('id', inviteId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? rowToInvite(data) : null;
    },

    isJoinable(invite) {
      return invite.status === 'pending';
    },

    subscribeIncoming(rawId, onInvite) {
      const publicId = normalizePublicId(rawId);
      const channel = client
        .channel(`match-invites-${publicId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'encore_match_invites',
            filter: `to_id=eq.${publicId}`,
          },
          (payload) => {
            onInvite(rowToInvite(payload.new));
          },
        )
        .subscribe();
      return () => {
        client.removeChannel(channel);
      };
    },
  };
}

export function createAppMatchInviteService(): MatchInviteService {
  if (process.env.NODE_ENV === 'test' || !hasSupabaseConfig()) {
    return createMemoryMatchInviteService();
  }
  const client = getSupabaseClient();
  if (!client) {
    return createMemoryMatchInviteService();
  }
  return createSupabaseMatchInviteService(
    client as unknown as SupabaseInviteClient,
  );
}

/** Shared by profile store and leaveRoom cancel. */
export const appMatchInviteService: MatchInviteService =
  createAppMatchInviteService();

