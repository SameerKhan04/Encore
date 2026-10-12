export const PRESENCE_ONLINE_MS = 90_000;

export function isOnlineNow(
  lastSeenAt: number | null | undefined,
  now: number = Date.now(),
): boolean {
  if (lastSeenAt == null) {
    return false;
  }
  return now - lastSeenAt < PRESENCE_ONLINE_MS;
}
