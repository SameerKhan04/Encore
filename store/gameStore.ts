import { create } from 'zustand';

export type GameState =
  | 'IDLE'
  | 'ROUND_START'
  | 'PLAYER_PREPARING'
  | 'PLAYER_SINGING'
  | 'PROCESSING_AUDIO'
  | 'PERFORMANCE_VERIFIED'
  | 'WORD_SELECTION'
  | 'CHALLENGE_SENT'
  | 'OPPONENT_SINGING'
  | 'ROUND_FAILED'
  | 'MATCH_COMPLETE';

export const GAME_STATES: readonly GameState[] = [
  'IDLE',
  'ROUND_START',
  'PLAYER_PREPARING',
  'PLAYER_SINGING',
  'PROCESSING_AUDIO',
  'PERFORMANCE_VERIFIED',
  'WORD_SELECTION',
  'CHALLENGE_SENT',
  'OPPONENT_SINGING',
  'ROUND_FAILED',
  'MATCH_COMPLETE',
] as const;

/** Legal edges for the deterministic game FSM. */
const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  IDLE: ['ROUND_START'],
  ROUND_START: ['PLAYER_PREPARING'],
  PLAYER_PREPARING: ['PLAYER_SINGING', 'ROUND_FAILED'],
  PLAYER_SINGING: ['PROCESSING_AUDIO', 'ROUND_FAILED'],
  PROCESSING_AUDIO: ['PERFORMANCE_VERIFIED', 'ROUND_FAILED'],
  PERFORMANCE_VERIFIED: ['WORD_SELECTION'],
  WORD_SELECTION: ['CHALLENGE_SENT'],
  CHALLENGE_SENT: ['OPPONENT_SINGING', 'MATCH_COMPLETE'],
  OPPONENT_SINGING: ['PLAYER_PREPARING', 'ROUND_FAILED', 'MATCH_COMPLETE'],
  ROUND_FAILED: ['ROUND_START', 'MATCH_COMPLETE'],
  MATCH_COMPLETE: ['IDLE'],
};

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

type GameStore = {
  state: GameState;
  transitionTo: (next: GameState) => boolean;
  forceState: (next: GameState) => void;
  reset: () => void;
  startRound: () => boolean;
  beginPreparing: () => boolean;
  startSinging: () => boolean;
  finishSinging: () => boolean;
  verifyPerformance: () => boolean;
  beginWordSelection: () => boolean;
  sendChallenge: () => boolean;
  beginOpponentTurn: () => boolean;
  completeOpponentTurn: () => boolean;
  failRound: () => boolean;
  completeMatch: () => boolean;
};

export const useGameStore = create<GameStore>((set, get) => ({
  state: 'IDLE',

  transitionTo: (next) => {
    const current = get().state;
    if (!canTransition(current, next)) {
      return false;
    }
    set({ state: next });
    return true;
  },

  forceState: (next) => set({ state: next }),

  reset: () => set({ state: 'IDLE' }),

  startRound: () => get().transitionTo('ROUND_START'),
  beginPreparing: () => get().transitionTo('PLAYER_PREPARING'),
  startSinging: () => get().transitionTo('PLAYER_SINGING'),
  finishSinging: () => get().transitionTo('PROCESSING_AUDIO'),
  verifyPerformance: () => get().transitionTo('PERFORMANCE_VERIFIED'),
  beginWordSelection: () => get().transitionTo('WORD_SELECTION'),
  sendChallenge: () => get().transitionTo('CHALLENGE_SENT'),
  beginOpponentTurn: () => get().transitionTo('OPPONENT_SINGING'),
  completeOpponentTurn: () => get().transitionTo('PLAYER_PREPARING'),
  failRound: () => get().transitionTo('ROUND_FAILED'),
  completeMatch: () => get().transitionTo('MATCH_COMPLETE'),
}));
