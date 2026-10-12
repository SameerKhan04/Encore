import { buildIceServers } from '@/services/iceServers';

describe('buildIceServers', () => {
  it('returns STUN-only when TURN env is missing', () => {
    const servers = buildIceServers({});
    expect(servers.every((s) => String(s.urls).includes('stun:'))).toBe(true);
    expect(servers.some((s) => String(s.urls).includes('turn:'))).toBe(false);
  });

  it('appends TURN when env is present', () => {
    const servers = buildIceServers({
      EXPO_PUBLIC_TURN_URLS: 'turn:turn.example:3478',
      EXPO_PUBLIC_TURN_USERNAME: 'user',
      EXPO_PUBLIC_TURN_CREDENTIAL: 'secret',
    });
    expect(servers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          urls: 'turn:turn.example:3478',
          username: 'user',
          credential: 'secret',
        }),
      ]),
    );
  });
});
