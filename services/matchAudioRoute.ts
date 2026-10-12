/**
 * Route call audio to the loudspeaker so remote WebRTC audio is audible.
 * Safe no-op when native audio APIs are missing (tests / web).
 */
export async function prepareMatchAudioRoute(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const audio = require('expo-audio') as {
      setAudioModeAsync?: (mode: Record<string, unknown>) => Promise<void>;
    };
    if (typeof audio.setAudioModeAsync === 'function') {
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      return;
    }
  } catch {
    // fall through
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const av = require('expo-av') as {
      Audio?: {
        setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
      };
    };
    await av.Audio?.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // Native audio routing unavailable in this environment.
  }
}
