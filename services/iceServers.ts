export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN: IceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Build WebRTC iceServers from env. STUN always; TURN when EXPO_PUBLIC_TURN_* set.
 * TURN_URLS may be comma-separated.
 */
export function buildIceServers(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): IceServerConfig[] {
  const servers: IceServerConfig[] = [...DEFAULT_STUN];
  const turnUrls = env.EXPO_PUBLIC_TURN_URLS?.split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  if (!turnUrls?.length) {
    return servers;
  }
  const username = env.EXPO_PUBLIC_TURN_USERNAME;
  const credential = env.EXPO_PUBLIC_TURN_CREDENTIAL;
  servers.push({
    urls: turnUrls.length === 1 ? turnUrls[0]! : turnUrls,
    ...(username ? { username } : {}),
    ...(credential ? { credential } : {}),
  });
  return servers;
}
