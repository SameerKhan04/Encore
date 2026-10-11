import { createAudioRecorder, type AudioRecorderDeps } from '@/services/audioRecorder';

describe('createAudioRecorder', () => {
  function createDeps() {
    const recording = {
      prepareToRecordAsync: jest.fn(async () => undefined),
      record: jest.fn(),
      stop: jest.fn(async () => undefined),
      uri: 'file://mock-recording.m4a' as string | null,
    };

    const deps: AudioRecorderDeps = {
      setAudioModeAsync: jest.fn(async () => undefined),
      createRecording: jest.fn(() => recording),
      highQualityPreset: { quality: 'high' },
    };

    return { deps, recording };
  }

  it('starts recording after configuring audio mode', async () => {
    const { deps, recording } = createDeps();
    const recorder = createAudioRecorder(deps);

    await recorder.start();

    expect(deps.setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(recording.prepareToRecordAsync).toHaveBeenCalledWith(
      deps.highQualityPreset,
    );
    expect(recording.record).toHaveBeenCalled();
    expect(recorder.isRecording()).toBe(true);
  });

  it('stops recording and returns the uri', async () => {
    const { deps, recording } = createDeps();
    const recorder = createAudioRecorder(deps);

    await recorder.start();
    const uri = await recorder.stop();

    expect(recording.stop).toHaveBeenCalled();
    expect(uri).toBe('file://mock-recording.m4a');
    expect(recorder.isRecording()).toBe(false);
  });

  it('throws when stopping without an active recording', async () => {
    const { deps } = createDeps();
    const recorder = createAudioRecorder(deps);

    await expect(recorder.stop()).rejects.toThrow(/no active recording/i);
  });
});
