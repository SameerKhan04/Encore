const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type PublicProfile = {
  publicId: string;
  displayName: string;
  lastSeenAt?: number | null;
  /** Set on upsert so RLS insert can require auth_user_id = auth.uid(). */
  authUserId?: string | null;
};

export type ProfileDirectory = {
  upsert: (profile: PublicProfile) => Promise<void>;
  findByPublicId: (publicId: string) => Promise<PublicProfile | null>;
  findByAuthUserId: (authUserId: string) => Promise<PublicProfile | null>;
  touchLastSeen: (publicId: string, at?: number) => Promise<void>;
  linkAuthUserId: (publicId: string, authUserId: string) => Promise<void>;
  getPushToken: (publicId: string) => Promise<string | null>;
  setPushToken: (publicId: string, token: string) => Promise<void>;
};

export function normalizePublicId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidPublicId(publicId: string): boolean {
  return /^ENC-[A-Z2-9]{8}$/.test(normalizePublicId(publicId));
}

export function generatePublicId(random: () => number = Math.random): string {
  let body = '';
  for (let i = 0; i < 8; i += 1) {
    body += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)]!;
  }
  return `ENC-${body}`;
}

export function createMemoryProfileDirectory(): ProfileDirectory {
  const byId = new Map<string, PublicProfile>();
  const pushTokens = new Map<string, string>();
  const authIds = new Map<string, string>();
  return {
    async upsert(profile) {
      const publicId = normalizePublicId(profile.publicId);
      const prev = byId.get(publicId);
      byId.set(publicId, {
        publicId,
        displayName: profile.displayName.trim(),
        lastSeenAt: profile.lastSeenAt ?? prev?.lastSeenAt ?? null,
      });
    },
    async findByPublicId(raw) {
      const publicId = normalizePublicId(raw);
      return byId.get(publicId) ?? null;
    },
    async findByAuthUserId(authUserId) {
      for (const [publicId, linked] of authIds) {
        if (linked === authUserId) {
          return byId.get(publicId) ?? null;
        }
      }
      return null;
    },
    async touchLastSeen(raw, at = Date.now()) {
      const publicId = normalizePublicId(raw);
      const prev = byId.get(publicId);
      if (!prev) {
        return;
      }
      byId.set(publicId, { ...prev, lastSeenAt: at });
    },
    async linkAuthUserId(raw, authUserId) {
      authIds.set(normalizePublicId(raw), authUserId);
    },
    async getPushToken(raw) {
      return pushTokens.get(normalizePublicId(raw)) ?? null;
    },
    async setPushToken(raw, token) {
      pushTokens.set(normalizePublicId(raw), token);
    },
  };
}

type ProfileRow = {
  public_id: string;
  display_name: string;
  last_seen_at: string | null;
  expo_push_token?: string | null;
};

type SupabaseProfileClient = {
  from: (table: string) => {
    upsert: (
      row: Record<string, string | null>,
      opts?: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
    update: (row: Record<string, string | null>) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{ error: { message: string } | null }>;
    };
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: ProfileRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

function rowToProfile(data: ProfileRow): PublicProfile {
  return {
    publicId: data.public_id,
    displayName: data.display_name,
    lastSeenAt: data.last_seen_at ? Date.parse(data.last_seen_at) : null,
  };
}

/** Supabase-backed directory for cross-device friend lookup. */
export function createSupabaseProfileDirectory(
  client: SupabaseProfileClient,
): ProfileDirectory {
  return {
    async upsert(profile) {
      const publicId = normalizePublicId(profile.publicId);
      const row: Record<string, string | null> = {
        public_id: publicId,
        display_name: profile.displayName.trim(),
      };
      if (profile.authUserId) {
        row.auth_user_id = profile.authUserId;
      }
      const { error } = await client
        .from('encore_profiles')
        .upsert(row, { onConflict: 'public_id' });
      if (error) {
        throw new Error(error.message);
      }
    },
    async findByPublicId(raw) {
      const publicId = normalizePublicId(raw);
      const { data, error } = await client
        .from('encore_profiles')
        .select('public_id, display_name, last_seen_at, expo_push_token')
        .eq('public_id', publicId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? rowToProfile(data) : null;
    },
    async findByAuthUserId(authUserId) {
      const { data, error } = await client
        .from('encore_profiles')
        .select('public_id, display_name, last_seen_at, expo_push_token')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data ? rowToProfile(data) : null;
    },
    async touchLastSeen(raw, at = Date.now()) {
      const publicId = normalizePublicId(raw);
      const { error } = await client
        .from('encore_profiles')
        .update({ last_seen_at: new Date(at).toISOString() })
        .eq('public_id', publicId);
      if (error) {
        throw new Error(error.message);
      }
    },
    async linkAuthUserId(raw, authUserId) {
      const publicId = normalizePublicId(raw);
      const { error } = await client
        .from('encore_profiles')
        .update({ auth_user_id: authUserId })
        .eq('public_id', publicId);
      if (error) {
        throw new Error(error.message);
      }
    },
    async getPushToken(raw) {
      const publicId = normalizePublicId(raw);
      const { data, error } = await client
        .from('encore_profiles')
        .select('public_id, display_name, last_seen_at, expo_push_token')
        .eq('public_id', publicId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return data?.expo_push_token ?? null;
    },
    async setPushToken(raw, token) {
      const publicId = normalizePublicId(raw);
      const { error } = await client
        .from('encore_profiles')
        .update({ expo_push_token: token })
        .eq('public_id', publicId);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
