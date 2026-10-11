import * as expoAudio from '@/services/expoAudio';

describe('expo audio wiring', () => {
  it('exposes availability and permission helpers without crashing import', () => {
    expect(typeof expoAudio.isNativeAudioAvailable).toBe('function');
    expect(typeof expoAudio.requestAppMicrophonePermission).toBe('function');
    expect(typeof expoAudio.createExpoAudioRecorder).toBe('function');
  });

  it('reports native availability as a boolean', () => {
    expect(typeof expoAudio.isNativeAudioAvailable()).toBe('boolean');
  });
});
