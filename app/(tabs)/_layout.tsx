import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { colors } from '@/constants/theme';

function FabIcon() {
  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        // Lift the mic above the "Play" label so they don't collide.
        marginBottom: 28,
        backgroundColor: colors.fab,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SymbolView
        name={{
          ios: 'mic.fill',
          android: 'mic',
          web: 'mic',
        }}
        tintColor={colors.background}
        size={28}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.purple,
          height: 68,
          paddingTop: 6,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.2.fill',
                android: 'group',
                web: 'group',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'Play',
          tabBarLabel: 'Play',
          tabBarLabelStyle: { marginTop: 6 },
          tabBarIcon: () => <FabIcon />,
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          // Deferred for v1 — file kept so deep links do not 404.
          href: null,
          title: 'Rank',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'person.crop.circle.fill',
                android: 'person',
                web: 'person',
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
