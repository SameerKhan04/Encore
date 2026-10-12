import { create, type StoreApi, type UseBoundStore } from 'zustand';

import { resolveAsyncStorage } from '@/services/asyncStorage';
import {
  createSupabaseAnonAuth,
  ensureAnonymousSession,
  type AnonAuth,
} from '@/services/anonAuth';
import {
  createAppFriendRequestService,
  createMemoryFriendRequestService,
  type FriendRequest,
  type FriendRequestService,
} from '@/services/friendRequests';
import {
  appMatchInviteService,
  createMemoryMatchInviteService,
  type MatchInvite,
  type MatchInviteService,
} from '@/services/matchInvites';
import {
  createMemoryProfileDirectory,
  createSupabaseProfileDirectory,
  generatePublicId,
  type ProfileDirectory,
  type PublicProfile,
} from '@/services/profileDirectory';
import {
  createAppPushNotifier,
  type PushNotifier,
} from '@/services/pushNotifications';
import { getSupabaseClient } from '@/services/supabaseClient';
import { hasSupabaseConfig } from '@/services/supabaseConfig';

const STORAGE_KEY = 'encore.profile.v1';

let activeSocialUnsubscribe: (() => void) | null = null;

function stopActiveSocialSubscriptions() {
  activeSocialUnsubscribe?.();
  activeSocialUnsubscribe = null;
}

export type Friend = PublicProfile;

export type ProfileStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

type PersistedProfile = {
  publicId: string;
  displayName: string;
  hasCompletedProfileSetup: boolean;
  friends: Friend[];
};

