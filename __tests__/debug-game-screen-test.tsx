import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import DebugGameScreen from '@/app/debug-game';
import { GAME_STATES, useGameStore } from '@/store/gameStore';

describe('<DebugGameScreen />', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('shows the current game state label', async () => {
    const { getByText } = await render(<DebugGameScreen />);

    expect(getByText('State: IDLE')).toBeTruthy();
  });

  it('renders a force button for every GameState', async () => {
    const { getByText } = await render(<DebugGameScreen />);

    for (const state of GAME_STATES) {
      expect(getByText(`Force ${state}`)).toBeTruthy();
    }
  });

  it('updates the label when a force button is pressed', async () => {
    const { getByText, getByTestId } = await render(<DebugGameScreen />);

    await act(async () => {
      fireEvent.press(getByText('Force WORD_SELECTION'));
    });

    expect(useGameStore.getState().state).toBe('WORD_SELECTION');
    await waitFor(() => {
      expect(getByTestId('game-state-label')).toHaveTextContent(
        'State: WORD_SELECTION',
      );
    });
  });

  it('resets back to IDLE via the reset control', async () => {
    useGameStore.getState().forceState('MATCH_COMPLETE');
    const { getByText, getByTestId } = await render(<DebugGameScreen />);

    await act(async () => {
      fireEvent.press(getByText('Reset'));
    });

    expect(useGameStore.getState().state).toBe('IDLE');
    await waitFor(() => {
      expect(getByTestId('game-state-label')).toHaveTextContent('State: IDLE');
    });
  });
});

