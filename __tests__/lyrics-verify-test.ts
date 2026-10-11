import {
  parseLyricsVerifyResponse,
  verifyLooksLikeLyrics,
} from '@/services/lyricsVerify';

describe('parseLyricsVerifyResponse', () => {
  it('parses a JSON verdict from the model', () => {
    expect(
      parseLyricsVerifyResponse(
        '{"looksLikeLyrics":false,"reason":"Sounds like a grocery list"}',
      ),
    ).toEqual({
      looksLikeLyrics: false,
      reason: 'Sounds like a grocery list',
    });
  });

  it('defaults to soft-pass when the payload is unreadable', () => {
    expect(parseLyricsVerifyResponse('not json at all')).toEqual({
      looksLikeLyrics: true,
      reason: undefined,
    });
  });
});

describe('verifyLooksLikeLyrics', () => {
  it('soft-passes in demo mode without calling the network', async () => {
    const fetchImpl = jest.fn();
    const result = await verifyLooksLikeLyrics('milk eggs bread', {
      demoMode: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.looksLikeLyrics).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('soft-passes when no API key is configured', async () => {
    const fetchImpl = jest.fn();
    const result = await verifyLooksLikeLyrics('milk eggs bread', {
      apiKey: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.looksLikeLyrics).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns the model verdict when Gemini responds', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"looksLikeLyrics":false,"reason":"Not song-like"}',
                },
              ],
            },
          },
        ],
      }),
      text: async () => '',
    }));

    const result = await verifyLooksLikeLyrics('buy milk and eggs', {
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalled();
    expect(result).toEqual({
      looksLikeLyrics: false,
      reason: 'Not song-like',
    });
  });

  it('soft-passes when Gemini fails so play is never blocked', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'down',
      json: async () => ({}),
    }));

    const result = await verifyLooksLikeLyrics('hold your hand', {
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.looksLikeLyrics).toBe(true);
  });
});
