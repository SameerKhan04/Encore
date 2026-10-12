import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { colors } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useProfileStore } from '@/store/profileStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function useProfileGate() {
  const router = useRouter();
  const segments = useSegments();
  const hydrate = useProfileStore((s) => s.hydrate);
  const hydrated = useProfileStore((s) => s.hydrated);
  const hasCompletedProfileSetup = useProfileStore(
    (s) => s.hasCompletedProfileSetup,
  );
  const hydratePrefs = usePreferencesStore((s) => s.hydrate);
  const startSocialSubscriptions = useProfileStore(
    (s) => s.startSocialSubscriptions,
  );
  const refreshSocial = useProfileStore((s) => s.refreshSocial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([hydrate(), hydratePrefs()]).finally(() => setReady(true));
  }, [hydrate, hydratePrefs]);

  const touchPresence = useProfileStore((s) => s.touchPresence);

  useEffect(() => {
    if (!ready || !hydrated || !hasCompletedProfileSetup) {
      return;
    }
    void refreshSocial();
    void touchPresence();
    const heartbeat = setInterval(() => {
      void touchPresence();
    }, 30_000);
    const unsub = startSocialSubscriptions();
    return () => {
      clearInterval(heartbeat);
      unsub();
    };
  }, [
    ready,
    hydrated,
    hasCompletedProfileSetup,
    refreshSocial,
    startSocialSubscriptions,
    touchPresence,
  ]);

  useEffect(() => {
    if (!ready || !hydrated) {
      return;
    }
    const onSetup = segments[0] === 'profile-setup';
    if (!hasCompletedProfileSetup && !onSetup) {
      router.replace('/profile-setup');
      return;
    }
    if (hasCompletedProfileSetup && onSetup) {
      router.replace('/(tabs)');
    }
  }, [ready, hydrated, hasCompletedProfileSetup, segments, router]);

  return ready && hydrated;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  // Always mount the navigator so expo-router linking can update state safely.
  useProfileGate();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="onboarding"
            options={{ title: 'How to play', presentation: 'modal' }}
          />
          <Stack.Screen
            name="profile-setup"
            options={{ title: 'Create your singer', headerShown: false }}
          />
          <Stack.Screen name="party" options={{ title: 'Party Mode' }} />
          <Stack.Screen name="online" options={{ title: 'Online Match' }} />
          <Stack.Screen
            name="audio-lab"
            options={{ title: 'Audio Lab' }}
          />
          <Stack.Screen
            name="word-selection"
            options={{ title: 'Word Selection' }}
          />
          <Stack.Screen
            name="debug-game"
            options={{ title: 'Game State Debug' }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
