import { createMemoryMatchTransport } from '@/services/matchRoom';
import { createOnlineStore } from '@/store/onlineStore';

describe('onlineStore', () => {
  it('creates a host room and waits for a guest', async () => {
    const transport = createMemoryMatchTransport();
    const store = createOnlineStore({
      transport,
      createPlayerId: () => 'host-1',
    });

    await store.getState().createRoom();

    const state = store.getState();
    expect(state.status).toBe('waiting');
    expect(state.role).toBe('host');
    expect(state.inviteCode).toHaveLength(6);
    expect(state.guestJoined).toBe(false);
  });

  it('joins a room as guest and marks both sides ready', async () => {
    const transport = createMemoryMatchTransport();
    const hostStore = createOnlineStore({
      transport,
      createPlayerId: () => 'host-1',
    });
    const guestStore = createOnlineStore({
      transport,
      createPlayerId: () => 'guest-1',
    });

    await hostStore.getState().createRoom();
    const code = hostStore.getState().inviteCode!;

    await guestStore.getState().joinRoom(code);

    expect(guestStore.getState().status).toBe('ready');
    expect(guestStore.getState().role).toBe('guest');

    // Host subscription should flip when guest joins.
    await Promise.resolve();
    expect(hostStore.getState().guestJoined).toBe(true);
    expect(hostStore.getState().status).toBe('ready');
  });

  it('sets an error status for bad invite codes', async () => {
    const transport = createMemoryMatchTransport();
    const store = createOnlineStore({
      transport,
      createPlayerId: () => 'guest-1',
    });

    await store.getState().joinRoom('NOPE!!');

    expect(store.getState().status).toBe('error');
    expect(store.getState().error).toMatch(/invite/i);
  });

  it('resets back to idle on leave', async () => {
    const transport = createMemoryMatchTransport();
    const store = createOnlineStore({
      transport,
      createPlayerId: () => 'host-1',
    });

    await store.getState().createRoom();
    await store.getState().leaveRoom();

    expect(store.getState().status).toBe('idle');
    expect(store.getState().inviteCode).toBeNull();
  });

  it('notifies the remaining player when the opponent leaves', async () => {
    const transport = createMemoryMatchTransport();
    const hostStore = createOnlineStore({
      transport,
      createPlayerId: () => 'host-1',
    });
    const guestStore = createOnlineStore({
      transport,
      createPlayerId: () => 'guest-1',
    });

    await hostStore.getState().createRoom();
    const code = hostStore.getState().inviteCode!;
    await guestStore.getState().joinRoom(code);

    await hostStore.getState().leaveRoom();
    await Promise.resolve();

    expect(guestStore.getState().status).toBe('opponentLeft');
    expect(guestStore.getState().error).toMatch(/opponent left/i);
  });
});
