import { act, fireEvent, render } from '@testing-library/react-native';

import ProfileSetupScreen from '@/app/profile-setup';
import {
  createTestProfileDeps,
  setProfileDepsForTests,
  useProfileStore,
} from '@/store/profileStore';

describe('<ProfileSetupScreen />', () => {
  beforeEach(() => {
    setProfileDepsForTests(
      createTestProfileDeps({
        createPublicId: () => 'ENC-SETUPXXX',
      }),
    );
  });

  it('requires a display name before continuing', async () => {
    const { getByText, getByLabelText } = await render(<ProfileSetupScreen />);

    expect(getByText(/create your singer/i)).toBeTruthy();
    expect(getByLabelText(/display name/i)).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Save profile'));
    });

    expect(useProfileStore.getState().hasCompletedProfileSetup).toBe(false);
  });

  it('saves the display name and marks setup complete', async () => {
    const { getByText, getByLabelText } = await render(<ProfileSetupScreen />);

    await act(async () => {
      fireEvent.changeText(getByLabelText(/display name/i), 'Nightingale');
    });
    await act(async () => {
      fireEvent.press(getByText('Save profile'));
    });

    expect(useProfileStore.getState().displayName).toBe('Nightingale');
    expect(useProfileStore.getState().hasCompletedProfileSetup).toBe(true);
    expect(useProfileStore.getState().publicId).toBe('ENC-SETUPXXX');
  });
});
