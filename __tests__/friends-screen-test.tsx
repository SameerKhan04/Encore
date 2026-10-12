import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import FriendsScreen from '@/app/(tabs)/friends';
import { createMemoryProfileDirectory } from '@/services/profileDirectory';
import {
  createTestProfileDeps,
  setProfileDepsForTests,
  useProfileStore,
} from '@/store/profileStore';

describe('<FriendsScreen />', () => {
  beforeEach(async () => {
    const directory = createMemoryProfileDirectory();
    await directory.upsert({
      publicId: 'ENC-BUDDYXXX',
      displayName: 'Buddy',
    });
    await directory.upsert({
      publicId: 'ENC-SELFXXXX',
      displayName: 'Me',
    });
    setProfileDepsForTests(
      createTestProfileDeps({
        directory,
        createPublicId: () => 'ENC-SELFXXXX',
      }),
    );
    // Rebind singleton methods to mutated deps by resetting through hydrate.
    await useProfileStore.getState().completeSetup('Me');
  });

  it('shows my id and empty friends state', async () => {
    const { getByText } = await render(<FriendsScreen />);

    expect(getByText('ENC-SELFXXXX')).toBeTruthy();
    expect(getByText(/no friends yet/i)).toBeTruthy();
  });

  it('sends a friend request by public id', async () => {
    const { getByText, getByLabelText } = await render(<FriendsScreen />);

    await act(async () => {
      fireEvent.changeText(getByLabelText(/friend id/i), 'ENC-BUDDYXXX');
    });
    await act(async () => {
      fireEvent.press(getByText('Send request'));
    });

    await waitFor(() => {
      expect(getByText(/friend request sent/i)).toBeTruthy();
    });
  });
});
