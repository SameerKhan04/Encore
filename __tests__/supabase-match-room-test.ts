import {
  createMatchId,
  createSupabaseMatchTransport,
} from '@/services/supabaseMatchRoom';
import type { MatchSnapshot } from '@/services/matchRoom';

describe('createMatchId', () => {
  it('returns a uuid-shaped id without using crypto', () => {
    const id = createMatchId(() => 0.1);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

type Row = {
  id: string;
  invite_code: string;
  host_id: string;
  guest_id: string | null;
  abandoned_by: string | null;
  snapshot: MatchSnapshot;
};

describe('createSupabaseMatchTransport', () => {
  it('creates and joins through the table API', async () => {
    const rows = new Map<string, Row>();
    const byCode = new Map<string, Row>();

    const transport = createSupabaseMatchTransport({
      generateId: () => 'match-1',
      generateCode: () => 'ABCD23',
      insertMatch: async (row) => {
        const full: Row = { ...row, abandoned_by: null };
        rows.set(full.id, full);
        byCode.set(full.invite_code, full);
      },
      findByInviteCode: async (code) => byCode.get(code) ?? null,
      updateGuest: async (matchId, guestId) => {
        const row = rows.get(matchId);
        if (!row) {
          throw new Error('Match not found');
        }
        row.guest_id = guestId;
        return row;
      },
      updateSnapshot: async (matchId, snapshot) => {
        const row = rows.get(matchId);
        if (!row) {
          throw new Error('Match not found');
        }
        row.snapshot = snapshot;
        return row;
      },
      markAbandoned: async (matchId, playerId) => {
        const row = rows.get(matchId);
        if (!row) {
          throw new Error('Match not found');
        }
        row.abandoned_by = playerId;
        return row;
      },
      subscribeMatch: (_matchId, onRow) => {
        // Immediate push of current row happens in tests via manual call.
        void onRow;
        return () => {};
      },
    });

    const host = await transport.createMatch('host-1');
    expect(host.inviteCode).toBe('ABCD23');

    const guest = await transport.joinMatch('abcd23', 'guest-1');
    expect(guest.matchId).toBe(host.matchId);
    expect(guest.role).toBe('guest');
  });

  it('does not send abandoned_by on create so PostgREST works before the column migrates', async () => {
    let inserted: Record<string, unknown> | null = null;
    const rows = new Map<string, Row>();

    const transport = createSupabaseMatchTransport({
      generateId: () => 'match-2',
      generateCode: () => 'ZZZZ99',
      insertMatch: async (row) => {
        inserted = row as unknown as Record<string, unknown>;
        rows.set(row.id, {
          ...row,
          abandoned_by: null,
        });
      },
      findByInviteCode: async () => null,
      updateGuest: async () => {
        throw new Error('unused');
      },
      updateSnapshot: async () => {
        throw new Error('unused');
      },
      markAbandoned: async () => {
        throw new Error('unused');
      },
      subscribeMatch: () => () => {},
    });

    await transport.createMatch('host-2');

    expect(inserted).not.toBeNull();
    expect(Object.prototype.hasOwnProperty.call(inserted, 'abandoned_by')).toBe(
      false,
    );
    expect(inserted).toEqual(
      expect.objectContaining({
        id: 'match-2',
        invite_code: 'ZZZZ99',
        host_id: 'host-2',
        guest_id: null,
      }),
    );
  });
});
