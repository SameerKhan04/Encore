import { createMemoryMatchTransport } from '@/services/matchRoom';

describe('createMemoryMatchTransport', () => {
  it('creates a host room with an invite code', async () => {
    const transport = createMemoryMatchTransport();
    const session = await transport.createMatch('host-1');

    expect(session.role).toBe('host');
    expect(session.playerId).toBe('host-1');
    expect(session.inviteCode.length).toBeGreaterThan(0);
    expect(session.matchId).toBeTruthy();
    expect(session.guestJoined).toBe(false);
  });

  it('lets a guest join with a normalized invite code', async () => {
    const transport = createMemoryMatchTransport();
    const host = await transport.createMatch('host-1');

    const guest = await transport.joinMatch(
      host.inviteCode.toLowerCase(),
      'guest-1',
    );

    expect(guest.role).toBe('guest');
    expect(guest.matchId).toBe(host.matchId);
    expect(guest.inviteCode).toBe(host.inviteCode);
  });

  it('rejects joining an unknown invite code', async () => {
    const transport = createMemoryMatchTransport();
    await expect(transport.joinMatch('NOPE12', 'guest-1')).rejects.toThrow(
      /invite code/i,
    );
  });

  it('publishes snapshots to subscribers on both sides', async () => {
    const transport = createMemoryMatchTransport();
    const host = await transport.createMatch('host-1');
    await transport.joinMatch(host.inviteCode, 'guest-1');

    const seen: string[] = [];
    const unsubscribe = transport.subscribe(host.matchId, (room) => {
      seen.push(room.snapshot.challengePhrase);
    });

    await transport.publishSnapshot(host.matchId, {
      challengePhrase: 'hold your',
      activePlayer: 'B',
      pickingPlayer: null,
      scores: { A: 10, B: 0 },
      gameState: 'CHALLENGE_SENT',
      transcriptWords: ['hold', 'your'],
      thinkDeadlineAt: null,
      revision: 1,
    });

    expect(seen).toContain('hold your');
    unsubscribe();
  });

  it('marks the room abandoned when a player leaves', async () => {
    const transport = createMemoryMatchTransport();
    const host = await transport.createMatch('host-1');
    await transport.joinMatch(host.inviteCode, 'guest-1');

    let abandonedBy: string | null = null;
    const unsubscribe = transport.subscribe(host.matchId, (room) => {
      abandonedBy = room.abandonedBy;
    });

    await transport.leaveMatch(host.matchId, 'host-1');

    expect(abandonedBy).toBe('host-1');
    unsubscribe();
  });

  it('notifies when a guest joins', async () => {
    const transport = createMemoryMatchTransport();
    const host = await transport.createMatch('host-1');

    let guestJoined = false;
    transport.subscribe(host.matchId, (room) => {
      guestJoined = room.guestJoined;
    });

    await transport.joinMatch(host.inviteCode, 'guest-1');
    expect(guestJoined).toBe(true);
  });
});
