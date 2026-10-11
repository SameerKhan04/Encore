import {
  GEMINI_STT_FALLBACK_MODEL,
  GEMINI_STT_MODEL,
} from '@/services/transcription';

export type LyricsVerifyResult = {
  looksLikeLyrics: boolean;
  reason?: string;
};

export type LyricsVerifyOptions = {
  apiKey?: string;
  demoMode?: boolean;
  fetchImpl?: typeof fetch;
};

const SOFT_PASS: LyricsVerifyResult = { looksLikeLyrics: true };

function getConfiguredApiKey(explicit?: string): string {
  if (explicit !== undefined) {
    return explicit;
  }
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function extractGeminiText(payload: GeminiGenerateResponse): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join(' ')
      .trim() ?? ''
  );
}

/** Pull a JSON verdict out of model text; soft-pass if unreadable. */
export function parseLyricsVerifyResponse(raw: string): LyricsVerifyResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return SOFT_PASS;
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      looksLikeLyrics?: unknown;
      reason?: unknown;
    };
    if (typeof parsed.looksLikeLyrics !== 'boolean') {
      return SOFT_PASS;
    }
    return {
      looksLikeLyrics: parsed.looksLikeLyrics,
      reason:
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim()
          : undefined,
    };
  } catch {
    return SOFT_PASS;
  }
}

async function askModel(
  model: string,
  apiKey: string,
  text: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  'Decide if this text looks like song lyrics (not a grocery list, random spoken notes, or prose).',
                  'Reply with JSON only: {"looksLikeLyrics":boolean,"reason":"short reason"}',
                  `Text: ${text}`,
                ].join('\n'),
              },
            ],
          },
        ],
      }),
    },
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as GeminiGenerateResponse;
  const raw = extractGeminiText(payload);
  return raw || null;
}

/**
 * Soft "looks like lyrics" check via Gemini.
 * Never blocks play: demo/no-key/API failure → looksLikeLyrics true.
 */
export async function verifyLooksLikeLyrics(
  text: string,
  options: LyricsVerifyOptions = {},
): Promise<LyricsVerifyResult> {
  const apiKey = getConfiguredApiKey(options.apiKey);
  if (options.demoMode || !apiKey) {
    return SOFT_PASS;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const primary = await askModel(GEMINI_STT_MODEL, apiKey, text, fetchImpl);
  if (primary) {
    return parseLyricsVerifyResponse(primary);
  }

  const fallback = await askModel(
    GEMINI_STT_FALLBACK_MODEL,
    apiKey,
    text,
    fetchImpl,
  );
  if (fallback) {
    return parseLyricsVerifyResponse(fallback);
  }

  return SOFT_PASS;
}
