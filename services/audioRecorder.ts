export type RecordingHandle = {
  prepareToRecordAsync: (options?: unknown) => Promise<unknown>;
  record: () => void;
  stop: () => Promise<void>;
  uri: string | null;
};

export type AudioRecorderDeps = {
  setAudioModeAsync: (mode: {
    allowsRecording: boolean;
    playsInSilentMode: boolean;
  }) => Promise<void>;
  createRecording: () => RecordingHandle;
  highQualityPreset: unknown;
};

export type AudioRecorder = {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  isRecording: () => boolean;
};

export function createAudioRecorder(deps: AudioRecorderDeps): AudioRecorder {
  let active: RecordingHandle | null = null;

  return {
    isRecording: () => active !== null,

    async start() {
      await deps.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recording = deps.createRecording();
      await recording.prepareToRecordAsync(deps.highQualityPreset);
      recording.record();
      active = recording;
    },

    async stop() {
      if (!active) {
        throw new Error('No active recording');
      }

      const recording = active;
      active = null;
      await recording.stop();
      if (!recording.uri) {
        throw new Error('Recording finished without a URI');
      }
      return recording.uri;
    },
  };
}