type ProfileState = {
  publicId: string | null;
  displayName: string;
  hasCompletedProfileSetup: boolean;
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  incomingInvites: MatchInvite[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  completeSetup: (displayName: string) => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  sendFriendRequest: (publicId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  declineFriendRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (publicId: string) => Promise<boolean>;
  refreshSocial: () => Promise<void>;
  touchPresence: () => Promise<void>;
  startSocialSubscriptions: () => () => void;
  sendMatchInvite: (input: {
    toId: string;
    matchId: string;
    inviteCode: string;
  }) => Promise<boolean>;
  clearInvite: (inviteId: string) => void;
};

type ProfileStoreDeps = {
  storage: ProfileStorage;
  createPublicId: () => string;
  directory: ProfileDirectory;
  friendRequests: FriendRequestService;
  matchInvites: MatchInviteService;
  anonAuth?: AnonAuth;
  push?: PushNotifier;
};

export function createMemoryProfileStorage(
  initial?: Record<string, string>,
): ProfileStorage {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
  };
}

function trimName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function createProfileStore(
  deps: ProfileStoreDeps,
): UseBoundStore<StoreApi<ProfileState>> {
  const persist = async (state: PersistedProfile) => {
    await deps.storage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const ensureAuthSession = async (): Promise<string | null> => {
    if (!deps.anonAuth) {
      return null;
    }
    try {
      const session = await ensureAnonymousSession(deps.anonAuth);
      if (__DEV__) {
        console.log('[encore] anon auth ok', session.userId);
      }
      return session.userId;
    } catch (err) {
      if (__DEV__) {
        console.warn(
          '[encore] anon auth failed',
          err instanceof Error ? err.message : err,
        );
      }
      return null;
    }
  };

  const linkAuthAndPush = async (publicId: string) => {
    const authUserId = await ensureAuthSession();
    if (authUserId) {
      try {
        await deps.directory.linkAuthUserId(publicId, authUserId);
        if (__DEV__) {
          console.log('[encore] linked auth_user_id for', publicId);
        }
      } catch (err) {
        if (__DEV__) {
          console.warn(
            '[encore] link auth_user_id failed',
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
    if (deps.push) {
      try {
        await deps.push.registerForPush(publicId);
      } catch {
        // Push registration is best-effort.
      }
    }
  };

  return create<ProfileState>((set, get) => ({
    publicId: null,
    displayName: '',
    hasCompletedProfileSetup: false,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    incomingInvites: [],
    hydrated: false,

    hydrate: async () => {
      try {
        const raw = await deps.storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedProfile;
          set({
            publicId: parsed.publicId ?? null,
            displayName: parsed.displayName ?? '',
            hasCompletedProfileSetup: Boolean(parsed.hasCompletedProfileSetup),
            friends: Array.isArray(parsed.friends) ? parsed.friends : [],
            hydrated: true,
          });
          if (parsed.hasCompletedProfileSetup && parsed.publicId) {
            await linkAuthAndPush(parsed.publicId);
          }
        } else {
          // Local cache missing (reload / cleared) — recover via anon session.
          const authUserId = await ensureAuthSession();
          const remote = authUserId
            ? await deps.directory.findByAuthUserId(authUserId)
            : null;
          if (remote) {
            const next: PersistedProfile = {
              publicId: remote.publicId,
              displayName: remote.displayName,
              hasCompletedProfileSetup: true,
              friends: [],
            };
            set({
              publicId: remote.publicId,
              displayName: remote.displayName,
              hasCompletedProfileSetup: true,
              friends: [],
              hydrated: true,
            });
            await persist(next);
            if (__DEV__) {
              console.log('[encore] recovered profile', remote.publicId);
            }
          } else {
            set({ hydrated: true });
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.warn(
            '[encore] profile hydrate failed',
            err instanceof Error ? err.message : err,
          );
        }
        set({ hydrated: true });
      }
      await get().refreshSocial();
    },

    completeSetup: async (rawName) => {
      const displayName = trimName(rawName);
      if (!displayName) {
        return false;
      }
      const publicId = get().publicId ?? deps.createPublicId();
      const next: PersistedProfile = {
        publicId,
        displayName,
        hasCompletedProfileSetup: true,
        friends: get().friends,
      };
      set({
        publicId,
        displayName,
        hasCompletedProfileSetup: true,
      });
      await persist(next);
      const authUserId = await ensureAuthSession();
      await deps.directory.upsert({
        publicId,
        displayName,
        authUserId: authUserId ?? undefined,
      });
      if (authUserId) {
        try {
          await deps.directory.linkAuthUserId(publicId, authUserId);
        } catch {
          // Already set via upsert when columns exist.
        }
      }
      if (deps.push) {
        try {
          await deps.push.registerForPush(publicId);
        } catch {
          // Push registration is best-effort.
        }
      }
      return true;
    },

    updateDisplayName: async (rawName) => {
      const displayName = trimName(rawName);
      const publicId = get().publicId;
      if (!displayName || !publicId || !get().hasCompletedProfileSetup) {
        return false;
      }
      const next: PersistedProfile = {
        publicId,
        displayName,
        hasCompletedProfileSetup: true,
        friends: get().friends,
      };
      set({ displayName });
      await persist(next);
      const authUserId = await ensureAuthSession();
      await deps.directory.upsert({
        publicId,
        displayName,
        authUserId: authUserId ?? undefined,
      });
      return true;
    },

    sendFriendRequest: async (rawId) => {
      const me = get().publicId;
      if (!me) {
        return false;
      }
      try {
        await deps.friendRequests.sendRequest(me, rawId);
        if (deps.push) {
          try {
            await deps.push.notifyUser(
              rawId,
              'Friend request',
              `${get().displayName || 'Someone'} wants to be friends`,
            );
          } catch {
            // Push is best-effort; in-app Realtime still refreshes.
          }
        }
        await get().refreshSocial();
        return true;
      } catch {
        return false;
      }
    },

    acceptFriendRequest: async (requestId) => {
      const me = get().publicId;
      if (!me) {
        return false;
      }
      try {
        await deps.friendRequests.acceptRequest(requestId, me);
        await get().refreshSocial();
        return true;
      } catch {
        return false;
      }
    },

    declineFriendRequest: async (requestId) => {
      const me = get().publicId;
      if (!me) {
        return false;
      }
      try {
        await deps.friendRequests.declineRequest(requestId, me);
        await get().refreshSocial();
        return true;
      } catch {
        return false;
      }
    },

    removeFriend: async (friendId) => {
      const me = get().publicId;
      if (!me) {
        return false;
      }
      try {
        await deps.friendRequests.unfriend(me, friendId);
        await get().refreshSocial();
        return true;
      } catch {
        return false;
      }
    },

    refreshSocial: async () => {
      const me = get().publicId;
      if (!me || !get().hasCompletedProfileSetup) {
        return;
      }
      try {
        const [friends, incomingRequests, outgoingRequests, incomingInvites] =
          await Promise.all([
            deps.friendRequests.listFriends(me),
            deps.friendRequests.listIncoming(me),
            deps.friendRequests.listOutgoing(me),
            deps.matchInvites.listIncoming(me),
          ]);
        set({ friends, incomingRequests, outgoingRequests, incomingInvites });
        await persist({
          publicId: me,
          displayName: get().displayName,
          hasCompletedProfileSetup: true,
          friends,
        });
      } catch {
        // Keep cached friends if network/social sync fails.
      }
    },

    touchPresence: async () => {
      const me = get().publicId;
      if (!me || !get().hasCompletedProfileSetup) {
        return;
      }
      try {
        await deps.directory.touchLastSeen(me);
      } catch {
        // Presence is best-effort.
      }
    },

    startSocialSubscriptions: () => {
      const me = get().publicId;
      if (!me) {
        return () => {};
      }
      // Idempotent: tear down any prior live channels before opening new ones
      // (Strict Mode remount / accidental double-start).
      stopActiveSocialSubscriptions();
      const unsubRequests = deps.friendRequests.subscribeForUser(me, () => {
        void get().refreshSocial();
      });
      const unsubInvites = deps.matchInvites.subscribeIncoming(me, () => {
        void get().refreshSocial();
      });
      activeSocialUnsubscribe = () => {
        unsubRequests();
        unsubInvites();
        activeSocialUnsubscribe = null;
      };
      return activeSocialUnsubscribe;
    },

    sendMatchInvite: async (input) => {
      const me = get().publicId;
      if (!me) {
        return false;
      }
      try {
        await deps.matchInvites.sendInvite({
          fromId: me,
          toId: input.toId,
          matchId: input.matchId,
          inviteCode: input.inviteCode,
        });
        if (deps.push) {
          try {
            await deps.push.notifyUser(
              input.toId,
              'Match invite',
              `${get().displayName || 'Someone'} invited you to a match`,
            );
          } catch {
            // Push is best-effort; in-app Realtime still refreshes.
          }
        }
        return true;
      } catch {
        return false;
      }
    },

    clearInvite: (inviteId) => {
      set({
        incomingInvites: get().incomingInvites.filter(
          (invite) => invite.id !== inviteId,
        ),
      });
    },
  }));
}

function createAppStorage(): ProfileStorage {
  if (process.env.NODE_ENV === 'test') {
    return createMemoryProfileStorage();
  }
  return resolveAsyncStorage() ?? createMemoryProfileStorage();
}

function createAppDirectory(): ProfileDirectory {
  if (process.env.NODE_ENV === 'test' || !hasSupabaseConfig()) {
    return createMemoryProfileDirectory();
  }
  const client = getSupabaseClient();
  if (!client) {
    return createMemoryProfileDirectory();
  }
  return createSupabaseProfileDirectory(
    client as unknown as Parameters<typeof createSupabaseProfileDirectory>[0],
  );
}

function createAppAnonAuth(): AnonAuth | undefined {
  if (process.env.NODE_ENV === 'test' || !hasSupabaseConfig()) {
    return undefined;
  }
  const client = getSupabaseClient();
  if (!client) {
    return undefined;
  }
  return createSupabaseAnonAuth(client.auth);
}

const appDirectory = createAppDirectory();
const appPush = createAppPushNotifier(appDirectory);
const appAnonAuth = createAppAnonAuth();

const appDeps: ProfileStoreDeps = {
  storage: createAppStorage(),
  createPublicId: () => generatePublicId(),
  directory: appDirectory,
  friendRequests: createAppFriendRequestService(appDirectory),
  matchInvites: appMatchInviteService,
  anonAuth: appAnonAuth,
  push: appPush,
};

/** Swap deps in tests without remounting the Zustand store. */
export function setProfileDepsForTests(next: ProfileStoreDeps) {
  appDeps.storage = next.storage;
  appDeps.createPublicId = next.createPublicId;
  appDeps.directory = next.directory;
  appDeps.friendRequests = next.friendRequests;
  appDeps.matchInvites = next.matchInvites;
  appDeps.anonAuth = next.anonAuth;
  appDeps.push = next.push;
  useProfileStore.setState({
    publicId: null,
    displayName: '',
    hasCompletedProfileSetup: false,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    incomingInvites: [],
    hydrated: false,
  });
}

export function createTestProfileDeps(overrides?: {
  directory?: ProfileDirectory;
  storage?: ProfileStorage;
  createPublicId?: () => string;
  anonAuth?: AnonAuth;
  push?: PushNotifier;
}): ProfileStoreDeps {
  const directory = overrides?.directory ?? createMemoryProfileDirectory();
  return {
    storage: overrides?.storage ?? createMemoryProfileStorage(),
    createPublicId: overrides?.createPublicId ?? (() => 'ENC-TESTCODE'),
    directory,
    friendRequests: createMemoryFriendRequestService({ directory }),
    matchInvites: createMemoryMatchInviteService(),
    anonAuth: overrides?.anonAuth,
    push: overrides?.push,
  };
}

/** App singleton — phone-local profile, no account sign-in. */
export const useProfileStore = createProfileStore(appDeps);
