import { render } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import { useProfileStore } from '@/store/profileStore';

describe('<ProfileScreen />', () => {
  beforeEach(() => {
    useProfileStore.setState({
      publicId: 'ENC-PROFILE1',
      displayName: 'Star Singer',
      hasCompletedProfileSetup: true,
      friends: [],
      hydrated: true,
    });
  });

  it('shows display name, public id, and settings link', async () => {
    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('Star Singer')).toBeTruthy();
    expect(getByText('ENC-PROFILE1')).toBeTruthy();
    expect(getByText(/lives on this phone/i)).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Share ID')).toBeTruthy();
  });
});
