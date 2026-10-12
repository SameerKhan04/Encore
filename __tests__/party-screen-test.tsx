import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import PartyScreen from '@/app/party';
import { useGameStore } from '@/store/gameStore';

describe('<PartyScreen />', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts a pass-and-play match from the lobby', async () => {
    const { getByText } = await render(<PartyScreen />);

    await act(async () => {
      fireEvent.press(getByText('Start Party Match'));
    });

    await waitFor(() => {
      expect(getByText(/Player A/i)).toBeTruthy();
      expect(getByText(/Challenge:\s*love/i)).toBeTruthy();
      expect(useGameStore.getState().state).toBe('ROUND_START');
    });
  });

  it('plays through a full A to B handoff with mock singing', async () => {
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
    await act(async () => {
      useGameStore.getState().startTimedSinging(Date.now());
    });
    await act(async () => {
      fireEvent.press(getByText('Demo sing (mock lyrics)'));
    });

    await waitFor(() => {
      expect(getByText(/Performance verified/i)).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });
    await act(async () => {
      fireEvent.press(getByText('forever'));
    });
    await act(async () => {
      fireEvent.press(getByText('Send challenge'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().activePlayer).toBe('B');
      expect(useGameStore.getState().challengePhrase).toBe('forever');
      expect(getByTestId('active-player')).toHaveTextContent('Player B');
      expect(getByText(/Challenge:\s*forever/i)).toBeTruthy();
    });
  });

  it('can end the match and show final scores', async () => {
    useGameStore.getState().startPartyMatch();
    useGameStore.getState().forceState('CHALLENGE_SENT');
    useGameStore.setState({ scores: { A: 40, B: 20 } });

    const { getByText, getByTestId } = await render(<PartyScreen />);

    await act(async () => {
      fireEvent.press(getByText('End match'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('MATCH_COMPLETE');
      expect(getByTestId('final-scores')).toHaveTextContent('A 40 · B 20');
    });
  });
});
