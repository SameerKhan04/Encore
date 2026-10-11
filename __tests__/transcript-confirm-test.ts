import { useGameStore } from '@/store/gameStore';

describe('confirmEditedTranscript', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('rejects edits that omit the challenge phrase', () => {
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().forceState('PERFORMANCE_VERIFIED');

    const ok = useGameStore
      .getState()
      .confirmEditedTranscript('hello world without the word');

    expect(ok).toBe(false);
    expect(useGameStore.getState().state).toBe('PERFORMANCE_VERIFIED');
  });

  it('applies edited words and advances to WORD_SELECTION', () => {
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().forceState('PERFORMANCE_VERIFIED');

    const ok = useGameStore
      .getState()
      .confirmEditedTranscript('all you need is love tonight');

    expect(ok).toBe(true);
    expect(useGameStore.getState().transcriptWords).toEqual([
      'all',
      'you',
      'need',
      'is',
      'love',
      'tonight',
    ]);
    expect(useGameStore.getState().state).toBe('WORD_SELECTION');
  });
});
