import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type {
  MatchSnapshot,
  MatchTransport,
} from '@/services/matchRoom';
import { createMemoryMatchTransport } from '@/services/matchRoom';
import { appMatchInviteService } from '@/services/matchInvites';
import {
  createLiveSupabaseMatchTransport,
  hasSupabaseConfig,
} from '@/services/supabaseMatchRoom';

export type OnlineStatus =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'joining'
  | 'ready'
  | 'opponentLeft'
  | 'error';

type OnlineState = {
  status: OnlineStatus;
  playerId: string | null;
  matchId: string | null;
  inviteCode: string | null;
  role: 'host' | 'guest' | null;
  guestJoined: boolean;
  remoteSnapshot: MatchSnapshot | null;
  error: string | null;
  createRoom: () => Promise<void>;
  joinRoom: (inviteCode: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  publishLocalSnapshot: (snapshot: MatchSnapshot) => Promise<void>;
};

type OnlineStoreDeps = {
  transport: MatchTransport;
  createPlayerId: () => string;
};

const IDLE: Pick<
  OnlineState,
  | 'status'
  | 'matchId'
  | 'inviteCode'
  | 'role'
  | 'guestJoined'
  | 'remoteSnapshot'
  | 'error'
> = {
  status: 'idle',
  matchId: null,
  inviteCode: null,
  role: null,
  guestJoined: false,
  remoteSnapshot: null,
  error: null,
};

export function createOnlineStore(
  deps: OnlineStoreDeps,
): UseBoundStore<StoreApi<OnlineState>> {
  let unsubscribe: (() => void) | null = null;

  const clearSubscription = () => {
    unsubscribe?.();
    unsubscribe = null;
  };

  return create<OnlineState>((set, get) => ({
    ...IDLE,
    playerId: null,

    createRoom: async () => {
      clearSubscription();
      const playerId = deps.createPlayerId();
      set({ ...IDLE, status: 'creating', playerId });
      try {
        const session = await deps.transport.createMatch(playerId);
        set({
          status: 'waiting',
          playerId,
          matchId: session.matchId,
          inviteCode: session.inviteCode,
          role: 'host',
          guestJoined: false,
          error: null,
        });
        unsubscribe = deps.transport.subscribe(session.matchId, (room) => {
          const leftBy = room.abandonedBy;
          if (leftBy && leftBy !== playerId) {
            set({
              guestJoined: room.guestJoined,
              remoteSnapshot: room.snapshot,
              status: 'opponentLeft',
              error: 'Opponent left',
            });
            return;
          }
          set({
            guestJoined: room.guestJoined,
            remoteSnapshot: room.snapshot,
            status: room.guestJoined ? 'ready' : 'waiting',
          });
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not create room',
        });
      }
    },

    joinRoom: async (inviteCode) => {
      clearSubscription();
      const playerId = deps.createPlayerId();
      set({ ...IDLE, status: 'joining', playerId });
      try {
        const session = await deps.transport.joinMatch(inviteCode, playerId);
        set({
          status: 'ready',
          playerId,
          matchId: session.matchId,
          inviteCode: session.inviteCode,
          role: 'guest',
          guestJoined: true,
          error: null,
        });
        unsubscribe = deps.transport.subscribe(session.matchId, (room) => {
          const leftBy = room.abandonedBy;
          if (leftBy && leftBy !== playerId) {
            set({
              guestJoined: room.guestJoined,
              remoteSnapshot: room.snapshot,
              status: 'opponentLeft',
              error: 'Opponent left',
            });
            return;
          }
          set({
            guestJoined: room.guestJoined,
            remoteSnapshot: room.snapshot,
            status: 'ready',
          });
        });
      } catch (err) {
        set({
          status: 'error',
          error: err instanceof Error ? err.message : 'Could not join room',
        });
      }
    },

    leaveRoom: async () => {
      const { matchId, playerId } = get();
      if (matchId && playerId) {
        try {
          await deps.transport.leaveMatch(matchId, playerId);
        } catch {
          // Still reset local state if the transport leave fails.
        }
        try {
          await appMatchInviteService.cancelInvitesForMatch(matchId);
        } catch {
          // Invite cancel is best-effort.
        }
      }
      clearSubscription();
      set({ ...IDLE, playerId: get().playerId });
    },

    publishLocalSnapshot: async (snapshot) => {
      const matchId = get().matchId;
      if (!matchId) {
        return;
      }
      await deps.transport.publishSnapshot(matchId, snapshot);
    },
  }));
}

function createPlayerId(): string {
  return `player-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function createAppTransport(): MatchTransport {
  if (hasSupabaseConfig()) {
    return createLiveSupabaseMatchTransport();
  }
  return createMemoryMatchTransport();
}

/** Shared by the app store and tests that need a second client. */
export const appMatchTransport: MatchTransport = createAppTransport();

/** App singleton — Supabase when configured, otherwise in-memory demo rooms. */
export const useOnlineStore = createOnlineStore({
  transport: appMatchTransport,
  createPlayerId,
});
