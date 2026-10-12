import {
  createMemoryAnonAuth,
  createSupabaseAnonAuth,
  ensureAnonymousSession,
} from '@/services/anonAuth';

describe('ensureAnonymousSession', () => {
  it('signs in anonymously when there is no session', async () => {
    const auth = createMemoryAnonAuth();
    const session = await ensureAnonymousSession(auth);

    expect(session.userId).toBeTruthy();
    expect(auth.signInAnonymousCalls).toBe(1);
  });

  it('reuses an existing session without signing in again', async () => {
    const auth = createMemoryAnonAuth();
    auth.seedSession!({ userId: 'user-existing' });

    const first = await ensureAnonymousSession(auth);
    const second = await ensureAnonymousSession(auth);

    expect(first.userId).toBe('user-existing');
    expect(second.userId).toBe('user-existing');
    expect(auth.signInAnonymousCalls).toBe(0);
  });
});

describe('createSupabaseAnonAuth', () => {
  it('awaits initialize and reuses a recovered session instead of signing in', async () => {
    let initialized = false;
    let signInCalls = 0;
    const auth = createSupabaseAnonAuth({
      async initialize() {
        initialized = true;
      },
      async getSession() {
        expect(initialized).toBe(true);
        return {
          data: { session: { user: { id: 'recovered-user' } } },
        };
      },
      async signInAnonymously() {
        signInCalls += 1;
        return {
          data: { user: { id: 'new-user' } },
          error: null,
        };
      },
    });

    const session = await ensureAnonymousSession(auth);
    expect(session.userId).toBe('recovered-user');
    expect(signInCalls).toBe(0);
  });
});
