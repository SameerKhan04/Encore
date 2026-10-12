import {
  createMemoryFriendRequestService,
  type FriendRequest,
} from '@/services/friendRequests';
import { createMemoryProfileDirectory } from '@/services/profileDirectory';

describe('friendRequests', () => {
  it('sends a pending request that the recipient can see', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });

    const service = createMemoryFriendRequestService({ directory });
    const sent = await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');

    expect(sent.status).toBe('pending');
    expect(sent.fromId).toBe('ENC-AAAAAAA1');
    expect(sent.toId).toBe('ENC-BBBBBBB2');

    const incoming = await service.listIncoming('ENC-BBBBBBB2');
    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.fromDisplayName).toBe('Alice');
  });

  it('accepts a request so both sides list each other as friends', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    const sent = await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');
    const accepted = await service.acceptRequest(sent.id, 'ENC-BBBBBBB2');

    expect(accepted.status).toBe('accepted');

    const aliceFriends = await service.listFriends('ENC-AAAAAAA1');
    const bobFriends = await service.listFriends('ENC-BBBBBBB2');
    expect(aliceFriends).toEqual([
      expect.objectContaining({
        publicId: 'ENC-BBBBBBB2',
        displayName: 'Bob',
      }),
    ]);
    expect(bobFriends).toEqual([
      expect.objectContaining({
        publicId: 'ENC-AAAAAAA1',
        displayName: 'Alice',
      }),
    ]);
  });

  it('declines a request so neither side becomes friends', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    const sent = await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');
    await service.declineRequest(sent.id, 'ENC-BBBBBBB2');

    expect(await service.listFriends('ENC-AAAAAAA1')).toEqual([]);
    expect(await service.listIncoming('ENC-BBBBBBB2')).toEqual([]);
  });

  it('notifies the recipient subscriber when a request arrives', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    const seen: FriendRequest[] = [];
    const unsubscribe = service.subscribeIncoming('ENC-BBBBBBB2', (req) => {
      seen.push(req);
    });

    await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');

    expect(seen).toHaveLength(1);
    expect(seen[0]?.fromId).toBe('ENC-AAAAAAA1');
    unsubscribe();
  });

  it('rejects sending a request to an unknown id', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    const service = createMemoryFriendRequestService({ directory });

    await expect(
      service.sendRequest('ENC-AAAAAAA1', 'ENC-MISSINGX'),
    ).rejects.toThrow(/not found/i);
  });

  it('notifies the sender when the request is accepted', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    const aliceSeen: FriendRequest[] = [];
    const unsubscribe = service.subscribeForUser('ENC-AAAAAAA1', (req) => {
      aliceSeen.push(req);
    });

    const sent = await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');
    await service.acceptRequest(sent.id, 'ENC-BBBBBBB2');

    expect(aliceSeen.some((req) => req.status === 'accepted')).toBe(true);
    unsubscribe();
  });

  it('lists outgoing pending requests for the sender', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');

    const outgoing = await service.listOutgoing('ENC-AAAAAAA1');
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0]?.toId).toBe('ENC-BBBBBBB2');
    expect(outgoing[0]?.toDisplayName).toBe('Bob');
  });

  it('unfriends both sides after an accepted request', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({ publicId: 'ENC-AAAAAAA1', displayName: 'Alice' });
    await directory.upsert({ publicId: 'ENC-BBBBBBB2', displayName: 'Bob' });
    const service = createMemoryFriendRequestService({ directory });

    const sent = await service.sendRequest('ENC-AAAAAAA1', 'ENC-BBBBBBB2');
    await service.acceptRequest(sent.id, 'ENC-BBBBBBB2');
    await service.unfriend('ENC-AAAAAAA1', 'ENC-BBBBBBB2');

    expect(await service.listFriends('ENC-AAAAAAA1')).toEqual([]);
    expect(await service.listFriends('ENC-BBBBBBB2')).toEqual([]);
  });
});
