import {
  normalizePublicId,
  type ProfileDirectory,
  type PublicProfile,
} from '@/services/profileDirectory';
import { getSupabaseClient } from '@/services/supabaseClient';
import { hasSupabaseConfig } from '@/services/supabaseConfig';

export type FriendRequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'removed';

export type FriendRequest = {
  id: string;
  fromId: string;
  toId: string;
  status: FriendRequestStatus;
  fromDisplayName?: string;
  toDisplayName?: string;
};

export type FriendRequestService = {
  sendRequest: (fromId: string, toId: string) => Promise<FriendRequest>;
  listIncoming: (publicId: string) => Promise<FriendRequest[]>;
  listOutgoing: (publicId: string) => Promise<FriendRequest[]>;
  listFriends: (publicId: string) => Promise<PublicProfile[]>;
  acceptRequest: (requestId: string, byPublicId: string) => Promise<FriendRequest>;
  declineRequest: (
    requestId: string,
    byPublicId: string,
  ) => Promise<FriendRequest>;
  unfriend: (aId: string, bId: string) => Promise<void>;
  subscribeIncoming: (
    publicId: string,
    onRequest: (request: FriendRequest) => void,
  ) => () => void;
  subscribeForUser: (
    publicId: string,
    onRequest: (request: FriendRequest) => void,
  ) => () => void;
};

type MemoryDeps = {
  directory: ProfileDirectory;
};

export function createMemoryFriendRequestService(
  deps: MemoryDeps,
): FriendRequestService {
  const rows = new Map<string, FriendRequest>();
  const listeners = new Map<string, Set<(request: FriendRequest) => void>>();
  let seq = 0;

  const notifyUser = (publicId: string, request: FriendRequest) => {
    const set = listeners.get(publicId);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(request);
    }
  };

  const notifyParties = (request: FriendRequest) => {
    notifyUser(request.toId, request);
    notifyUser(request.fromId, request);
  };

  const withNames = async (request: FriendRequest): Promise<FriendRequest> => {
    const from = await deps.directory.findByPublicId(request.fromId);
    const to = await deps.directory.findByPublicId(request.toId);
    return {
      ...request,
      fromDisplayName: from?.displayName,
      toDisplayName: to?.displayName,
    };
  };

  return {
    async sendRequest(rawFrom, rawTo) {
      const fromId = normalizePublicId(rawFrom);
      const toId = normalizePublicId(rawTo);
      if (fromId === toId) {
        throw new Error('Cannot friend yourself');
      }
      const target = await deps.directory.findByPublicId(toId);
      if (!target) {
        throw new Error('Encore ID not found');
      }
      const existing = [...rows.values()].find(
        (row) =>
          row.status === 'pending' &&
          ((row.fromId === fromId && row.toId === toId) ||
            (row.fromId === toId && row.toId === fromId)),
      );
      if (existing) {
        return withNames(existing);
      }
      const alreadyFriends = [...rows.values()].some(
        (row) =>
          row.status === 'accepted' &&
          ((row.fromId === fromId && row.toId === toId) ||
            (row.fromId === toId && row.toId === fromId)),
      );
      if (alreadyFriends) {
        throw new Error('Already friends');
      }
      seq += 1;
      const request: FriendRequest = {
        id: `fr-${seq}`,
        fromId,
        toId,
        status: 'pending',
      };
      rows.set(request.id, request);
      const named = await withNames(request);
      notifyParties(named);
      return named;
    },

    async listIncoming(rawId) {
      const publicId = normalizePublicId(rawId);
      const pending = [...rows.values()].filter(
        (row) => row.toId === publicId && row.status === 'pending',
      );
      return Promise.all(pending.map((row) => withNames(row)));
    },

    async listOutgoing(rawId) {
      const publicId = normalizePublicId(rawId);
      const pending = [...rows.values()].filter(
        (row) => row.fromId === publicId && row.status === 'pending',
      );
      return Promise.all(pending.map((row) => withNames(row)));
    },

    async listFriends(rawId) {
      const publicId = normalizePublicId(rawId);
      const accepted = [...rows.values()].filter(
        (row) =>
          row.status === 'accepted' &&
          (row.fromId === publicId || row.toId === publicId),
      );
      const friends: PublicProfile[] = [];
      for (const row of accepted) {
        const otherId = row.fromId === publicId ? row.toId : row.fromId;
        const profile = await deps.directory.findByPublicId(otherId);
        if (profile) {
          friends.push(profile);
        }
      }
      return friends;
    },

    async acceptRequest(requestId, byPublicId) {
      const row = rows.get(requestId);
      if (!row || row.toId !== normalizePublicId(byPublicId)) {
        throw new Error('Request not found');
      }
      if (row.status !== 'pending') {
        throw new Error('Request is not pending');
      }
      const next = { ...row, status: 'accepted' as const };
      rows.set(requestId, next);
      const named = await withNames(next);
      notifyParties(named);
      return named;
    },

    async declineRequest(requestId, byPublicId) {
      const row = rows.get(requestId);
      if (!row || row.toId !== normalizePublicId(byPublicId)) {
        throw new Error('Request not found');
      }
      if (row.status !== 'pending') {
        throw new Error('Request is not pending');
      }
      const next = { ...row, status: 'declined' as const };
      rows.set(requestId, next);
      const named = await withNames(next);
      notifyParties(named);
      return named;
    },

    async unfriend(rawA, rawB) {
      const aId = normalizePublicId(rawA);
      const bId = normalizePublicId(rawB);
      for (const [id, row] of rows) {
        if (
          row.status === 'accepted' &&
          ((row.fromId === aId && row.toId === bId) ||
            (row.fromId === bId && row.toId === aId))
        ) {
          const next = { ...row, status: 'removed' as const };
          rows.set(id, next);
          const named = await withNames(next);
          notifyParties(named);
        }
      }
    },

    subscribeForUser(rawId, onRequest) {
      const publicId = normalizePublicId(rawId);
      let set = listeners.get(publicId);
      if (!set) {
        set = new Set();
        listeners.set(publicId, set);
      }
      set.add(onRequest);
      return () => {
        set?.delete(onRequest);
      };
    },

    subscribeIncoming(rawId, onRequest) {
      const publicId = normalizePublicId(rawId);
      let set = listeners.get(publicId);
      if (!set) {
        set = new Set();
        listeners.set(publicId, set);
      }
      const wrapped = (request: FriendRequest) => {
        if (request.toId === publicId) {
          onRequest(request);
        }
      };
      set.add(wrapped);
      return () => {
        set?.delete(wrapped);
      };
    },
  };
}

