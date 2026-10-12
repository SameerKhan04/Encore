import { render } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { brand } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';

describe('<HomeScreen />', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
  });

  it('renders the ENCORE brand as the primary signal', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(brand.name)).toBeTruthy();
  });

  it('renders the core gameplay tagline', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(brand.tagline)).toBeTruthy();
  });

  it('offers Party Mode and Online Match entry points', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText('Party Mode')).toBeTruthy();
    expect(getByText('Online Match')).toBeTruthy();
  });

  it('shows How to play when onboarding is incomplete', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText('How to play')).toBeTruthy();
  });

  it('hides debug and ship-chrome from the store Home', async () => {
    const { queryByText } = await render(<HomeScreen />);

    expect(queryByText(/phase 10/i)).toBeNull();
    expect(queryByText(/State:/i)).toBeNull();
    expect(queryByText('Word Selection')).toBeNull();
    expect(queryByText(/open state debug/i)).toBeNull();
  });
});
