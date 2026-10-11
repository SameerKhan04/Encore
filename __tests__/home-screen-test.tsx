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

  it('shows a Phase 4 audio status line', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(/phase 4 audio \+ mocks ready/i)).toBeTruthy();
  });

  it('shows the live game state from the store', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText('State: IDLE')).toBeTruthy();
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
});
