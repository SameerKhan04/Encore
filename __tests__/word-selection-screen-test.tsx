import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import WordSelectionScreen from '@/app/word-selection';
import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

describe('<WordSelectionScreen />', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().forceState('WORD_SELECTION');
    useGameStore.setState({
      activePlayer: 'A',
      pickingPlayer: 'B',
      transcriptWords: mockTranscribe().words,
    });
  });

  it('shows the mock transcript for single-word picking', async () => {
    const { getByText } = await render(<WordSelectionScreen />);
    const words = mockTranscribe().words;

    expect(getByText(words[0])).toBeTruthy();
    expect(getByText(words[words.length - 1])).toBeTruthy();
  });

  it('sends one challenge word and hands off to the opponent', async () => {
    const { getByText, getByTestId } = await render(<WordSelectionScreen />);

    await act(async () => {
      fireEvent.press(getByText('want'));
    });
    await act(async () => {
      fireEvent.press(getByText('Send challenge'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().challengePhrase).toBe('want');
      expect(useGameStore.getState().activePlayer).toBe('B');
      expect(getByTestId('passed-challenge')).toHaveTextContent('want');
    });
  });
});
