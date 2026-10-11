import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { TranscriptReview } from '@/components/TranscriptReview';
import type { LyricsVerifyResult } from '@/services/lyricsVerify';

describe('<TranscriptReview /> soft lyrics verify', () => {
  const onConfirm = jest.fn();

  beforeEach(() => {
    onConfirm.mockReset();
  });

  it('confirms immediately when the soft verifier says lyrics look fine', async () => {
    const verifyLyrics = jest.fn(
      async (): Promise<LyricsVerifyResult> => ({ looksLikeLyrics: true }),
    );

    const { getByText } = await render(
      <TranscriptReview
        initialText="I want to hold your hand"
        challengePhrase="hold"
        onConfirm={onConfirm}
        verifyLyrics={verifyLyrics}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });

    await waitFor(() => {
      expect(verifyLyrics).toHaveBeenCalledWith('I want to hold your hand');
      expect(onConfirm).toHaveBeenCalledWith('I want to hold your hand');
    });
  });

  it('warns and waits when lyrics look doubtful', async () => {
    const verifyLyrics = jest.fn(
      async (): Promise<LyricsVerifyResult> => ({
        looksLikeLyrics: false,
        reason: 'Sounds like spoken notes, not a song',
      }),
    );

    const { getByText, queryByText } = await render(
      <TranscriptReview
        initialText="I want to hold your hand"
        challengePhrase="hold"
        onConfirm={onConfirm}
        verifyLyrics={verifyLyrics}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });

    await waitFor(() => {
      expect(
        queryByText(/Sounds like spoken notes, not a song/i),
      ).toBeTruthy();
      expect(queryByText(/Continue anyway/i)).toBeTruthy();
      expect(queryByText(/^Edit$/i)).toBeTruthy();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('continues when the player accepts the soft warning', async () => {
    const verifyLyrics = jest.fn(
      async (): Promise<LyricsVerifyResult> => ({
        looksLikeLyrics: false,
        reason: 'Uncertain',
      }),
    );

    const { getByText } = await render(
      <TranscriptReview
        initialText="I want to hold your hand"
        challengePhrase="hold"
        onConfirm={onConfirm}
        verifyLyrics={verifyLyrics}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });
    await waitFor(() => {
      expect(getByText(/Continue anyway/i)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByText(/Continue anyway/i));
    });

    expect(onConfirm).toHaveBeenCalledWith('I want to hold your hand');
  });

  it('dismisses the warning when the player chooses Edit', async () => {
    const verifyLyrics = jest.fn(
      async (): Promise<LyricsVerifyResult> => ({
        looksLikeLyrics: false,
        reason: 'Uncertain',
      }),
    );

    const { getByText, queryByText } = await render(
      <TranscriptReview
        initialText="I want to hold your hand"
        challengePhrase="hold"
        onConfirm={onConfirm}
        verifyLyrics={verifyLyrics}
      />,
    );

    await act(async () => {
      fireEvent.press(getByText('Confirm lyrics'));
    });
    await waitFor(() => {
      expect(getByText(/^Edit$/i)).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(getByText(/^Edit$/i));
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(queryByText(/Continue anyway/i)).toBeNull();
  });
});
