import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Intro } from '@/components/Intro';
import { Button } from '@/components/ui';
import { DATABASE_NAME, DATABASE_SOURCE } from '@/db';
import { colors, fonts, space } from '@/theme';

// Keep the native splash up until the animated intro has taken its place.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

/** Rendered inside the database provider, so it only mounts once the catalogue is open. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Suspense fallback={null}>
        {/* The catalogue is read-only. Its on-device copy is named after the
            data version and copied only once (see src/db.ts). User data
            (tasting logs, planned) must live in a separate database. */}
        <SQLiteProvider databaseName={DATABASE_NAME} assetSource={DATABASE_SOURCE} useSuspense>
          <Ready onReady={markReady} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text, fontWeight: '500' },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="company" options={{ title: 'Roaster' }} />
            <Stack.Screen name="bean" options={{ title: 'Bean' }} />
            <Stack.Screen name="flavour" options={{ title: 'Flavour family' }} />
            <Stack.Screen name="note" options={{ title: 'Flavour' }} />
            <Stack.Screen name="drink" options={{ title: 'Drink' }} />
          </Stack>
        </SQLiteProvider>
      </Suspense>
      {introDone ? null : <Intro ready={ready} onFinish={finishIntro} />}
    </View>
  );
}

/** Shown if the catalogue cannot be opened, instead of a blank screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hide();
  }, []);
  const otherTab = /access handle|createSyncAccessHandle|locked|busy/i.test(error.message);
  return (
    <View style={[styles.root, styles.error]}>
      <Image
        source={require('../../assets/brand/mark.png')}
        style={styles.errorMark}
        resizeMode="contain"
      />
      <Text style={fonts.title}>Couldn’t open the coffee catalogue</Text>
      <Text style={[fonts.body, styles.errorText]}>
        {otherTab
          ? 'Coffee Bean is already open in another browser tab. Close that tab, then try again.'
          : 'Something went wrong while loading. Try again, and if it keeps happening, restart the app.'}
      </Text>
      <Button label="Try again" icon="refresh" variant="primary" onPress={retry} />
      <Text style={[fonts.muted, styles.errorText]}>{error.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  error: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  errorMark: { width: 120, height: 120 },
  errorText: { textAlign: 'center' },
});
