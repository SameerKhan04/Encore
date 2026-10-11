import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { PhraseSelector } from '@/components/PhraseSelector';
import { mockTranscribe } from '@/services/mockTranscription';

describe('<PhraseSelector />', () => {
  const words = mockTranscribe().words;
  const onPass = jest.fn();

  beforeEach(() => {
    onPass.mockReset();
  });

  it('renders each transcript word for direct interaction', async () => {
    const { getByText } = await render(
      <PhraseSelector words={words} onPassChallenge={onPass} />,
    );

    for (const word of words) {
      expect(getByText(word)).toBeTruthy();
    }
  });

  it('updates the live multiplier when a consecutive phrase grows', async () => {
    const { getByText, getByTestId } = await render(
      <PhraseSelector words={words} onPassChallenge={onPass} />,
    );

    await act(async () => {
      fireEvent.press(getByText('hold'));
    });
    await waitFor(() => {
      expect(getByTestId('phrase-multiplier')).toHaveTextContent('1x');
    });

    await act(async () => {
      fireEvent.press(getByText('your'));
    });
    await act(async () => {
      fireEvent.press(getByText('hand'));
    });

    await waitFor(() => {
      expect(getByTestId('phrase-multiplier')).toHaveTextContent('4x');
      expect(getByTestId('selected-phrase')).toHaveTextContent(
        'hold your hand',
      );
    });
  });

  it('does not expand across a gap when a non-adjacent word is tapped', async () => {
    const { getByText, getByTestId } = await render(
      <PhraseSelector words={words} onPassChallenge={onPass} />,
    );

    await act(async () => {
      fireEvent.press(getByText('hold'));
    });
    await act(async () => {
      fireEvent.press(getByText('forever'));
    });

    await waitFor(() => {
      expect(getByTestId('selected-phrase')).toHaveTextContent('forever');
      expect(getByTestId('phrase-multiplier')).toHaveTextContent('1x');
    });
  });

  it('commits the exact consecutive phrase on Pass Challenge', async () => {
    const { getByText } = await render(
      <PhraseSelector words={words} onPassChallenge={onPass} />,
    );

    await act(async () => {
      fireEvent.press(getByText('hold'));
    });
    await act(async () => {
      fireEvent.press(getByText('your'));
    });
    await act(async () => {
      fireEvent.press(getByText('Pass Challenge'));
    });

    expect(onPass).toHaveBeenCalledWith({
      phrase: 'hold your',
      wordCount: 2,
      multiplier: 2,
    });
  });

  it('disables Pass Challenge until a word is selected', async () => {
    const { getByText } = await render(
      <PhraseSelector words={words} onPassChallenge={onPass} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Pass Challenge'));
    });

    expect(onPass).not.toHaveBeenCalled();
  });
});
