import { render } from '@testing-library/react-native';

import PlayScreen from '@/app/(tabs)/play';
import FriendsScreen from '@/app/(tabs)/friends';
import RankScreen from '@/app/(tabs)/rank';
import ProfileScreen from '@/app/(tabs)/profile';

describe('PDF tab screens', () => {
  it('Play tab offers Party and Online entry points', async () => {
    const { getByText } = await render(<PlayScreen />);

    expect(getByText('Play')).toBeTruthy();
    expect(getByText('Party Mode')).toBeTruthy();
    expect(getByText('Online Match')).toBeTruthy();
  });

  it('Friends tab shows a friends placeholder', async () => {
    const { getByText } = await render(<FriendsScreen />);
    expect(getByText('Friends')).toBeTruthy();
  });

  it('Rank screen still exists for deep links but is not a main tab', async () => {
    const { getByText } = await render(<RankScreen />);
    expect(getByText('Rank')).toBeTruthy();
    expect(getByText(/coming next/i)).toBeTruthy();
  });

  it('Profile tab shows profile and settings entry', async () => {
    const { getByText } = await render(<ProfileScreen />);
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });
});
