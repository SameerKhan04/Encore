import {
  isLocalPlayersTurn,
  localSeatForRole,
  readMatchSnapshot,
  snapshotsDiffer,
} from '@/services/onlineSync';
import type { MatchSnapshot } from '@/services/matchRoom';
import { useGameStore } from '@/store/gameStore';

describe('localSeatForRole', () => {
  it('maps host to A and guest to B', () => {
    expect(localSeatForRole('host')).toBe('A');
    expect(localSeatForRole('guest')).toBe('B');
  });
});

describe('isLocalPlayersTurn', () => {
  it('is true only when the active seat matches the local role', () => {
    expect(isLocalPlayersTurn('host', 'A')).toBe(true);
    expect(isLocalPlayersTurn('host', 'B')).toBe(false);
    expect(isLocalPlayersTurn('guest', 'B')).toBe(true);
  });
});

describe('readMatchSnapshot / applyRemoteSnapshot', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('reads the current match fields into a snapshot', () => {
    useGameStore.getState().startPartyMatch();
    useGameStore.setState({
      challengePhrase: 'hold your',
      scores: { A: 20, B: 10 },
      transcriptWords: ['hold', 'your'],
      pickingPlayer: 'B',
    });

    useGameStore.setState({ thinkDeadlineAt: 1_234_000 });

    expect(readMatchSnapshot(useGameStore.getState())).toEqual({
      challengePhrase: 'hold your',
      activePlayer: 'A',
      pickingPlayer: 'B',
      scores: { A: 20, B: 10 },
      gameState: 'ROUND_START',
      transcriptWords: ['hold', 'your'],
      thinkDeadlineAt: 1_234_000,
      revision: expect.any(Number),
    });
  });

  it('applies a remote snapshot onto the game store including pickingPlayer', () => {
    const remote: MatchSnapshot = {
      challengePhrase: 'sing love',
      activePlayer: 'A',
      pickingPlayer: 'B',
      scores: { A: 10, B: 30 },
      gameState: 'WORD_SELECTION',
      transcriptWords: ['sing', 'love'],
      thinkDeadlineAt: 9_000_000,
      revision: 3,
    };

    useGameStore.getState().applyRemoteSnapshot(remote);

    const game = useGameStore.getState();
    expect(game.state).toBe('WORD_SELECTION');
    expect(game.activePlayer).toBe('A');
    expect(game.pickingPlayer).toBe('B');
    expect(game.challengePhrase).toBe('sing love');
    expect(game.transcriptWords).toEqual(['sing', 'love']);
    expect(game.scores).toEqual({ A: 10, B: 30 });
    expect(game.thinkDeadlineAt).toBe(9_000_000);
    expect(game.syncRevision).toBe(3);
  });

  it('ignores older or equal revisions', () => {
    useGameStore.getState().applyRemoteSnapshot({
      challengePhrase: 'first',
      activePlayer: 'A',
      pickingPlayer: null,
      scores: { A: 0, B: 0 },
      gameState: 'ROUND_START',
      transcriptWords: [],
      thinkDeadlineAt: null,
      revision: 5,
    });
    useGameStore.getState().applyRemoteSnapshot({
      challengePhrase: 'stale',
      activePlayer: 'B',
      pickingPlayer: 'A',
      scores: { A: 99, B: 99 },
      gameState: 'MATCH_COMPLETE',
      transcriptWords: ['nope'],
      thinkDeadlineAt: 1,
      revision: 5,
    });

    expect(useGameStore.getState().challengePhrase).toBe('first');
    expect(useGameStore.getState().state).toBe('ROUND_START');
  });
});

describe('snapshotsDiffer', () => {
  it('detects revision changes', () => {
    const a: MatchSnapshot = {
      challengePhrase: 'love',
      activePlayer: 'A',
      pickingPlayer: null,
      scores: { A: 0, B: 0 },
      gameState: 'IDLE',
      transcriptWords: [],
      thinkDeadlineAt: null,
      revision: 1,
    };
    expect(snapshotsDiffer(a, { ...a, revision: 2 })).toBe(true);
    expect(snapshotsDiffer(a, { ...a })).toBe(false);
  });
});
