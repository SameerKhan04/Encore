import type { GameState, PlayerId } from '@/store/gameStore';
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from '@/services/inviteCode';

export type MatchSnapshot = {
  challengePhrase: string;
  activePlayer: PlayerId;
  pickingPlayer: PlayerId | null;
  scores: { A: number; B: number };
  gameState: GameState;
  transcriptWords: string[];
  thinkDeadlineAt: number | null;
  revision: number;
};

export type MatchRoomView = {
  matchId: string;
  inviteCode: string;
  hostId: string;
  guestId: string | null;
  guestJoined: boolean;
  abandonedBy: string | null;
  snapshot: MatchSnapshot;
};

export type MatchSession = {
  matchId: string;
  inviteCode: string;
  playerId: string;
  role: 'host' | 'guest';
  guestJoined: boolean;
};

export type MatchTransport = {
  createMatch: (hostId: string) => Promise<MatchSession>;
  joinMatch: (inviteCode: string, guestId: string) => Promise<MatchSession>;
  publishSnapshot: (
    matchId: string,
    snapshot: MatchSnapshot,
  ) => Promise<void>;
  leaveMatch: (matchId: string, playerId: string) => Promise<void>;
  subscribe: (
    matchId: string,
    onUpdate: (room: MatchRoomView) => void,
  ) => () => void;
};

type InternalRoom = {
  matchId: string;
  inviteCode: string;
  hostId: string;
  guestId: string | null;
  abandonedBy: string | null;
  snapshot: MatchSnapshot;
  listeners: Set<(room: MatchRoomView) => void>;
};

function defaultSnapshot(): MatchSnapshot {
  return {
    challengePhrase: 'love',
    activePlayer: 'A',
    pickingPlayer: null,
    scores: { A: 0, B: 0 },
    gameState: 'IDLE',
    transcriptWords: [],
    thinkDeadlineAt: null,
    revision: 0,
  };
}

function toView(room: InternalRoom): MatchRoomView {
  return {
    matchId: room.matchId,
    inviteCode: room.inviteCode,
    hostId: room.hostId,
    guestId: room.guestId,
    guestJoined: room.guestId !== null,
    abandonedBy: room.abandonedBy,
    snapshot: room.snapshot,
  };
}

function notify(room: InternalRoom) {
  const view = toView(room);
  for (const listener of room.listeners) {
    listener(view);
  }
}

/**
 * In-memory match transport for tests and offline demo rooms.
 * Cross-device play needs the Supabase transport (same interface).
 */
export function createMemoryMatchTransport(
  random: () => number = Math.random,
): MatchTransport {
  const roomsById = new Map<string, InternalRoom>();
  const roomsByCode = new Map<string, InternalRoom>();
  let seq = 0;

  return {
    async createMatch(hostId) {
      let inviteCode = generateInviteCode(random);
      while (roomsByCode.has(inviteCode)) {
        inviteCode = generateInviteCode(random);
      }
      seq += 1;
      const matchId = `match-${seq}`;
      const room: InternalRoom = {
        matchId,
        inviteCode,
        hostId,
        guestId: null,
        abandonedBy: null,
        snapshot: defaultSnapshot(),
        listeners: new Set(),
      };
      roomsById.set(matchId, room);
      roomsByCode.set(inviteCode, room);
      return {
        matchId,
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
      const room = roomsByCode.get(inviteCode);
      if (!room) {
        throw new Error('Invite code not found');
      }
      if (room.guestId && room.guestId !== guestId) {
        throw new Error('Match already has a guest');
      }
      room.guestId = guestId;
      notify(room);
      return {
        matchId: room.matchId,
        inviteCode: room.inviteCode,
        playerId: guestId,
        role: 'guest',
        guestJoined: true,
      };
    },

    async publishSnapshot(matchId, snapshot) {
      const room = roomsById.get(matchId);
      if (!room) {
        throw new Error('Match not found');
      }
      room.snapshot = snapshot;
      notify(room);
    },

    async leaveMatch(matchId, playerId) {
      const room = roomsById.get(matchId);
      if (!room) {
        return;
      }
      // Host cancelled an empty lobby — drop the invite so it cannot be joined.
      if (!room.guestId && playerId === room.hostId) {
        roomsById.delete(matchId);
        roomsByCode.delete(room.inviteCode);
        return;
      }
      room.abandonedBy = playerId;
      notify(room);
    },

    subscribe(matchId, onUpdate) {
      const room = roomsById.get(matchId);
      if (!room) {
        return () => {};
      }
      room.listeners.add(onUpdate);
      onUpdate(toView(room));
      return () => {
        room.listeners.delete(onUpdate);
      };
    },
  };
}
