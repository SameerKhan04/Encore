import {
  createMemoryVoiceSession,
  createNativeWebRtcAdapter,
  createWebRtcVoiceSession,
  isWebRtcNativeAvailable,
  type VoiceSession,
} from '@/services/matchVoice';
import {
  createLiveSupabaseVoiceSignaling,
  createSupabaseVoiceClientFromEnv,
} from '@/services/supabaseVoiceSignaling';
import {
  createMemoryVoiceSignaling,
  type VoiceSignaling,
} from '@/services/voiceSignaling';

export function createAppVoiceSignaling(): VoiceSignaling {
  const client = createSupabaseVoiceClientFromEnv();
  if (client) {
    return createLiveSupabaseVoiceSignaling(client);
  }
  return createMemoryVoiceSignaling();
}

export const appVoiceSignaling: VoiceSignaling = createAppVoiceSignaling();

export function createAppVoiceSession(opts: {
  isOfferer: boolean;
  onRemoteStreamUrl?: (url: string | null) => void;
}): VoiceSession {
  if (!isWebRtcNativeAvailable()) {
    return createMemoryVoiceSession();
  }
  const rtc = createNativeWebRtcAdapter();
  if (!rtc) {
    return createMemoryVoiceSession();
  }
  return createWebRtcVoiceSession({
    signaling: appVoiceSignaling,
    rtc,
    isOfferer: opts.isOfferer,
    onRemoteStreamUrl: opts.onRemoteStreamUrl,
  });
}

export function voiceTransportLabel(): string {
  if (isWebRtcNativeAvailable()) {
    return 'live';
  }
  return 'stub';
}
