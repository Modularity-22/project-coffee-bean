import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AppHeader } from '@/components/Brand';
import { colors, radius, space } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Tab icon: outline when idle; filled, in a highlighted pill, when active. */
const icon = (idle: IconName, active: IconName) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return (
      <View style={[styles.pill, focused && styles.pillActive]}>
        <MaterialCommunityIcons
          name={focused ? active : idle}
          size={22}
          color={focused ? colors.primary : colors.textMuted}
        />
      </View>
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        // One compact header on every tab: logo left, name centred.
        header: () => <AppHeader />,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Discover', tabBarIcon: icon('compass-outline', 'compass') }}
      />
      <Tabs.Screen
        name="roasters"
        options={{ title: 'Roasters', tabBarIcon: icon('storefront-outline', 'storefront') }}
      />
      <Tabs.Screen
        name="beans"
        options={{ title: 'Beans', tabBarIcon: icon('seed-outline', 'seed') }}
      />
      <Tabs.Screen
        name="taste"
        options={{ title: 'Taste', tabBarIcon: icon('coffee-outline', 'coffee') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.select({ ios: 92, default: 78 }),
    paddingTop: 6,
    paddingBottom: Platform.select({ ios: 30, default: 12 }),
  },
  item: { paddingVertical: 2 },
  label: { fontSize: 12, fontWeight: '500', marginTop: space.xs },
  pill: {
    width: 56,
    height: 32,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.chip },
});
