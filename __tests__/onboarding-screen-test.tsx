import { act, fireEvent, render } from '@testing-library/react-native';

import OnboardingScreen from '@/app/onboarding';
import { brand } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';

describe('<OnboardingScreen />', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
  });

  it('explains the lyrics-to-challenge loop', async () => {
    const { getByText } = await render(<OnboardingScreen />);

    expect(getByText(brand.name)).toBeTruthy();
    expect(getByText(/your lyrics become their challenge/i)).toBeTruthy();
    expect(getByText(/sing a word/i)).toBeTruthy();
    expect(getByText(/opponent picks/i)).toBeTruthy();
  });

  it('completes onboarding when Continue is pressed', async () => {
    const { getByText } = await render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    expect(usePreferencesStore.getState().hasCompletedOnboarding).toBe(true);
  });
});
