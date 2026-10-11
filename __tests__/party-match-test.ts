import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

describe('party match store flow', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts a party match for Player A with a seed challenge', () => {
    useGameStore.getState().startPartyMatch();

    const match = useGameStore.getState();
    expect(match.state).toBe('ROUND_START');
    expect(match.activePlayer).toBe('A');
    expect(match.challengePhrase).toBe('love');
    expect(match.scores).toEqual({ A: 0, B: 0 });
    expect(match.transcriptWords).toEqual([]);
  });

  it('runs a demo performance into verified lyrics', () => {
    const store = useGameStore.getState();
    store.startPartyMatch();
    store.beginPreparing();
    store.startSinging();
    store.recordDemoPerformance();

    const match = useGameStore.getState();
    expect(match.state).toBe('PERFORMANCE_VERIFIED');
    expect(match.transcriptWords).toEqual(mockTranscribe().words);
    expect(match.lastPoints).toBeGreaterThan(0);
  });

  it('passes a challenge, awards points, and hands off to Player B', () => {
    const store = useGameStore.getState();
    store.startPartyMatch();
    store.beginPreparing();
    store.startSinging();
    store.recordDemoPerformance();
    store.beginWordSelection();
    store.passChallengeToOpponent('hold your hand', 4);
    store.handOffToOpponent();

    const match = useGameStore.getState();
    expect(match.state).toBe('PLAYER_PREPARING');
    expect(match.activePlayer).toBe('B');
    expect(match.challengePhrase).toBe('hold your hand');
    expect(match.scores.A).toBe(40);
    expect(match.scores.B).toBe(0);
  });

  it('completes the match from a challenge-sent state', () => {
    const store = useGameStore.getState();
    store.startPartyMatch();
    store.forceState('CHALLENGE_SENT');
    expect(store.completeMatch()).toBe(true);
    expect(useGameStore.getState().state).toBe('MATCH_COMPLETE');
  });
});
