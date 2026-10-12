import Slider from '@react-native-community/slider';
import { StyleSheet, Switch, Text, Pressable, View } from 'react-native';

import appJson from '@/app.json';
import { Screen } from '@/components/Screen';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { usePreferencesStore } from '@/store/preferencesStore';

const APP_VERSION = appJson.expo.version ?? '1.0.0';

export default function SettingsScreen() {
  const hapticsEnabled = usePreferencesStore((s) => s.hapticsEnabled);
  const volume = usePreferencesStore((s) => s.volume);
  const setHapticsEnabled = usePreferencesStore((s) => s.setHapticsEnabled);
  const setVolume = usePreferencesStore((s) => s.setVolume);
  const clearCache = usePreferencesStore((s) => s.clearCache);

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Haptics</Text>
        <Switch
          accessibilityLabel="Haptics"
          value={hapticsEnabled}
          onValueChange={setHapticsEnabled}
          trackColor={{ false: colors.textMuted, true: colors.accent }}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Volume</Text>
        <Text style={styles.caption}>{Math.round(volume * 100)}%</Text>
        <Slider
          accessibilityLabel="Volume"
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.textMuted}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>About</Text>
        <Text style={styles.about}>
          {brand.name} — {brand.tagline}
        </Text>
        <Text style={styles.caption}>Version {APP_VERSION}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={clearCache}
        style={styles.dangerButton}
      >
        <Text style={styles.dangerButtonText}>Clear cache</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  block: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  about: {
    fontSize: typography.body,
    color: colors.text,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
