import type { ProfileDirectory } from '@/services/profileDirectory';
import { hasSupabaseConfig } from '@/services/supabaseConfig';

/** True only in a native binary that includes expo-notifications. */
export function hasExpoPushNativeModule(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    return requireOptionalNativeModule('ExpoPushTokenManager') != null;
  } catch {
    return false;
  }
}

export type PushMessage = {
  to: string;
  title: string;
  body: string;
};

export type PushNotifier = {
  registerForPush: (publicId: string) => Promise<string | null>;
  notifyUser: (
    publicId: string,
    title: string,
    body: string,
  ) => Promise<void>;
  /** Test spy */
  sent?: PushMessage[];
};

type MemoryPushDeps = {
  directory: ProfileDirectory;
  createToken?: () => Promise<string | null>;
};

export function createMemoryPushNotifier(
  deps: MemoryPushDeps,
): PushNotifier {
  const sent: PushMessage[] = [];
  return {
    sent,
    async registerForPush(publicId) {
      const token = deps.createToken
        ? await deps.createToken()
        : `ExponentPushToken[mem-${publicId}]`;
      if (!token) {
        return null;
      }
      await deps.directory.setPushToken(publicId, token);
      return token;
    },
    async notifyUser(publicId, title, body) {
      const to = await deps.directory.getPushToken(publicId);
      if (!to) {
        return;
      }
      sent.push({ to, title, body });
    },
  };
}

type ExpoPushSender = (messages: PushMessage[]) => Promise<void>;

export function createExpoPushNotifier(deps: {
  directory: ProfileDirectory;
  getExpoPushToken: () => Promise<string | null>;
  send: ExpoPushSender;
}): PushNotifier {
  return {
    async registerForPush(publicId) {
      const token = await deps.getExpoPushToken();
      if (!token) {
        return null;
      }
      await deps.directory.setPushToken(publicId, token);
      return token;
    },
    async notifyUser(publicId, title, body) {
      const to = await deps.directory.getPushToken(publicId);
      if (!to) {
        return;
      }
      await deps.send([{ to, title, body }]);
    },
  };
}

async function sendViaExpoHttp(messages: PushMessage[]): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
}

export function createAppPushNotifier(
  directory: ProfileDirectory,
): PushNotifier {
  if (
    process.env.NODE_ENV === 'test' ||
    !hasSupabaseConfig() ||
    !hasExpoPushNativeModule()
  ) {
    // Memory / no-op until a rebuild includes expo-notifications native code.
    return createMemoryPushNotifier({
      directory,
      createToken: async () => null,
    });
  }

  return createExpoPushNotifier({
    directory,
    getExpoPushToken: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Notifications = require('expo-notifications') as {
          getPermissionsAsync: () => Promise<{ status: string }>;
          requestPermissionsAsync: () => Promise<{ status: string }>;
          getExpoPushTokenAsync: (opts?: {
            projectId?: string;
          }) => Promise<{ data: string }>;
        };
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Constants = require('expo-constants') as {
          expoConfig?: { extra?: { eas?: { projectId?: string } } };
          easConfig?: { projectId?: string };
        };
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted') {
          return null;
        }
        const projectId =
          Constants.easConfig?.projectId ??
          Constants.expoConfig?.extra?.eas?.projectId;
        const token = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        return token.data;
      } catch {
        return null;
      }
    },
    send: sendViaExpoHttp,
  });
}
