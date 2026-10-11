import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/(tabs)/settings';
import { usePreferencesStore } from '@/store/preferencesStore';

describe('<SettingsScreen />', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
  });

  it('renders Settings, Haptics, Volume, About, and Clear cache', async () => {
    const { getByText } = await render(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Haptics')).toBeTruthy();
    expect(getByText('Volume')).toBeTruthy();
    expect(getByText('About')).toBeTruthy();
    expect(getByText('Clear cache')).toBeTruthy();
  });

  it('toggles haptics from the switch control', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent(getByLabelText('Haptics'), 'valueChange', false);
    });

    expect(usePreferencesStore.getState().hapticsEnabled).toBe(false);
  });

  it('updates volume from the slider', async () => {
    const { getByLabelText } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent(getByLabelText('Volume'), 'valueChange', 0.25);
    });

    expect(usePreferencesStore.getState().volume).toBe(0.25);
  });

  it('clears cache from the settings action', async () => {
    usePreferencesStore.getState().setHapticsEnabled(false);
    usePreferencesStore.getState().completeOnboarding();
    const { getByText, getByLabelText } = await render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(getByText('Clear cache'));
    });

    expect(usePreferencesStore.getState().hapticsEnabled).toBe(true);
    expect(usePreferencesStore.getState().hasCompletedOnboarding).toBe(false);

    await waitFor(() => {
      expect(getByLabelText('Haptics').props.value).toBe(true);
    });
  });
});
