import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import OnlineScreen from '@/app/online';
import { appMatchTransport, useOnlineStore } from '@/store/onlineStore';

describe('<OnlineScreen />', () => {
  beforeEach(async () => {
    await useOnlineStore.getState().leaveRoom();
  });

  it('creates a match and shows the invite code', async () => {
    const { getByText, findByText } = await render(<OnlineScreen />);

    await act(async () => {
      fireEvent.press(getByText('Create match'));
    });

    await waitFor(() => {
      expect(useOnlineStore.getState().inviteCode).toBeTruthy();
    });

    const code = useOnlineStore.getState().inviteCode!;
    expect(await findByText(code)).toBeTruthy();
    expect(getByText(/waiting for opponent/i)).toBeTruthy();
  });

  it('joins a match with an invite code', async () => {
    // Keep a host lobby alive on the shared transport (do not abandon it).
    const host = await appMatchTransport.createMatch('host-screen-test');
    const joinCode = host.inviteCode;

    const { getByText, getByLabelText } = await render(<OnlineScreen />);

    await act(async () => {
      fireEvent.changeText(getByLabelText('Invite code'), joinCode);
    });
    await act(async () => {
      fireEvent.press(getByText('Join match'));
    });

    await waitFor(() => {
      expect(useOnlineStore.getState().status).toBe('ready');
      expect(useOnlineStore.getState().role).toBe('guest');
    });
    expect(getByText(/match ready/i)).toBeTruthy();
  });
});
