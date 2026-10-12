import { mockTranscribe } from '@/services/mockTranscription';
import {
  GEMINI_STT_FALLBACK_MODEL,
  GEMINI_STT_MODEL,
  containsChallengePhrase,
  containsChallengeWord,
  transcribe,
  wordsFromText,
} from '@/services/transcription';

describe('wordsFromText', () => {
  it('splits and trims into words', () => {
    expect(wordsFromText('  hold your   hand  ')).toEqual([
      'hold',
      'your',
      'hand',
    ]);
  });
});

describe('containsChallengePhrase', () => {
  it('matches the challenge inside lyrics case-insensitively', () => {
    expect(
      containsChallengePhrase('I want to hold your hand', 'Hold Your'),
    ).toBe(true);
  });

  it('returns false when the challenge is missing', () => {
    expect(containsChallengePhrase('hello world', 'love')).toBe(false);
  });

  it('does not match a single-word challenge as a substring', () => {
    expect(containsChallengePhrase('gloves on sale', 'love')).toBe(false);
  });
});

describe('containsChallengeWord', () => {
  it('matches a whole word anywhere in the transcript', () => {
    expect(containsChallengeWord('all you need is love tonight', 'love')).toBe(
      true,
    );
  });
});

describe('transcribe', () => {
  it('falls back to mock transcription in demo mode', async () => {
    const result = await transcribe('file://ignored.m4a', { demoMode: true });
    expect(result).toEqual(mockTranscribe());
  });

  it('falls back to mock when no API key is configured', async () => {
    const result = await transcribe('file://ignored.m4a', { apiKey: '' });
    expect(result).toEqual(mockTranscribe());
  });

  it('calls Gemini and returns parsed words when a key is present', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'sing love forever tonight' }],
            },
          },
        ],
      }),
      text: async () => '',
    }));

    const result = await transcribe('file://clip.m4a', {
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      readAudioBase64: async () => ({
        data: 'ZmFrZQ==',
        mimeType: 'audio/mp4',
      }),
    });

    expect(fetchImpl).toHaveBeenCalled();
    const firstCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit?];
    expect(firstCall[0]).toContain(GEMINI_STT_MODEL);
    expect(firstCall[0]).toContain('key=test-key');
    expect(result.text).toBe('sing love forever tonight');
    expect(result.words).toEqual(['sing', 'love', 'forever', 'tonight']);
  });

  it('falls back to secondary model when preferred model is unavailable', async () => {
    const fetchImpl = jest.fn(async (url: string) => {
      if (String(url).includes(GEMINI_STT_MODEL)) {
        return {
          ok: false,
          status: 503,
          text: async () => 'unavailable',
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: 'fallback love lyrics' }] } },
          ],
        }),
      };
    });

    const result = await transcribe('file://clip.m4a', {
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      readAudioBase64: async () => ({
        data: 'ZmFrZQ==',
        mimeType: 'audio/mp4',
      }),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondCall = fetchImpl.mock.calls[1] as unknown as [string];
    expect(secondCall[0]).toContain(GEMINI_STT_FALLBACK_MODEL);
    expect(result.text).toBe('fallback love lyrics');
  });

  it('throws when Gemini fails and a key is present', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'server down',
      json: async () => ({}),
    }));

    await expect(
      transcribe('file://clip.m4a', {
        apiKey: 'test-key',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        readAudioBase64: async () => ({
          data: 'ZmFrZQ==',
          mimeType: 'audio/mp4',
        }),
      }),
    ).rejects.toThrow(/Gemini transcription failed/i);
  });
});
