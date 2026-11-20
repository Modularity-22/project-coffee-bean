import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  BeanCard,
  ChipRow,
  Empty,
  Loading,
  NoteChip,
  Screen,
  Section,
  TextLink,
} from '@/components/ui';
import { BEAN_LIST_SQL, useQuery, type BeanRow } from '@/db';
import { familyColor, fonts, space } from '@/theme';

interface Term {
  id: string;
  name: string;
  tier: number;
  parent_id: string;
  n: number;
}

/** A flavour-wheel category (for example Fruity): its groups, terms and beans. */
export default function FlavourFamilyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useQuery<{ name: string }>(`SELECT name FROM flavor_note WHERE id = ?`, [id]);
  const terms = useQuery<Term>(
    `SELECT n.id, n.name, n.tier, n.parent_id,
            (SELECT count(*) FROM bean_flavor_note bfn WHERE bfn.flavor_note_id = n.id) AS n
       FROM flavor_note n WHERE n.family_id = ? AND n.tier > 1 ORDER BY n.tier, n.name`,
    [id],
  );
  const beans = useQuery<BeanRow>(
    `${BEAN_LIST_SQL}
      WHERE b.id IN (SELECT bfn.bean_id FROM bean_flavor_note bfn
                       JOIN flavor_note n ON n.id = bfn.flavor_note_id WHERE n.family_id = ?)
      ORDER BY b.name LIMIT 20`,
    [id],
  );
  if (!family || !terms || !beans) return <Loading />;
  const f = family[0];
  if (!f) return <Empty text="Flavour family not found" />;

  const label = (t: Term) => (t.n > 0 ? `${t.name} · ${t.n}` : t.name);
  const groups = terms.filter((t) => t.tier === 2);
  const childrenOf = (groupId: string) => terms.filter((t) => t.parent_id === groupId);
  // Terms that sit directly under the category, with nothing below them.
  const loose = groups.filter((g) => childrenOf(g.id).length === 0);
  const nested = groups.filter((g) => childrenOf(g.id).length > 0);

  return (
    <Screen>
      <View style={styles.head}>
        <View style={[styles.swatch, { backgroundColor: familyColor(id) }]} />
        <Text style={fonts.display}>{f.name}</Text>
      </View>
      <Text style={fonts.muted}>
        A category of the coffee taster’s flavour wheel. Tap a term to see beans that list it.
      </Text>

      {loose.length > 0 ? (
        <Section title="Terms">
          <ChipRow>
            {loose.map((t) => (
              <NoteChip
                key={t.id}
                note={{ name: label(t), family: id }}
                href={{ pathname: '/note', params: { id: t.id } }}
              />
            ))}
          </ChipRow>
        </Section>
      ) : null}
      {nested.map((g) => (
        <Section
          key={g.id}
          title={g.name}
          action={<TextLink label="All" href={{ pathname: '/note', params: { id: g.id } }} />}
        >
          <ChipRow>
            {childrenOf(g.id).map((t) => (
              <NoteChip
                key={t.id}
                note={{ name: label(t), family: id }}
                href={{ pathname: '/note', params: { id: t.id } }}
              />
            ))}
          </ChipRow>
        </Section>
      ))}

      <Section
        title="Beans"
        action={
          <TextLink
            label="Filter all beans"
            href={{ pathname: '/beans', params: { family: id } }}
          />
        }
      >
        {beans.length === 0 ? <Empty text="No beans in this category yet" /> : null}
        {beans.map((b) => (
          <BeanCard key={b.id} bean={b} />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  swatch: { width: 14, height: 34, borderRadius: 7 },
});
