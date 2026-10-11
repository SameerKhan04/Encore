import { act, fireEvent, render } from '@testing-library/react-native';

import { MicDeniedFallback } from '@/components/MicDeniedFallback';
import { usePreferencesStore } from '@/store/preferencesStore';

describe('<MicDeniedFallback />', () => {
  const openSettings = jest.fn();

  beforeEach(() => {
    usePreferencesStore.getState().clearCache();
    openSettings.mockReset();
  });

  it('explains why the microphone is required', async () => {
    const { getByText } = await render(
      <MicDeniedFallback onOpenSettings={openSettings} />,
    );

    expect(getByText('Microphone access needed')).toBeTruthy();
    expect(
      getByText(/needs the microphone so you can sing your challenge/i),
    ).toBeTruthy();
  });

  it('offers Open Settings and Demo Mode actions', async () => {
    const { getByText } = await render(
      <MicDeniedFallback onOpenSettings={openSettings} />,
    );

    expect(getByText('Open Settings')).toBeTruthy();
    expect(getByText('Play in Demo/Mock Mode')).toBeTruthy();
  });

  it('opens device settings when requested', async () => {
    const { getByText } = await render(
      <MicDeniedFallback onOpenSettings={openSettings} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Open Settings'));
    });

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('enables demo mode from the fallback action', async () => {
    const { getByText } = await render(
      <MicDeniedFallback onOpenSettings={openSettings} />,
    );

    await act(async () => {
      fireEvent.press(getByText('Play in Demo/Mock Mode'));
    });

    expect(usePreferencesStore.getState().demoMode).toBe(true);
  });
});
