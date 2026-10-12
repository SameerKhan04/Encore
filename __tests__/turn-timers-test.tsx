import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import PartyScreen from '@/app/party';
import {
  TurnTimers,
  formatTimerSeconds,
  remainingMs,
  shouldShowSingTimer,
} from '@/components/TurnTimers';
import {
  SING_MAX_MS,
  SING_MIN_MS,
  THINK_MS,
  useGameStore,
} from '@/store/gameStore';

describe('timer helpers', () => {
  it('computes remaining ms clamped at zero', () => {
    expect(remainingMs(1_000_030, 1_000_000)).toBe(30);
    expect(remainingMs(1_000_000, 1_000_050)).toBe(0);
  });

  it('formats whole seconds for display', () => {
    expect(formatTimerSeconds(30_000)).toBe('30');
    expect(formatTimerSeconds(9_500)).toBe('10');
    expect(formatTimerSeconds(0)).toBe('0');
  });

  it('hides the sing timer while transcribing', () => {
    expect(
      shouldShowSingTimer({ state: 'PLAYER_SINGING', processing: false }),
    ).toBe(true);
    expect(
      shouldShowSingTimer({ state: 'PLAYER_SINGING', processing: true }),
    ).toBe(false);
    expect(
      shouldShowSingTimer({ state: 'PROCESSING_AUDIO', processing: false }),
    ).toBe(false);
  });
});

describe('<TurnTimers />', () => {
  it('shows the think countdown', async () => {
    const { getByTestId } = await render(
      <TurnTimers mode="think" remainingMs={THINK_MS} />,
    );

    expect(getByTestId('turn-timer')).toHaveTextContent(/Think:\s*30s/i);
  });

  it('shows the pre-sing countdown', async () => {
    const { getByTestId } = await render(
      <TurnTimers mode="countdown" remainingMs={2_000} />,
    );

    expect(getByTestId('turn-timer')).toHaveTextContent(/Countdown:\s*2/i);
  });

  it('shows sing elapsed against the max window and min gate', async () => {
    const { getByTestId } = await render(
      <TurnTimers
        mode="sing"
        elapsedMs={SING_MIN_MS}
        maxMs={SING_MAX_MS}
        minMs={SING_MIN_MS}
      />,
    );

    expect(getByTestId('turn-timer')).toHaveTextContent(/Sing:\s*10s\s*\/\s*40s/i);
    expect(getByTestId('sing-min-met')).toHaveTextContent(/ready to stop/i);
  });

  it('invokes onExpired when remaining hits zero in think mode', async () => {
    const onExpired = jest.fn();
    await render(
      <TurnTimers mode="think" remainingMs={0} onExpired={onExpired} />,
    );

    expect(onExpired).toHaveBeenCalledTimes(1);
  });
});

describe('<PartyScreen /> timed turns', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("starts a think window when the singer taps I'm ready", async () => {
    const { getByText, getByTestId } = await render(<PartyScreen />);

    await act(async () => {
      fireEvent.press(getByText('Start Party Match'));
    });
    await act(async () => {
      fireEvent.press(getByText("I'm ready"));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('PLAYER_PREPARING');
      expect(useGameStore.getState().thinkDeadlineAt).not.toBeNull();
      expect(getByTestId('turn-timer')).toHaveTextContent(/Think:/i);
    });
  });

  it('moves into countdown then singing from the think phase', async () => {
    const { getByText, getByTestId } = await render(<PartyScreen />);

    await act(async () => {
      fireEvent.press(getByText('Start Party Match'));
    });
    await act(async () => {
      fireEvent.press(getByText("I'm ready"));
    });
    await act(async () => {
      fireEvent.press(getByText('Start singing'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('PLAYER_COUNTDOWN');
      expect(getByTestId('turn-timer')).toHaveTextContent(/Countdown:/i);
    });
  });
});
