export type PermissionResult = {
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined' | string;
  canAskAgain: boolean;
};

export type MicrophonePermissionDeps = {
  getPermissionsAsync: () => Promise<PermissionResult>;
  requestPermissionsAsync: () => Promise<PermissionResult>;
};

export type MicrophonePermissionState = 'granted' | 'denied';

export async function ensureMicrophonePermission(
  deps: MicrophonePermissionDeps,
): Promise<MicrophonePermissionState> {
  const current = await deps.getPermissionsAsync();
  if (current.granted) {
    return 'granted';
  }

  if (current.status === 'denied' && !current.canAskAgain) {
    return 'denied';
  }

  const requested = await deps.requestPermissionsAsync();
  return requested.granted ? 'granted' : 'denied';
}
