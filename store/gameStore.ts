import { create } from 'zustand';

import type { MatchSnapshot } from '@/services/matchRoom';
import { readMatchSnapshot } from '@/services/onlineSync';
import { mockTranscribe } from '@/services/mockTranscription';
import {
  containsChallengePhrase,
  containsChallengeWord,
  wordsFromText,
} from '@/services/transcription';

export type GameState =
  | 'IDLE'
  | 'ROUND_START'
  | 'PLAYER_PREPARING'
  | 'PLAYER_COUNTDOWN'
  | 'PLAYER_SINGING'
  | 'PROCESSING_AUDIO'
  | 'PERFORMANCE_VERIFIED'
  | 'WORD_SELECTION'
  | 'CHALLENGE_SENT'
  | 'OPPONENT_SINGING'
  | 'ROUND_FAILED'
  | 'MATCH_COMPLETE';

export type PlayerId = 'A' | 'B';

export type FailReason = 'think_timeout' | 'sing_too_short' | 'cant_sing';

export const THINK_MS = 30_000;
export const SING_MIN_MS = 10_000;
export const SING_MAX_MS = 40_000;

export { containsChallengeWord };

export const GAME_STATES: readonly GameState[] = [
  'IDLE',
  'ROUND_START',
  'PLAYER_PREPARING',
  'PLAYER_COUNTDOWN',
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
  PLAYER_PREPARING: ['PLAYER_COUNTDOWN', 'PLAYER_SINGING', 'ROUND_FAILED'],
  PLAYER_COUNTDOWN: ['PLAYER_SINGING', 'ROUND_FAILED'],
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
  pickingPlayer: null as PlayerId | null,
  challengePhrase: SEED_CHALLENGE,
  transcriptWords: [] as string[],
  scores: { A: 0, B: 0 },
  lastPoints: 0,
  syncRevision: 0,
  thinkDeadlineAt: null as number | null,
  countdownEndsAt: null as number | null,
  singStartedAt: null as number | null,
  failReason: null as FailReason | null,
  winner: null as PlayerId | null,
};

function otherPlayer(player: PlayerId): PlayerId {
  return player === 'A' ? 'B' : 'A';
}

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

type GameStore = {
  state: GameState;
  activePlayer: PlayerId;
  pickingPlayer: PlayerId | null;
  challengePhrase: string;
  transcriptWords: string[];
  scores: { A: number; B: number };
  lastPoints: number;
  syncRevision: number;
  thinkDeadlineAt: number | null;
  countdownEndsAt: number | null;
  singStartedAt: number | null;
  failReason: FailReason | null;
  winner: PlayerId | null;
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
  applyPerformanceTranscript: (words: string[]) => boolean;
  confirmEditedTranscript: (editedText: string) => boolean;
  passChallengeToOpponent: (phrase: string, multiplier: number) => boolean;
  handOffToOpponent: (now?: number) => boolean;
  applyRemoteSnapshot: (snapshot: MatchSnapshot) => boolean;
  takePublishableSnapshot: () => MatchSnapshot;
  beginThinkPhase: (now: number) => boolean;
  beginCountdown: (now: number) => boolean;
  startTimedSinging: (now: number) => boolean;
  finishTimedSinging: (now: number) => boolean;
  autoStopSingMax: (now: number) => boolean;
  failThinkTimeout: (now: number) => boolean;
  failSingTooShort: (now: number) => boolean;
  opponentSelectWord: (word: string, now?: number) => boolean;
};

