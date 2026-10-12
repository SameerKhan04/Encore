import { createMemoryProfileDirectory } from '@/services/profileDirectory';
import {
  createMemoryPushNotifier,
  hasExpoPushNativeModule,
} from '@/services/pushNotifications';

describe('pushNotifications', () => {
  it('registers a push token onto the profile directory', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({
      publicId: 'ENC-MECODEXX',
      displayName: 'Me',
    });
    const push = createMemoryPushNotifier({
      directory,
      createToken: async () => 'ExponentPushToken[test]',
    });

    const token = await push.registerForPush('ENC-MECODEXX');
    expect(token).toBe('ExponentPushToken[test]');
    expect(await directory.getPushToken('ENC-MECODEXX')).toBe(
      'ExponentPushToken[test]',
    );
  });

  it('sends a notification to a registered friend', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({
      publicId: 'ENC-FRIENDAB',
      displayName: 'Buddy',
    });
    const push = createMemoryPushNotifier({
      directory,
      createToken: async () => 'ExponentPushToken[buddy]',
    });
    await push.registerForPush('ENC-FRIENDAB');

    await push.notifyUser(
      'ENC-FRIENDAB',
      'Friend request',
      'Someone wants to be friends',
    );

    expect(push.sent).toEqual([
      {
        to: 'ExponentPushToken[buddy]',
        title: 'Friend request',
        body: 'Someone wants to be friends',
      },
    ]);
  });

  it('no-ops when the recipient has no token', async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({
      publicId: 'ENC-FRIENDAB',
      displayName: 'Buddy',
    });
    const push = createMemoryPushNotifier({ directory });

    await push.notifyUser('ENC-FRIENDAB', 'Hi', 'There');
    expect(push.sent).toEqual([]);
  });

  it('exposes a boolean native-module availability check', () => {
    expect(typeof hasExpoPushNativeModule()).toBe('boolean');
  });
});
