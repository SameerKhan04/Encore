/** Hardcoded lyric block for offline STT stubbing (Phase 4–7). */
export const MOCK_LYRIC_BLOCK =
  'I want to hold your hand forever and never let go tonight';

export type TranscriptionResult = {
  text: string;
  words: string[];
};

export function mockTranscribe(_recordingUri?: string): TranscriptionResult {
  const words = MOCK_LYRIC_BLOCK.split(/\s+/).filter(Boolean);
  return {
    text: MOCK_LYRIC_BLOCK,
    words,
  };
}
