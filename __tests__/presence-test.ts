import { PRESENCE_ONLINE_MS, isOnlineNow } from '@/services/presence';

describe('isOnlineNow', () => {
  it('is true within the presence window', () => {
    const now = 1_000_000;
    expect(isOnlineNow(now - 1_000, now)).toBe(true);
    expect(isOnlineNow(now - PRESENCE_ONLINE_MS + 1, now)).toBe(true);
  });

  it('is false when stale or missing', () => {
    const now = 1_000_000;
    expect(isOnlineNow(now - PRESENCE_ONLINE_MS, now)).toBe(false);
    expect(isOnlineNow(null, now)).toBe(false);
  });
});
