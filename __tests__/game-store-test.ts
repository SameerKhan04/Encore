import {
  GAME_STATES,
  canTransition,
  useGameStore,
  type GameState,
} from '@/store/gameStore';

const ALL_STATES: GameState[] = [
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
];

describe('game store state machine', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('exposes the full GameState union as GAME_STATES', () => {
    expect(GAME_STATES).toEqual(ALL_STATES);
  });

  it('starts in IDLE', () => {
    expect(useGameStore.getState().state).toBe('IDLE');
  });

  it('allows the happy-path party loop transitions', () => {
    const store = useGameStore.getState();

    expect(store.transitionTo('ROUND_START')).toBe(true);
    expect(store.transitionTo('PLAYER_PREPARING')).toBe(true);
    expect(store.transitionTo('PLAYER_SINGING')).toBe(true);
    expect(store.transitionTo('PROCESSING_AUDIO')).toBe(true);
    expect(store.transitionTo('PERFORMANCE_VERIFIED')).toBe(true);
    expect(store.transitionTo('WORD_SELECTION')).toBe(true);
    expect(store.transitionTo('CHALLENGE_SENT')).toBe(true);
    expect(store.transitionTo('OPPONENT_SINGING')).toBe(true);
    expect(store.transitionTo('PLAYER_PREPARING')).toBe(true);
    expect(useGameStore.getState().state).toBe('PLAYER_PREPARING');
  });

  it('rejects illegal transitions and keeps the current state', () => {
    expect(useGameStore.getState().transitionTo('PLAYER_SINGING')).toBe(false);
    expect(useGameStore.getState().state).toBe('IDLE');
  });

  it('allows failure and match-complete exits from active play', () => {
    useGameStore.getState().forceState('PLAYER_SINGING');
    expect(useGameStore.getState().transitionTo('ROUND_FAILED')).toBe(true);

    useGameStore.getState().forceState('CHALLENGE_SENT');
    expect(useGameStore.getState().transitionTo('MATCH_COMPLETE')).toBe(true);
  });

  it('resets from MATCH_COMPLETE back to IDLE', () => {
    useGameStore.getState().forceState('MATCH_COMPLETE');
    expect(useGameStore.getState().transitionTo('IDLE')).toBe(true);
    expect(useGameStore.getState().state).toBe('IDLE');
  });

  it('forceState sets any state for debug without transition rules', () => {
    useGameStore.getState().forceState('WORD_SELECTION');
    expect(useGameStore.getState().state).toBe('WORD_SELECTION');
  });

  it('canTransition reports legal edges without mutating state', () => {
    expect(canTransition('IDLE', 'ROUND_START')).toBe(true);
    expect(canTransition('IDLE', 'WORD_SELECTION')).toBe(false);
    expect(useGameStore.getState().state).toBe('IDLE');
  });

  it('provides named actions that advance along the happy path', () => {
    const {
      startRound,
      beginPreparing,
      startSinging,
      finishSinging,
      verifyPerformance,
      beginWordSelection,
      sendChallenge,
      beginOpponentTurn,
      completeOpponentTurn,
    } = useGameStore.getState();

    expect(startRound()).toBe(true);
    expect(beginPreparing()).toBe(true);
    expect(startSinging()).toBe(true);
    expect(finishSinging()).toBe(true);
    expect(verifyPerformance()).toBe(true);
    expect(beginWordSelection()).toBe(true);
    expect(sendChallenge()).toBe(true);
    expect(beginOpponentTurn()).toBe(true);
    expect(completeOpponentTurn()).toBe(true);
    expect(useGameStore.getState().state).toBe('PLAYER_PREPARING');
  });
});
