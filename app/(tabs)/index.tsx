import { StyleSheet, Text, View } from 'react-native';

import { brand, colors, spacing, typography } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container} testID="home-shell">
      <Text style={styles.brand}>{brand.name}</Text>
      <Text style={styles.tagline}>{brand.tagline}</Text>
      <Text style={styles.status}>Phase 1 foundation ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  brand: {
    fontSize: typography.brand,
    fontWeight: '800',
    letterSpacing: 4,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  status: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
