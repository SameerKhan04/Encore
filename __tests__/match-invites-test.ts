import { createMemoryMatchInviteService } from '@/services/matchInvites';
import { createMemoryMatchTransport } from '@/services/matchRoom';

describe('matchInvites', () => {
  it('sends an invite the recipient can see and join with', async () => {
    const transport = createMemoryMatchTransport();
    const host = await transport.createMatch('ENC-HOSTXXXX');
    const invites = createMemoryMatchInviteService();

    const invite = await invites.sendInvite({
      fromId: 'ENC-HOSTXXXX',
      toId: 'ENC-GUESTXXX',
      matchId: host.matchId,
      inviteCode: host.inviteCode,
    });

    expect(invite.toId).toBe('ENC-GUESTXXX');
    expect(invite.inviteCode).toBe(host.inviteCode);

    const incoming = await invites.listIncoming('ENC-GUESTXXX');
    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.fromId).toBe('ENC-HOSTXXXX');

    const session = await transport.joinMatch(
      incoming[0]!.inviteCode,
      'ENC-GUESTXXX',
    );
    expect(session.role).toBe('guest');
    expect(session.matchId).toBe(host.matchId);
  });

  it('notifies the recipient subscriber when invited', async () => {
    const invites = createMemoryMatchInviteService();
    const seen: string[] = [];
    const unsubscribe = invites.subscribeIncoming('ENC-GUESTXXX', (invite) => {
      seen.push(invite.inviteCode);
    });

    await invites.sendInvite({
      fromId: 'ENC-HOSTXXXX',
      toId: 'ENC-GUESTXXX',
      matchId: 'match-1',
      inviteCode: 'ABCD23',
    });

    expect(seen).toEqual(['ABCD23']);
    unsubscribe();
  });

  it('cancels pending invites for a match so they leave the inbox', async () => {
    const invites = createMemoryMatchInviteService();
    await invites.sendInvite({
      fromId: 'ENC-HOSTXXXX',
      toId: 'ENC-GUESTXXX',
      matchId: 'match-7',
      inviteCode: 'ABCD23',
    });

    const cancelled = await invites.cancelInvitesForMatch('match-7');
    expect(cancelled).toHaveLength(1);
    expect(cancelled[0]?.status).toBe('cancelled');

    expect(await invites.listIncoming('ENC-GUESTXXX')).toEqual([]);
  });

  it('notifies the invitee when an invite is cancelled', async () => {
    const invites = createMemoryMatchInviteService();
    const statuses: string[] = [];
    const unsubscribe = invites.subscribeIncoming('ENC-GUESTXXX', (invite) => {
      statuses.push(invite.status);
    });

    await invites.sendInvite({
      fromId: 'ENC-HOSTXXXX',
      toId: 'ENC-GUESTXXX',
      matchId: 'match-8',
      inviteCode: 'ABCD23',
    });
    await invites.cancelInvitesForMatch('match-8');

    expect(statuses).toEqual(['pending', 'cancelled']);
    unsubscribe();
  });

  it('rejects joining with a cancelled invite code helper', async () => {
    const invites = createMemoryMatchInviteService();
    const invite = await invites.sendInvite({
      fromId: 'ENC-HOSTXXXX',
      toId: 'ENC-GUESTXXX',
      matchId: 'match-9',
      inviteCode: 'ABCD23',
    });
    await invites.cancelInvitesForMatch('match-9');

    const latest = await invites.getInvite(invite.id);
    expect(latest?.status).toBe('cancelled');
    expect(invites.isJoinable(latest!)).toBe(false);
  });
});
