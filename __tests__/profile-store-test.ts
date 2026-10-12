import { createMemoryAnonAuth } from '@/services/anonAuth';
import { generatePublicId } from '@/services/profileDirectory';
import { createMemoryPushNotifier } from '@/services/pushNotifications';
import {
  createMemoryProfileStorage,
  createProfileStore,
  createTestProfileDeps,
} from '@/store/profileStore';

describe('generatePublicId', () => {
  it('returns an ENC-prefixed shareable id', () => {
    const id = generatePublicId(() => 0.1);
    expect(id).toMatch(/^ENC-[A-Z2-9]{8}$/);
  });
});

describe('profileStore', () => {
  it('completes setup with a trimmed display name and stable publicId', async () => {
    const deps = createTestProfileDeps({
      storage: createMemoryProfileStorage(),
      createPublicId: () => 'ENC-TESTCODE',
    });
    const store = createProfileStore(deps);

    await store.getState().hydrate();
    expect(store.getState().hasCompletedProfileSetup).toBe(false);

    expect(await store.getState().completeSetup('  Star Singer  ')).toBe(true);

    const profile = store.getState();
    expect(profile.displayName).toBe('Star Singer');
    expect(profile.publicId).toBe('ENC-TESTCODE');
    expect(profile.hasCompletedProfileSetup).toBe(true);
  });

  it('rejects empty display names', async () => {
    const store = createProfileStore(createTestProfileDeps());
    await store.getState().hydrate();

    expect(await store.getState().completeSetup('   ')).toBe(false);
    expect(store.getState().hasCompletedProfileSetup).toBe(false);
  });

  it('rehydrates a saved profile from storage', async () => {
    const storage = createMemoryProfileStorage();
    const first = createProfileStore(
      createTestProfileDeps({
        storage,
        createPublicId: () => 'ENC-PERSIST1',
      }),
    );
    await first.getState().hydrate();
    await first.getState().completeSetup('Encore Fan');

    const second = createProfileStore(
      createTestProfileDeps({
        storage,
        createPublicId: () => 'ENC-OTHERXX',
      }),
    );
    await second.getState().hydrate();

    expect(second.getState().displayName).toBe('Encore Fan');
    expect(second.getState().publicId).toBe('ENC-PERSIST1');
    expect(second.getState().hasCompletedProfileSetup).toBe(true);
  });

  it('recovers profile from directory when local storage is empty but auth is linked', async () => {
    const directory = createTestProfileDeps().directory;
    const auth = createMemoryAnonAuth();
    auth.seedSession!({ userId: 'auth-recover-1' });
    await directory.upsert({
      publicId: 'ENC-RECOVER1',
      displayName: 'Recovered',
    });
    await directory.linkAuthUserId('ENC-RECOVER1', 'auth-recover-1');

    const store = createProfileStore(
      createTestProfileDeps({
        directory,
        storage: createMemoryProfileStorage(),
        anonAuth: auth,
        createPublicId: () => 'ENC-SHOULDNT',
      }),
    );
    await store.getState().hydrate();

    expect(store.getState().hasCompletedProfileSetup).toBe(true);
    expect(store.getState().publicId).toBe('ENC-RECOVER1');
    expect(store.getState().displayName).toBe('Recovered');
  });

  it('sends a friend request and becomes mutual after accept', async () => {
    const directory = createTestProfileDeps().directory;
    await directory.upsert({
      publicId: 'ENC-FRIENDAB',
      displayName: 'Buddy',
    });
    await directory.upsert({
      publicId: 'ENC-MECODEXX',
      displayName: 'Me',
    });

    const aliceDeps = createTestProfileDeps({
      directory,
      createPublicId: () => 'ENC-MECODEXX',
    });
    // Share the same friendRequests instance so both stores see one another.
    const bobDeps = {
      ...createTestProfileDeps({
        directory,
        createPublicId: () => 'ENC-FRIENDAB',
      }),
      friendRequests: aliceDeps.friendRequests,
      matchInvites: aliceDeps.matchInvites,
    };

    const alice = createProfileStore(aliceDeps);
    const bob = createProfileStore(bobDeps);
    await alice.getState().completeSetup('Me');
    await bob.getState().completeSetup('Buddy');

    expect(await alice.getState().sendFriendRequest('ENC-FRIENDAB')).toBe(true);
    await bob.getState().refreshSocial();
    expect(bob.getState().incomingRequests).toHaveLength(1);

    const requestId = bob.getState().incomingRequests[0]!.id;
    expect(await bob.getState().acceptFriendRequest(requestId)).toBe(true);

    await alice.getState().refreshSocial();
    expect(alice.getState().friends).toEqual([
      expect.objectContaining({
        publicId: 'ENC-FRIENDAB',
        displayName: 'Buddy',
      }),
    ]);
    expect(bob.getState().friends).toEqual([
      expect.objectContaining({
        publicId: 'ENC-MECODEXX',
        displayName: 'Me',
      }),
    ]);
  });

  it('does not add an unknown public id', async () => {
    const store = createProfileStore(
      createTestProfileDeps({ createPublicId: () => 'ENC-MECODEXX' }),
    );
    await store.getState().hydrate();
    await store.getState().completeSetup('Me');

    expect(await store.getState().sendFriendRequest('ENC-MISSINGX')).toBe(false);
    expect(store.getState().friends).toEqual([]);
  });

  it('links anonymous auth user id when completing setup', async () => {
    const directory = createTestProfileDeps().directory;
    const auth = createMemoryAnonAuth();
    const linked: string[] = [];
    const orig = directory.linkAuthUserId.bind(directory);
    directory.linkAuthUserId = async (publicId, authUserId) => {
      linked.push(`${publicId}:${authUserId}`);
      await orig(publicId, authUserId);
    };

    const store = createProfileStore(
      createTestProfileDeps({
        directory,
        createPublicId: () => 'ENC-AUTHUSER',
        anonAuth: auth,
      }),
    );
    await store.getState().hydrate();
    expect(await store.getState().completeSetup('Singer')).toBe(true);

    expect(auth.signInAnonymousCalls).toBe(1);
    expect(linked).toEqual(['ENC-AUTHUSER:anon-1']);
  });

  it('registers a push token after setup and notifies on friend request', async () => {
    const directory = createTestProfileDeps().directory;
    await directory.upsert({
      publicId: 'ENC-FRIENDAB',
      displayName: 'Buddy',
    });
    await directory.setPushToken(
      'ENC-FRIENDAB',
      'ExponentPushToken[buddy]',
    );
    const push = createMemoryPushNotifier({
      directory,
      createToken: async () => 'ExponentPushToken[me]',
    });
    const store = createProfileStore(
      createTestProfileDeps({
        directory,
        createPublicId: () => 'ENC-MECODEXX',
        push,
      }),
    );
    await store.getState().hydrate();
    await store.getState().completeSetup('Me');

    expect(await directory.getPushToken('ENC-MECODEXX')).toBe(
      'ExponentPushToken[me]',
    );

    expect(await store.getState().sendFriendRequest('ENC-FRIENDAB')).toBe(true);
    expect(push.sent).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[buddy]',
        title: 'Friend request',
      }),
    ]);
  });

  it('notifies the invitee when sending a match invite', async () => {
    const directory = createTestProfileDeps().directory;
    await directory.upsert({
      publicId: 'ENC-FRIENDAB',
      displayName: 'Buddy',
    });
    const push = createMemoryPushNotifier({
      directory,
      createToken: async () => 'ExponentPushToken[buddy]',
    });
    await push.registerForPush('ENC-FRIENDAB');

    const store = createProfileStore(
      createTestProfileDeps({
        directory,
        createPublicId: () => 'ENC-MECODEXX',
        push,
      }),
    );
    await store.getState().completeSetup('Me');

    expect(
      await store.getState().sendMatchInvite({
        toId: 'ENC-FRIENDAB',
        matchId: 'match-1',
        inviteCode: 'ABCD',
      }),
    ).toBe(true);
    expect(push.sent).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[buddy]',
        title: 'Match invite',
      }),
    ]);
  });
});
