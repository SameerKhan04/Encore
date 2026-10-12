import {
  mockTranscribe,
  type TranscriptionResult,
} from '@/services/mockTranscription';

/** Preferred STT model; free-tier availability can flap. */
export const GEMINI_STT_MODEL = 'gemini-3.8-flash';
/** Stable fallback when the preferred model is unavailable. */
export const GEMINI_STT_FALLBACK_MODEL = 'gemini-3.5-flash';

export type AudioPayload = {
  data: string;
  mimeType: string;
};

export type TranscribeOptions = {
  apiKey?: string;
  demoMode?: boolean;
  fetchImpl?: typeof fetch;
  readAudioBase64?: (uri: string) => Promise<AudioPayload>;
};

export function wordsFromText(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whole-word match: challenge may appear anywhere in the transcript. */
export function containsChallengeWord(
  text: string,
  challengeWord: string,
): boolean {
  const target = normalizePhrase(challengeWord);
  if (!target || target.includes(' ')) {
    return false;
  }
  const tokens = normalizePhrase(text).split(' ').filter(Boolean);
  return tokens.includes(target);
}

export function containsChallengePhrase(
  text: string,
  challengePhrase: string,
): boolean {
  const phrase = normalizePhrase(challengePhrase);
  if (!phrase) {
    return false;
  }
  const phraseTokens = phrase.split(' ').filter(Boolean);
  if (phraseTokens.length === 1) {
    return containsChallengeWord(text, phrase);
  }
  const tokens = normalizePhrase(text).split(' ').filter(Boolean);
  for (let i = 0; i <= tokens.length - phraseTokens.length; i += 1) {
    if (phraseTokens.every((token, j) => tokens[i + j] === token)) {
      return true;
    }
  }
  return false;
}

function getConfiguredApiKey(explicit?: string): string {
  if (explicit !== undefined) {
    return explicit;
  }
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
}

export function hasGeminiApiKey(): boolean {
  return getConfiguredApiKey().length > 0;
}

async function defaultReadAudioBase64(uri: string): Promise<AudioPayload> {
  // Lazy require keeps unit tests free of native FileSystem.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  const data = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { data, mimeType: 'audio/mp4' };
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

function extractGeminiText(payload: GeminiGenerateResponse): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join(' ')
      .trim() ?? ''
  );
}

async function generateWithModel(
  model: string,
  apiKey: string,
  audio: AudioPayload,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; status: number; text: string; errorText: string }> {
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
                text: 'Transcribe the sung lyrics exactly. Return only the lyric words, with no commentary or quotes.',
              },
              {
                inline_data: {
                  mime_type: audio.mimeType,
                  data: audio.data,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  const errorText = response.ok ? '' : await response.text().catch(() => '');
  if (!response.ok) {
    return { ok: false, status: response.status, text: '', errorText };
  }

  const payload = (await response.json()) as GeminiGenerateResponse;
  return {
    ok: true,
    status: response.status,
    text: extractGeminiText(payload),
    errorText: payload.error?.message ?? '',
  };
}

/**
 * Transcribe a recording via Gemini audio understanding.
 * Uses mock lyrics only when Demo Mode is on or no API key is set.
 * Throws when a key is present but Gemini fails (no silent mock).
 */
export async function transcribe(
  recordingUri: string,
  options: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  const apiKey = getConfiguredApiKey(options.apiKey);
  if (options.demoMode || !apiKey) {
    return mockTranscribe(recordingUri);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const readAudio = options.readAudioBase64 ?? defaultReadAudioBase64;
  const audio = await readAudio(recordingUri);

  const primary = await generateWithModel(
    GEMINI_STT_MODEL,
    apiKey,
    audio,
    fetchImpl,
  );
  if (primary.ok && primary.text) {
    return { text: primary.text, words: wordsFromText(primary.text) };
  }

  const fallback = await generateWithModel(
    GEMINI_STT_FALLBACK_MODEL,
    apiKey,
    audio,
    fetchImpl,
  );
  if (fallback.ok && fallback.text) {
    return { text: fallback.text, words: wordsFromText(fallback.text) };
  }

  const detail =
    fallback.errorText ||
    primary.errorText ||
    `HTTP ${fallback.status || primary.status}`;
  throw new Error(`Gemini transcription failed: ${detail}`);
}
