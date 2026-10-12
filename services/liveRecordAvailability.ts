export type LiveRecordAvailability = {
  nativeReady: boolean;
  geminiReady: boolean;
};

/** Why live Record is hidden, or null when recording is allowed. */
export function liveRecordBlockReason(
  availability: LiveRecordAvailability,
): string | null {
  if (!availability.geminiReady) {
    return 'Add a Gemini API key to record live.';
  }
  if (!availability.nativeReady) {
    return 'Live recording needs Expo Go on a phone (not the browser).';
  }
  return null;
}

export function canRecordLive(availability: LiveRecordAvailability): boolean {
  return liveRecordBlockReason(availability) === null;
}
