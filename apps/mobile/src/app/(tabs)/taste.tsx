import { StyleSheet, Text, View } from 'react-native';
import { Screen, Section } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme';

// A preview of the planned tasting phase (docs/roadmap.md). Nothing is recorded yet.
const STEPS = [
  ['Smell', 'Before you sip, smell the cup. Fruit, flowers, chocolate, nuts, spice?'],
  ['Slurp', 'Take a quick, noisy sip so the coffee spreads across your whole tongue.'],
  ['Acidity', 'Is there a bright, juicy liveliness, like citrus or apple, or is the cup mellow?'],
  ['Sweetness', 'Look for sugar-like notes: caramel, honey, ripe fruit.'],
  ['Body', 'How does it feel? Light like tea, or heavy and syrupy?'],
  ['Finish', 'What stays after you swallow, and for how long?'],
] as const;

export default function TasteScreen() {
  return (
    <Screen>
      <View style={styles.head}>
        <Text style={fonts.title}>Learn to taste coffee</Text>
        <Text style={fonts.muted}>Planned</Text>
      </View>
      <Text style={fonts.body}>
        A guided tasting, and a log of every bean and cafe drink you try, are planned for this tab.
        Until then, here are the six steps the guide will walk you through.
      </Text>
      <Section title="The six steps">
        {STEPS.map(([name, text], i) => (
          <View key={name} style={styles.step}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{i + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={fonts.heading}>{name}</Text>
              <Text style={fonts.muted}>{text}</Text>
            </View>
          </View>
        ))}
      </Section>
      <Text style={fonts.muted}>
        Tip: open a bean in the catalogue and compare what you taste with the roaster’s notes.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  step: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.primary, fontWeight: '500', fontVariant: ['tabular-nums'] },
  stepBody: { flex: 1, gap: space.xs },
});
