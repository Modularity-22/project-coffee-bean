import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, space } from '@/theme';

const MARK = require('../../assets/brand/mark.png');
const WORDMARK = require('../../assets/brand/wordmark.png');

/** Shortest time the intro stays up, so it reads as a moment rather than a flash. */
const MIN_SHOW_MS = 1400;
const native = Platform.OS !== 'web';

/**
 * The startup screen. It takes over from the native splash (same mark, same
 * background, same place), animates the logo in, waits until the app is
 * `ready`, then fades out to reveal the home screen.
 */
export function Intro({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [mark] = useState(() => new Animated.Value(0));
  const [words] = useState(() => new Animated.Value(0));
  const [tagline] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));
  const [entered, setEntered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Enter: the mark settles, the wordmark rises in, then the tagline.
  useEffect(() => {
    let cancelled = false;
    SplashScreen.hide();
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        setReduceMotion(reduce);
        const timing = (value: Animated.Value, duration: number, delay = 0) =>
          Animated.timing(value, {
            toValue: 1,
            duration: reduce ? 1 : duration,
            delay: reduce ? 0 : delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: native,
          });
        Animated.parallel([
          timing(mark, 700),
          timing(words, 600, 350),
          timing(tagline, 500, 750),
        ]).start();
        setTimeout(() => !cancelled && setEntered(true), reduce ? 300 : MIN_SHOW_MS);
      });
    return () => {
      cancelled = true;
    };
  }, [mark, words, tagline]);

  // Exit once the logo has had its moment and the app is ready underneath.
  useEffect(() => {
    if (!entered || !ready) return;
    Animated.timing(exit, {
      toValue: 1,
      duration: reduceMotion ? 1 : 450,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: native,
    }).start(() => onFinish());
  }, [entered, ready, exit, reduceMotion, onFinish]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
        },
      ]}
      accessibilityLabel="Project Coffee Bean"
      accessibilityRole="image"
    >
      <View style={styles.center}>
        <Animated.Image
          source={MARK}
          resizeMode="contain"
          style={[
            styles.mark,
            {
              opacity: mark,
              transform: [
                { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
                {
                  rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '0deg'] }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: words,
            transform: [
              { translateY: words.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          }}
        >
          <Image source={WORDMARK} resizeMode="contain" style={styles.wordmark} />
        </Animated.View>
        <Animated.Text style={[styles.tagline, { opacity: tagline }]}>
          Know what is in your cup, and who roasted it
        </Animated.Text>
      </View>
      <Animated.View style={[styles.footer, { opacity: tagline }]}>
        <Text style={styles.footerText}>An open database of coffee</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  center: { alignItems: 'center', paddingHorizontal: space.xl },
  // Same width as the native splash image, so the hand-over is seamless.
  mark: { width: 200, height: 200 },
  wordmark: { width: 250, height: 76, marginTop: space.sm },
  tagline: {
    marginTop: space.lg,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: { position: 'absolute', bottom: 48 },
  footerText: { fontSize: 13, color: colors.textMuted },
});
