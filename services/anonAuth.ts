export type AnonSession = {
  userId: string;
};

export type AnonAuth = {
  getSession: () => Promise<AnonSession | null>;
  signInAnonymously: () => Promise<AnonSession>;
  /** Test / memory helper */
  signInAnonymousCalls?: number;
  seedSession?: (session: AnonSession) => void;
};

export async function ensureAnonymousSession(
  auth: AnonAuth,
): Promise<AnonSession> {
  const existing = await auth.getSession();
  if (existing) {
    return existing;
  }
  return auth.signInAnonymously();
}

export function createMemoryAnonAuth(): AnonAuth {
  let session: AnonSession | null = null;
  const auth: AnonAuth = {
    signInAnonymousCalls: 0,
    seedSession(next) {
      session = next;
    },
    async getSession() {
      return session;
    },
    async signInAnonymously() {
      auth.signInAnonymousCalls = (auth.signInAnonymousCalls ?? 0) + 1;
      session = { userId: `anon-${auth.signInAnonymousCalls}` };
      return session;
    },
  };
  return auth;
}

type SupabaseAuthLike = {
  initialize?: () => Promise<unknown>;
  getSession: () => Promise<{
    data: { session: { user: { id: string } } | null };
  }>;
  signInAnonymously: () => Promise<{
    data: { user: { id: string } | null; session?: { user: { id: string } } | null };
    error: { message: string } | null;
  }>;
};

export function createSupabaseAnonAuth(auth: SupabaseAuthLike): AnonAuth {
  return {
    async getSession() {
      // Wait for AsyncStorage session recovery before deciding to sign in.
      await auth.initialize?.();
      const { data } = await auth.getSession();
      const userId = data.session?.user?.id;
      return userId ? { userId } : null;
    },
    async signInAnonymously() {
      await auth.initialize?.();
      const existing = await auth.getSession();
      const existingId = existing.data.session?.user?.id;
      if (existingId) {
        return { userId: existingId };
      }
      const { data, error } = await auth.signInAnonymously();
      const userId = data.user?.id ?? data.session?.user?.id;
      if (error || !userId) {
        throw new Error(error?.message ?? 'Anonymous sign-in failed');
      }
      return { userId };
    },
  };
}