function endMatchLoss(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  reason: FailReason,
): boolean {
  if (!get().failRound()) {
    return false;
  }
  set({
    failReason: reason,
    winner: otherPlayer(get().activePlayer),
    thinkDeadlineAt: null,
    countdownEndsAt: null,
    singStartedAt: null,
    pickingPlayer: null,
  });
  return get().completeMatch();
}

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

  reset: () =>
    set({
      state: 'IDLE',
      ...MATCH_DEFAULTS,
      transcriptWords: [],
    }),

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

  beginThinkPhase: (now) => {
    if (get().state !== 'ROUND_START' && get().state !== 'PLAYER_PREPARING') {
      if (!get().beginPreparing() && get().state !== 'PLAYER_PREPARING') {
        return false;
      }
    }
    if (get().state === 'ROUND_START' && !get().beginPreparing()) {
      return false;
    }
    set({
      thinkDeadlineAt: now + THINK_MS,
      countdownEndsAt: null,
      singStartedAt: null,
      failReason: null,
      winner: null,
      pickingPlayer: null,
    });
    return get().state === 'PLAYER_PREPARING';
  },

  beginCountdown: (now) => {
    if (get().state !== 'PLAYER_PREPARING') {
      return false;
    }
    if (!get().transitionTo('PLAYER_COUNTDOWN')) {
      return false;
    }
    set({
      countdownEndsAt: now + 3_000,
      thinkDeadlineAt: null,
    });
    return true;
  },

  startTimedSinging: (now) => {
    if (get().state !== 'PLAYER_COUNTDOWN' && get().state !== 'PLAYER_PREPARING') {
      return false;
    }
    if (get().state === 'PLAYER_COUNTDOWN') {
      if (!get().transitionTo('PLAYER_SINGING')) {
        return false;
      }
    } else if (!get().startSinging()) {
      return false;
    }
    set({
      singStartedAt: now,
      countdownEndsAt: null,
      thinkDeadlineAt: null,
    });
    return true;
  },

  finishTimedSinging: (now) => {
    const started = get().singStartedAt;
    if (get().state !== 'PLAYER_SINGING' || started == null) {
      return false;
    }
    if (now - started < SING_MIN_MS) {
      return false;
    }
    return get().finishSinging();
  },

  autoStopSingMax: (now) => {
    const started = get().singStartedAt;
    if (get().state !== 'PLAYER_SINGING' || started == null) {
      return false;
    }
    if (now - started < SING_MAX_MS) {
      return false;
    }
    return get().finishSinging();
  },

  failThinkTimeout: (now) => {
    const deadline = get().thinkDeadlineAt;
    if (get().state !== 'PLAYER_PREPARING' || deadline == null || now < deadline) {
      return false;
    }
    return endMatchLoss(set, get, 'think_timeout');
  },

  failSingTooShort: (now) => {
    const started = get().singStartedAt;
    if (get().state !== 'PLAYER_SINGING' || started == null) {
      return false;
    }
    if (now - started >= SING_MIN_MS) {
      return false;
    }
    return endMatchLoss(set, get, 'sing_too_short');
  },

  recordDemoPerformance: () => {
    return get().applyPerformanceTranscript(mockTranscribe().words);
  },

  applyPerformanceTranscript: (words) => {
    if (get().state !== 'PLAYER_SINGING') {
      return false;
    }
    if (!get().finishSinging()) {
      return false;
    }
    set({
      transcriptWords: words,
      lastPoints: BASE_POINTS,
    });
    return get().verifyPerformance();
  },

  confirmEditedTranscript: (editedText) => {
    if (get().state !== 'PERFORMANCE_VERIFIED') {
      return false;
    }
    if (!containsChallengePhrase(editedText, get().challengePhrase)) {
      return false;
    }
    const singer = get().activePlayer;
    set({
      transcriptWords: wordsFromText(editedText),
      pickingPlayer: otherPlayer(singer),
    });
    return get().beginWordSelection();
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
      pickingPlayer: null,
      scores: {
        ...current.scores,
        [player]: current.scores[player] + points,
      },
    }));
    return get().sendChallenge();
  },

  opponentSelectWord: (word, now) => {
    if (get().state !== 'WORD_SELECTION' || !get().pickingPlayer) {
      return false;
    }
    const normalized = word
      .trim()
      .toLowerCase()
      .replace(/[^\w]/g, '');
    if (!normalized) {
      return false;
    }
    const tokens = get().transcriptWords.map((token) =>
      token.toLowerCase().replace(/[^\w]/g, ''),
    );
    if (!tokens.includes(normalized)) {
      return false;
    }
    const singer = get().activePlayer;
    set((current) => ({
      challengePhrase: normalized,
      lastPoints: BASE_POINTS,
      pickingPlayer: null,
      scores: {
        ...current.scores,
        [singer]: current.scores[singer] + BASE_POINTS,
      },
    }));
    if (!get().sendChallenge()) {
      return false;
    }
    return get().handOffToOpponent(now);
  },

  handOffToOpponent: (now) => {
    if (get().state !== 'CHALLENGE_SENT') {
      return false;
    }
    if (!get().beginOpponentTurn()) {
      return false;
    }
    set((current) => ({
      activePlayer: otherPlayer(current.activePlayer),
      transcriptWords: [],
      lastPoints: 0,
      pickingPlayer: null,
      thinkDeadlineAt: null,
      countdownEndsAt: null,
      singStartedAt: null,
    }));
    if (!get().completeOpponentTurn()) {
      return false;
    }
    return get().beginThinkPhase(now ?? Date.now());
  },

  applyRemoteSnapshot: (snapshot) => {
    const incoming = snapshot.revision ?? 0;
    if (incoming <= get().syncRevision) {
      return false;
    }
    set({
      state: snapshot.gameState,
      activePlayer: snapshot.activePlayer,
      pickingPlayer: snapshot.pickingPlayer ?? null,
      challengePhrase: snapshot.challengePhrase,
      scores: { ...snapshot.scores },
      transcriptWords: [...snapshot.transcriptWords],
      thinkDeadlineAt: snapshot.thinkDeadlineAt ?? null,
      syncRevision: incoming,
      lastPoints: 0,
    });
    return true;
  },

  takePublishableSnapshot: () => {
    const revision = get().syncRevision + 1;
    set({ syncRevision: revision });
    return readMatchSnapshot(get());
  },
}));
