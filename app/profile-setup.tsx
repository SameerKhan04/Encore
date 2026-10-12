import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { brand, colors, spacing, typography } from '@/constants/theme';
import { useProfileStore } from '@/store/profileStore';

export default function ProfileSetupScreen() {
  const completeSetup = useProfileStore((s) => s.completeSetup);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const ok = await completeSetup(name);
    setSaving(false);
    if (!ok) {
      setError('Enter a display name to continue.');
      return;
    }
    try {
      router.replace('/(tabs)');
    } catch {
      // Router may be unavailable outside a navigation tree (unit tests).
    }
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.title}>Create your singer</Text>
      <Text style={styles.caption}>
        This profile lives on this phone — no email, phone number, or password.
        Friends will add you with your Encore ID.
      </Text>

      <View style={styles.block}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          accessibilityLabel="Display name"
          value={name}
          onChangeText={setName}
          placeholder="Your singer name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="words"
          maxLength={24}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void onSave();
          }}
          style={styles.primaryButton}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>Save profile</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    fontSize: typography.brand,
    fontWeight: '800',
    color: colors.pink,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  block: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  label: {
    fontSize: typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    fontSize: typography.body,
  },
  error: {
    color: colors.danger ?? colors.pink,
    fontSize: typography.caption,
  },
  primaryButton: {
    backgroundColor: colors.pink,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: typography.body,
  },
});
