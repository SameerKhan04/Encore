import { createAudioRecorder } from '@/services/audioRecorder';
import {
  ensureMicrophonePermission,
  type MicrophonePermissionState,
} from '@/services/microphonePermissions';

type ExpoAudioModule = typeof import('expo-audio');

function loadExpoAudio(): ExpoAudioModule {
  // Lazy require so a missing native module cannot crash route imports.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-audio') as ExpoAudioModule;
}

/** True when the Expo Audio native module is present (Expo Go / dev build). */
export function isNativeAudioAvailable(): boolean {
  try {
    const { AudioModule } = loadExpoAudio();
    return typeof AudioModule?.AudioRecorder === 'function';
  } catch {
    return false;
  }
}

/** Real expo-audio wiring used by the audio lab / Party Mode. */
export async function requestAppMicrophonePermission(): Promise<MicrophonePermissionState> {
  const {
    getRecordingPermissionsAsync,
    requestRecordingPermissionsAsync,
  } = loadExpoAudio();

  return ensureMicrophonePermission({
    getPermissionsAsync: () => getRecordingPermissionsAsync(),
    requestPermissionsAsync: () => requestRecordingPermissionsAsync(),
  });
}

export function createExpoAudioRecorder() {
  if (!isNativeAudioAvailable()) {
    throw new Error('Native audio module is unavailable');
  }

  const { AudioModule, RecordingPresets, setAudioModeAsync } = loadExpoAudio();

  return createAudioRecorder({
    setAudioModeAsync: (mode) => setAudioModeAsync(mode),
    createRecording: () => {
      const native = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      return {
        prepareToRecordAsync: (options) =>
          native.prepareToRecordAsync(options as never),
        record: () => {
          native.record();
        },
        stop: () => native.stop(),
        get uri() {
          return native.uri;
        },
      };
    },
    highQualityPreset: RecordingPresets.HIGH_QUALITY,
  });
}
