import {
  canRecordLive,
  liveRecordBlockReason,
} from '@/services/liveRecordAvailability';

describe('liveRecordBlockReason', () => {
  it('allows recording when mic and Gemini are ready', () => {
    expect(
      liveRecordBlockReason({ nativeReady: true, geminiReady: true }),
    ).toBeNull();
    expect(canRecordLive({ nativeReady: true, geminiReady: true })).toBe(true);
  });

  it('blocks when native mic is unavailable (e.g. browser)', () => {
    expect(
      liveRecordBlockReason({ nativeReady: false, geminiReady: true }),
    ).toMatch(/expo go on a phone/i);
  });

  it('blocks when Gemini key is missing', () => {
    expect(
      liveRecordBlockReason({ nativeReady: true, geminiReady: false }),
    ).toMatch(/gemini/i);
  });

  it('does not consider demoMode — online play should still offer record', () => {
    // Helper has no demoMode input on purpose.
    expect(
      canRecordLive({ nativeReady: true, geminiReady: true }),
    ).toBe(true);
  });
});
