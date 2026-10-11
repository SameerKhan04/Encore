import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { TranscriptReview } from '@/components/TranscriptReview';

describe('<TranscriptReview />', () => {
  const onConfirm = jest.fn();

  beforeEach(() => {
    onConfirm.mockReset();
  });

  it('lets the player edit lyrics before confirming', async () => {
    const { getByDisplayValue, getByText } = await render(
      <TranscriptReview
        initialText="I want to hold your hand"
        challengePhrase="hold"
        onConfirm={onConfirm}
      />,
    );

    await act(async () => {
      fireEvent.changeText(
        getByDisplayValue('I want to hold your hand'),
        'I want to hold your hand forever',
      );
    });
    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });

    expect(onConfirm).toHaveBeenCalledWith('I want to hold your hand forever');
  });

  it('shows an error and does not confirm when challenge is missing', async () => {
    const { getByDisplayValue, getByText, queryByText } = await render(
      <TranscriptReview
        initialText="hello world"
        challengePhrase="love"
        onConfirm={onConfirm}
      />,
    );

    await act(async () => {
      fireEvent.changeText(getByDisplayValue('hello world'), 'nope nothing');
    });
    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });

    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        queryByText(/challenge phrase must appear in the lyrics/i),
      ).toBeTruthy();
    });
  });
});
