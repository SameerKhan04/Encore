import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import PartyScreen from '@/app/party';
import { WordPicker } from '@/components/WordPicker';
import { mockTranscribe } from '@/services/mockTranscription';
import { useGameStore } from '@/store/gameStore';

describe('<WordPicker />', () => {
  const words = mockTranscribe().words;
  const onSelect = jest.fn();

  beforeEach(() => {
    onSelect.mockReset();
  });

  it('renders each transcript word as a single-choice chip', async () => {
    const { getByText, getByTestId } = await render(
      <WordPicker words={words} onSelectWord={onSelect} />,
    );

    for (const word of words) {
      expect(getByText(word)).toBeTruthy();
    }
    expect(getByTestId('word-picker-hint')).toHaveTextContent(
      /pick one word/i,
    );
  });

  it('highlights exactly one selected word', async () => {
    const { getByText, getByTestId } = await render(
      <WordPicker words={words} onSelectWord={onSelect} />,
    );

    await act(async () => {
      fireEvent.press(getByText('hold'));
    });
    await act(async () => {
      fireEvent.press(getByText('your'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-word')).toHaveTextContent('your');
    });
  });

  it('commits the single word on Send challenge', async () => {
    const { getByText } = await render(
      <WordPicker words={words} onSelectWord={onSelect} />,
    );

    await act(async () => {
      fireEvent.press(getByText('forever'));
    });
    await act(async () => {
      fireEvent.press(getByText('Send challenge'));
    });

    expect(onSelect).toHaveBeenCalledWith('forever');
  });

  it('does not send until a word is selected', async () => {
    const { getByText } = await render(
      <WordPicker words={words} onSelectWord={onSelect} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Send challenge'));
    });

    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('<PartyScreen /> opponent word pick', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('lets the opponent pick one word after lyrics confirm', async () => {
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

    await waitFor(() => {
      expect(useGameStore.getState().pickingPlayer).toBe('B');
      expect(getByTestId('word-picker-hint')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('forever'));
    });
    await act(async () => {
      fireEvent.press(getByText('Send challenge'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().challengePhrase).toBe('forever');
      expect(useGameStore.getState().activePlayer).toBe('B');
      expect(useGameStore.getState().state).toBe('PLAYER_PREPARING');
      expect(getByTestId('active-player')).toHaveTextContent('Player B');
    });
  });
});
