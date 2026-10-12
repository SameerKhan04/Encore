import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';
import { useProfileStore } from '@/store/profileStore';

export default function ProfileScreen() {
  const displayName = useProfileStore((s) => s.displayName);
  const publicId = useProfileStore((s) => s.publicId);
  const updateDisplayName = useProfileStore((s) => s.updateDisplayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);

  const onShareId = async () => {
    if (!publicId) {
      return;
    }
    try {
      await Share.share({ message: publicId });
    } catch {
      // User dismissed share sheet.
    }
  };

  const onSaveName = async () => {
    const ok = await updateDisplayName(draft);
    if (ok) {
      setEditing(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      {editing ? (
        <View style={styles.block}>
          <TextInput
            accessibilityLabel="Display name"
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            maxLength={24}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void onSaveName();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Save name</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.name}>{displayName || 'Singer'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDraft(displayName);
              setEditing(true);
            }}
          >
            <Text style={styles.link}>Edit name</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.label}>Your Encore ID</Text>
        <Text style={styles.id}>{publicId ?? '—'}</Text>
        <Pressable accessibilityRole="button" onPress={() => void onShareId()}>
          <Text style={styles.link}>Share ID</Text>
        </Pressable>
      </View>

      <Text style={styles.caption}>
        This profile lives on this phone — no account sign-in.
      </Text>

      <Link href="/(tabs)/settings" asChild>
        <Pressable accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.gold,
  },
  name: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  block: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  id: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.pink,
    letterSpacing: 1,
  },
  link: {
    color: colors.purple,
    fontWeight: '600',
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    fontSize: typography.body,
  },
  primaryButton: {
    backgroundColor: colors.pink,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: typography.body,
  },
});
