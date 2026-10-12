export type VoiceSignalType = 'offer' | 'answer' | 'ice';

export type VoiceSignal = {
  matchId: string;
  fromPlayerId: string;
  type: VoiceSignalType;
  payload: Record<string, unknown>;
};

export type VoiceSignaling = {
  publish: (signal: VoiceSignal) => Promise<void>;
  subscribe: (
    matchId: string,
    localPlayerId: string,
    onSignal: (signal: VoiceSignal) => void,
  ) => () => void;
};

type RoomBus = {
  listeners: Map<string, Set<(signal: VoiceSignal) => void>>;
};

/**
 * In-memory SDP/ICE bus for tests and same-process demos.
 * Cross-device uses the Supabase voice signaling transport.
 */
export function createMemoryVoiceSignaling(): VoiceSignaling {
  const rooms = new Map<string, RoomBus>();

  const getRoom = (matchId: string): RoomBus => {
    let room = rooms.get(matchId);
    if (!room) {
      room = { listeners: new Map() };
      rooms.set(matchId, room);
    }
    return room;
  };

  return {
    async publish(signal) {
      const room = getRoom(signal.matchId);
      for (const [playerId, handlers] of room.listeners) {
        if (playerId === signal.fromPlayerId) {
          continue;
        }
        for (const handler of handlers) {
          handler(signal);
        }
      }
    },

    subscribe(matchId, localPlayerId, onSignal) {
      const room = getRoom(matchId);
      let handlers = room.listeners.get(localPlayerId);
      if (!handlers) {
        handlers = new Set();
        room.listeners.set(localPlayerId, handlers);
      }
      handlers.add(onSignal);
      return () => {
        handlers?.delete(onSignal);
      };
    },
  };
}
