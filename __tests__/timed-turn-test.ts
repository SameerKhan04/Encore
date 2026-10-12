import {
  SING_MAX_MS,
  SING_MIN_MS,
  THINK_MS,
  containsChallengeWord,
  useGameStore,
} from '@/store/gameStore';

describe('timed turn constants', () => {
  it('uses 30s think and 10–40s sing windows', () => {
    expect(THINK_MS).toBe(30_000);
    expect(SING_MIN_MS).toBe(10_000);
    expect(SING_MAX_MS).toBe(40_000);
  });
});

describe('containsChallengeWord', () => {
  it('matches the challenge word anywhere as a whole word', () => {
    expect(containsChallengeWord('I love the night', 'love')).toBe(true);
    expect(containsChallengeWord('LOVE is all', 'love')).toBe(true);
  });

  it('does not match substrings inside other words', () => {
    expect(containsChallengeWord('gloves on sale', 'love')).toBe(false);
  });
});

describe('timed turn store', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts a think window when preparing', () => {
    const now = 1_000_000;
    useGameStore.getState().startPartyMatch();
    expect(useGameStore.getState().beginThinkPhase(now)).toBe(true);

    const game = useGameStore.getState();
    expect(game.state).toBe('PLAYER_PREPARING');
    expect(game.thinkDeadlineAt).toBe(now + THINK_MS);
    expect(game.pickingPlayer).toBeNull();
  });

  it('fails the round when think time expires', () => {
    const now = 1_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);

    expect(useGameStore.getState().failThinkTimeout(now + THINK_MS)).toBe(true);
    const game = useGameStore.getState();
    expect(game.state).toBe('MATCH_COMPLETE');
    expect(game.failReason).toBe('think_timeout');
    expect(game.winner).toBe('B');
  });

  it('starts singing with a singStartedAt timestamp after countdown', () => {
    const now = 2_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);
    expect(useGameStore.getState().beginCountdown(now)).toBe(true);
    expect(useGameStore.getState().state).toBe('PLAYER_COUNTDOWN');

    expect(useGameStore.getState().startTimedSinging(now + 3_000)).toBe(true);
    const game = useGameStore.getState();
    expect(game.state).toBe('PLAYER_SINGING');
    expect(game.singStartedAt).toBe(now + 3_000);
  });

  it('rejects finishing a sing before the minimum duration', () => {
    const now = 3_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);
    useGameStore.getState().beginCountdown(now);
    useGameStore.getState().startTimedSinging(now);

    expect(useGameStore.getState().finishTimedSinging(now + 5_000)).toBe(false);
    expect(useGameStore.getState().state).toBe('PLAYER_SINGING');
  });

  it('fails when sing ends under the minimum duration via failSingTooShort', () => {
    const now = 4_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);
    useGameStore.getState().beginCountdown(now);
    useGameStore.getState().startTimedSinging(now);

    expect(useGameStore.getState().failSingTooShort(now + 4_000)).toBe(true);
    expect(useGameStore.getState().failReason).toBe('sing_too_short');
    expect(useGameStore.getState().winner).toBe('B');
    expect(useGameStore.getState().state).toBe('MATCH_COMPLETE');
  });

  it('finishes singing once the minimum duration has elapsed', () => {
    const now = 5_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);
    useGameStore.getState().beginCountdown(now);
    useGameStore.getState().startTimedSinging(now);

    expect(useGameStore.getState().finishTimedSinging(now + SING_MIN_MS)).toBe(
      true,
    );
    expect(useGameStore.getState().state).toBe('PROCESSING_AUDIO');
  });

  it('auto-stops singing at the maximum duration', () => {
    const now = 6_000_000;
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().beginThinkPhase(now);
    useGameStore.getState().beginCountdown(now);
    useGameStore.getState().startTimedSinging(now);

    expect(useGameStore.getState().autoStopSingMax(now + SING_MAX_MS)).toBe(
      true,
    );
    expect(useGameStore.getState().state).toBe('PROCESSING_AUDIO');
  });

  it('lets the opponent pick one challenge word after verify', () => {
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().forceState('PERFORMANCE_VERIFIED');
    useGameStore.setState({
      activePlayer: 'A',
      challengePhrase: 'love',
      transcriptWords: ['all', 'you', 'need', 'is', 'love', 'tonight'],
    });

    expect(
      useGameStore
        .getState()
        .confirmEditedTranscript('all you need is love tonight'),
    ).toBe(true);

    const afterConfirm = useGameStore.getState();
    expect(afterConfirm.state).toBe('WORD_SELECTION');
    expect(afterConfirm.pickingPlayer).toBe('B');
    expect(afterConfirm.activePlayer).toBe('A');

    const handoffNow = 7_000_000;
    expect(useGameStore.getState().opponentSelectWord('tonight', handoffNow)).toBe(
      true,
    );
    const afterPick = useGameStore.getState();
    expect(afterPick.challengePhrase).toBe('tonight');
    expect(afterPick.state).toBe('PLAYER_PREPARING');
    expect(afterPick.activePlayer).toBe('B');
    expect(afterPick.pickingPlayer).toBeNull();
    expect(afterPick.scores.A).toBe(10);
    expect(afterPick.thinkDeadlineAt).toBe(handoffNow + THINK_MS);
  });

  it('starts a 30s think window after handOffToOpponent', () => {
    const now = 8_000_000;
    useGameStore.getState().forceState('CHALLENGE_SENT');
    useGameStore.setState({ activePlayer: 'A' });

    expect(useGameStore.getState().handOffToOpponent(now)).toBe(true);
    const game = useGameStore.getState();
    expect(game.state).toBe('PLAYER_PREPARING');
    expect(game.activePlayer).toBe('B');
    expect(game.thinkDeadlineAt).toBe(now + THINK_MS);
  });

  it('rejects opponent word picks that are not in the transcript', () => {
    useGameStore.getState().forceState('WORD_SELECTION');
    useGameStore.setState({
      activePlayer: 'A',
      pickingPlayer: 'B',
      transcriptWords: ['love', 'tonight'],
    });

    expect(useGameStore.getState().opponentSelectWord('banana')).toBe(false);
    expect(useGameStore.getState().state).toBe('WORD_SELECTION');
  });
});
