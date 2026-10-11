import { render } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { brand } from '@/constants/theme';

describe('<HomeScreen />', () => {
  it('renders the ENCORE brand as the primary signal', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(brand.name)).toBeTruthy();
  });

  it('renders the core gameplay tagline', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(brand.tagline)).toBeTruthy();
  });

  it('shows a Phase 1 foundation status line', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText(/phase 1 foundation ready/i)).toBeTruthy();
  });
});
