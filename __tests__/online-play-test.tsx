import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import OnlineScreen from '@/app/online';
import { useGameStore } from '@/store/gameStore';
import {
  appMatchTransport,
  createOnlineStore,
  useOnlineStore,
} from '@/store/onlineStore';

describe('<OnlineScreen /> synced play', () => {
  beforeEach(() => {
    useOnlineStore.getState().leaveRoom();
    useGameStore.getState().reset();
  });

  it('lets the host start the online match and reach singing', async () => {
    await useOnlineStore.getState().createRoom();
    const code = useOnlineStore.getState().inviteCode!;

    const guestStore = createOnlineStore({
      transport: appMatchTransport,
      createPlayerId: () => 'guest-test',
    });
    await guestStore.getState().joinRoom(code);

    await waitFor(() => {
      expect(useOnlineStore.getState().status).toBe('ready');
      expect(useOnlineStore.getState().guestJoined).toBe(true);
    });

    const { getByText } = await render(<OnlineScreen />);

    await act(async () => {
      fireEvent.press(getByText('Start online match'));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('ROUND_START');
    });
    expect(getByText(/Challenge:/i)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText("I'm ready"));
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('PLAYER_PREPARING');
    });

    await act(async () => {
      fireEvent.press(getByText('Start singing'));
    });
    await act(async () => {
      useGameStore.getState().startTimedSinging(Date.now());
    });

    await waitFor(() => {
      expect(useGameStore.getState().state).toBe('PLAYER_SINGING');
    });
    expect(getByText(/Demo sing/i)).toBeTruthy();
    // Explain why Record is missing instead of hiding it silently.
    expect(getByText(/record live|expo go on a phone/i)).toBeTruthy();
  });

  it('shows waiting copy when it is not the local player turn', async () => {
    await useOnlineStore.getState().createRoom();
    const code = useOnlineStore.getState().inviteCode!;
    const guestStore = createOnlineStore({
      transport: appMatchTransport,
      createPlayerId: () => 'guest-wait',
    });
    await guestStore.getState().joinRoom(code);
    useOnlineStore.setState({ role: 'guest' });
    useGameStore.getState().startPartyMatch();
    useGameStore.setState({ activePlayer: 'A', state: 'PLAYER_SINGING' });

    const { getByText, queryByText } = await render(<OnlineScreen />);

    expect(getByText(/waiting for player a/i)).toBeTruthy();
    expect(queryByText(/Demo sing/i)).toBeNull();
  });

  it('mutes match voice for the listener while the opponent sings', async () => {
    await useOnlineStore.getState().createRoom();
    const code = useOnlineStore.getState().inviteCode!;
    const guestStore = createOnlineStore({
      transport: appMatchTransport,
      createPlayerId: () => 'guest-voice',
    });
    await guestStore.getState().joinRoom(code);
    useOnlineStore.setState({ role: 'guest' });
    useGameStore.getState().startPartyMatch();

    const { getByText, getByTestId } = await render(<OnlineScreen />);

    await waitFor(() => {
      expect(getByTestId('voice-status')).toHaveTextContent(/voice:/i);
    });

    await act(async () => {
      useGameStore.setState({ state: 'PLAYER_SINGING', activePlayer: 'A' });
    });

    await waitFor(() => {
      expect(getByTestId('voice-status')).toHaveTextContent(/voice:\s*listening/i);
    });
    expect(getByText(/your mic muted/i)).toBeTruthy();
  });
});