type SupabaseFriendRow = {
  id: string;
  from_id: string;
  to_id: string;
  status: FriendRequestStatus;
};

type SupabaseFriendClient = {
  from: (table: string) => {
    insert: (row: {
      from_id: string;
      to_id: string;
      status: FriendRequestStatus;
    }) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: SupabaseFriendRow | null;
          error: { message: string } | null;
        }>;
      };
    };
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (
          column: string,
          value: string,
        ) => Promise<{
          data: SupabaseFriendRow[] | null;
          error: { message: string } | null;
        }>;
        or: (filter: string) => Promise<{
          data: SupabaseFriendRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (row: { status: FriendRequestStatus }) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: SupabaseFriendRow | null;
              error: { message: string } | null;
            }>;
          };
        };
        or: (filter: string) => Promise<{
          error: { message: string } | null;
        }>;
      };
    };
  };
  channel: (name: string) => {
    on: (
      event: string,
      filter: object,
      callback: (payload: { new: SupabaseFriendRow }) => void,
    ) => {
      on: (
        event: string,
        filter: object,
        callback: (payload: { new: SupabaseFriendRow }) => void,
      ) => { subscribe: () => unknown };
      subscribe: () => unknown;
    };
  };
  removeChannel: (channel: unknown) => void;
};

function rowToRequest(row: SupabaseFriendRow): FriendRequest {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    status: row.status,
  };
}

