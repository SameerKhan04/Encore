import { create } from 'zustand';

import { mockTranscribe } from '@/services/mockTranscription';

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

export type PlayerId = 'A' | 'B';

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

const SEED_CHALLENGE = 'love';
const BASE_POINTS = 10;

const MATCH_DEFAULTS = {
  activePlayer: 'A' as PlayerId,
  challengePhrase: SEED_CHALLENGE,
  transcriptWords: [] as string[],
  scores: { A: 0, B: 0 },
  lastPoints: 0,
};

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

type GameStore = {
  state: GameState;
  activePlayer: PlayerId;
  challengePhrase: string;
  transcriptWords: string[];
  scores: { A: number; B: number };
  lastPoints: number;
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
  startPartyMatch: () => void;
  recordDemoPerformance: () => boolean;
  passChallengeToOpponent: (phrase: string, multiplier: number) => boolean;
  handOffToOpponent: () => boolean;
};

export const useGameStore = create<GameStore>((set, get) => ({
  state: 'IDLE',
  ...MATCH_DEFAULTS,

  transitionTo: (next) => {
    const current = get().state;
    if (!canTransition(current, next)) {
      return false;
    }
    set({ state: next });
    return true;
  },

  forceState: (next) => set({ state: next }),

  reset: () => set({ state: 'IDLE', ...MATCH_DEFAULTS, transcriptWords: [] }),

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

  startPartyMatch: () => {
    set({
      state: 'ROUND_START',
      ...MATCH_DEFAULTS,
      transcriptWords: [],
    });
  },

  recordDemoPerformance: () => {
    if (get().state !== 'PLAYER_SINGING') {
      return false;
    }
    if (!get().finishSinging()) {
      return false;
    }
    const words = mockTranscribe().words;
    set({
      transcriptWords: words,
      lastPoints: BASE_POINTS,
    });
    return get().verifyPerformance();
  },

  passChallengeToOpponent: (phrase, multiplier) => {
    if (get().state !== 'WORD_SELECTION' || !phrase.trim()) {
      return false;
    }
    const player = get().activePlayer;
    const points = BASE_POINTS * multiplier;
    set((current) => ({
      challengePhrase: phrase,
      lastPoints: points,
      scores: {
        ...current.scores,
        [player]: current.scores[player] + points,
      },
    }));
    return get().sendChallenge();
  },

  handOffToOpponent: () => {
    if (get().state !== 'CHALLENGE_SENT') {
      return false;
    }
    if (!get().beginOpponentTurn()) {
      return false;
    }
    set((current) => ({
      activePlayer: current.activePlayer === 'A' ? 'B' : 'A',
      transcriptWords: [],
      lastPoints: 0,
    }));
    return get().completeOpponentTurn();
  },
}));
