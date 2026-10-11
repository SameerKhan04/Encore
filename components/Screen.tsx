import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/** Safe-area layout shell for app screens. */
export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView testID="screen-shell" style={[styles.shell, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
});