export function createSupabaseFriendRequestService(
  client: SupabaseFriendClient,
  directory: ProfileDirectory,
): FriendRequestService {
  const withNames = async (request: FriendRequest): Promise<FriendRequest> => {
    const from = await directory.findByPublicId(request.fromId);
    const to = await directory.findByPublicId(request.toId);
    return {
      ...request,
      fromDisplayName: from?.displayName,
      toDisplayName: to?.displayName,
    };
  };

  return {
    async sendRequest(rawFrom, rawTo) {
      const fromId = normalizePublicId(rawFrom);
      const toId = normalizePublicId(rawTo);
      if (fromId === toId) {
        throw new Error('Cannot friend yourself');
      }
      const target = await directory.findByPublicId(toId);
      if (!target) {
        throw new Error('Encore ID not found');
      }
      const { data, error } = await client
        .from('encore_friend_requests')
        .insert({ from_id: fromId, to_id: toId, status: 'pending' })
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not send request');
      }
      return withNames(rowToRequest(data));
    },

    async listIncoming(rawId) {
      const publicId = normalizePublicId(rawId);
      const { data, error } = await client
        .from('encore_friend_requests')
        .select('*')
        .eq('to_id', publicId)
        .eq('status', 'pending');
      if (error) {
        throw new Error(error.message);
      }
      return Promise.all((data ?? []).map((row) => withNames(rowToRequest(row))));
    },

    async listOutgoing(rawId) {
      const publicId = normalizePublicId(rawId);
      const { data, error } = await client
        .from('encore_friend_requests')
        .select('*')
        .eq('from_id', publicId)
        .eq('status', 'pending');
      if (error) {
        throw new Error(error.message);
      }
      return Promise.all((data ?? []).map((row) => withNames(rowToRequest(row))));
    },

    async listFriends(rawId) {
      const publicId = normalizePublicId(rawId);
      const { data, error } = await client
        .from('encore_friend_requests')
        .select('*')
        .eq('status', 'accepted')
        .or(`from_id.eq.${publicId},to_id.eq.${publicId}`);
      if (error) {
        throw new Error(error.message);
      }
      const friends: PublicProfile[] = [];
      for (const row of data ?? []) {
        const otherId = row.from_id === publicId ? row.to_id : row.from_id;
        const profile = await directory.findByPublicId(otherId);
        if (profile) {
          friends.push(profile);
        }
      }
      return friends;
    },

    async acceptRequest(requestId, byPublicId) {
      const { data, error } = await client
        .from('encore_friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('to_id', normalizePublicId(byPublicId))
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not accept request');
      }
      return withNames(rowToRequest(data));
    },

    async declineRequest(requestId, byPublicId) {
      const { data, error } = await client
        .from('encore_friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)
        .eq('to_id', normalizePublicId(byPublicId))
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Could not decline request');
      }
      return withNames(rowToRequest(data));
    },

    async unfriend(rawA, rawB) {
      const aId = normalizePublicId(rawA);
      const bId = normalizePublicId(rawB);
      const { error } = await client
        .from('encore_friend_requests')
        .update({ status: 'removed' })
        .eq('status', 'accepted')
        .or(
          `and(from_id.eq.${aId},to_id.eq.${bId}),and(from_id.eq.${bId},to_id.eq.${aId})`,
        );
      if (error) {
        throw new Error(error.message);
      }
    },

    subscribeForUser(rawId, onRequest) {
      const publicId = normalizePublicId(rawId);
      const handle = (payload: { new: SupabaseFriendRow }) => {
        if (!payload?.new) {
          return;
        }
        void withNames(rowToRequest(payload.new)).then(onRequest);
      };
      // Separate channels — Supabase forbids adding .on() after subscribe().
      const toChannel = client
        .channel(`friend-requests-to-${publicId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'encore_friend_requests',
            filter: `to_id=eq.${publicId}`,
          },
          handle,
        )
        .subscribe();
      const fromChannel = client
        .channel(`friend-requests-from-${publicId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'encore_friend_requests',
            filter: `from_id=eq.${publicId}`,
          },
          handle,
        )
        .subscribe();
      return () => {
        client.removeChannel(toChannel);
        client.removeChannel(fromChannel);
      };
    },

    subscribeIncoming(rawId, onRequest) {
      const publicId = normalizePublicId(rawId);
      const channel = client
        .channel(`friend-requests-in-${publicId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'encore_friend_requests',
            filter: `to_id=eq.${publicId}`,
          },
          (payload) => {
            void withNames(rowToRequest(payload.new)).then(onRequest);
          },
        )
        .subscribe();
      return () => {
        client.removeChannel(channel);
      };
    },
  };
}

export function createAppFriendRequestService(
  directory: ProfileDirectory,
): FriendRequestService {
  if (process.env.NODE_ENV === 'test' || !hasSupabaseConfig()) {
    return createMemoryFriendRequestService({ directory });
  }
  const client = getSupabaseClient();
  if (!client) {
    return createMemoryFriendRequestService({ directory });
  }
  return createSupabaseFriendRequestService(
    client as unknown as SupabaseFriendClient,
    directory,
  );
}
