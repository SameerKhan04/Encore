import { SING_MIN_MS } from '@/store/gameStore';

/** Stop is allowed after the min sing window; max is handled by auto-stop. */
export function canStopSingRecording(opts: {
  singStartedAt: number | null;
  now: number;
}): boolean {
  if (opts.singStartedAt == null) {
    return false;
  }
  return opts.now - opts.singStartedAt >= SING_MIN_MS;
}
