import {
  MOCK_LYRIC_BLOCK,
  mockTranscribe,
} from '@/services/mockTranscription';

describe('mockTranscribe', () => {
  it('returns the hardcoded lyric block text', () => {
    const result = mockTranscribe('file://recording.m4a');

    expect(result.text).toBe(MOCK_LYRIC_BLOCK);
  });

  it('splits lyrics into consecutive words for phrase selection', () => {
    const result = mockTranscribe();

    expect(result.words.length).toBeGreaterThan(5);
    expect(result.words.join(' ')).toBe(MOCK_LYRIC_BLOCK);
  });

  it('ignores the recording uri because STT is mocked', () => {
    expect(mockTranscribe('a')).toEqual(mockTranscribe('b'));
  });
});
