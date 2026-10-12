import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export type TurnTimerMode = 'think' | 'countdown' | 'sing';

export function remainingMs(deadlineAt: number, now: number): number {
  return Math.max(0, deadlineAt - now);
}

/** Hide the sing countdown while Gemini is transcribing. */
export function shouldShowSingTimer(opts: {
  state: string;
  processing: boolean;
}): boolean {
  return opts.state === 'PLAYER_SINGING' && !opts.processing;
}

export function formatTimerSeconds(ms: number): string {
  return String(Math.ceil(ms / 1000));
}

type TurnTimersProps = {
  mode: TurnTimerMode;
  remainingMs?: number;
  elapsedMs?: number;
  minMs?: number;
  maxMs?: number;
  onExpired?: () => void;
};

export function TurnTimers({
  mode,
  remainingMs: remaining = 0,
  elapsedMs = 0,
  minMs = 0,
  maxMs = 0,
  onExpired,
}: TurnTimersProps) {
  useEffect(() => {
    if (mode === 'think' && remaining <= 0 && onExpired) {
      onExpired();
    }
  }, [mode, remaining, onExpired]);

  if (mode === 'think') {
    return (
      <Text testID="turn-timer" style={styles.timer}>
        {`Think: ${formatTimerSeconds(remaining)}s`}
      </Text>
    );
  }

  if (mode === 'countdown') {
    return (
      <Text testID="turn-timer" style={styles.timer}>
        {`Countdown: ${formatTimerSeconds(remaining)}`}
      </Text>
    );
  }

  const minMet = elapsedMs >= minMs;
  return (
    <>
      <Text testID="turn-timer" style={styles.timer}>
        {`Sing: ${formatTimerSeconds(elapsedMs)}s / ${formatTimerSeconds(maxMs)}s`}
      </Text>
      {minMet ? (
        <Text testID="sing-min-met" style={styles.caption}>
          Ready to stop
        </Text>
      ) : (
        <Text testID="sing-min-met" style={styles.caption}>
          {`Keep singing (${formatTimerSeconds(Math.max(0, minMs - elapsedMs))}s left)`}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.accent,
    marginVertical: spacing.sm,
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
