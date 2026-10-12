import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/constants/theme';

export default function RankScreen() {
  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Rank</Text>
      <Text style={styles.caption}>
        Leaderboards and match history — coming next.
      </Text>
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
    color: colors.purple,
  },
  caption: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
