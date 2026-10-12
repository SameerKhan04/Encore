import { SING_MAX_MS, SING_MIN_MS } from '@/store/gameStore';
import { canStopSingRecording } from '@/services/singRecording';

describe('canStopSingRecording', () => {
  it('blocks stop before the minimum sing duration', () => {
    expect(
      canStopSingRecording({
        singStartedAt: 1_000,
        now: 1_000 + SING_MIN_MS - 1,
      }),
    ).toBe(false);
  });

  it('allows stop once the minimum duration has elapsed', () => {
    expect(
      canStopSingRecording({
        singStartedAt: 1_000,
        now: 1_000 + SING_MIN_MS,
      }),
    ).toBe(true);
  });

  it('still allows stop before the max window ends', () => {
    expect(
      canStopSingRecording({
        singStartedAt: 1_000,
        now: 1_000 + SING_MAX_MS - 500,
      }),
    ).toBe(true);
  });
});
