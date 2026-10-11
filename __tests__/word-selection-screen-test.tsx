import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import WordSelectionScreen from '@/app/word-selection';
import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

describe('<WordSelectionScreen />', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().forceState('WORD_SELECTION');
  });

  it('shows the mock transcript for phrase picking', async () => {
    const { getByText } = await render(<WordSelectionScreen />);
    const words = mockTranscribe().words;

    expect(getByText(words[0])).toBeTruthy();
    expect(getByText(words[words.length - 1])).toBeTruthy();
  });

  it('passes the challenge into CHALLENGE_SENT with the selected phrase', async () => {
    const { getByText, getByTestId } = await render(<WordSelectionScreen />);

    await act(async () => {
      fireEvent.press(getByText('want'));
    });
    await act(async () => {
      fireEvent.press(getByText('to'));
    });
    await act(async () => {
      fireEvent.press(getByText('Pass Challenge'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('CHALLENGE_SENT');
      expect(getByTestId('passed-challenge')).toHaveTextContent('want to');
    });
  });
});
