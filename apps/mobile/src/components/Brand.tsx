import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

/**
 * The hand holding a coffee bean, without the circle or the name. Used in the
 * header and the footer. (The start-up animation uses the full logo.)
 */
const MARK = require('../../assets/brand/hand.png');

export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Project Coffee Bean logo"
    />
  );
}

const BAR_HEIGHT = 52;
const SIDE = 40; // same width on both sides keeps the name truly centred

/** The app header used on every tab: logo on the left, name in the centre. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          <Mark size={36} />
        </View>
        <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
          Project Coffee Bean
        </Text>
        <View style={styles.side} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  side: { width: SIDE, alignItems: 'flex-start', justifyContent: 'center' },
  name: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
});
