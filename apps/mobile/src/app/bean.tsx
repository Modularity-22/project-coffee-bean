import { useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text } from 'react-native';
import { FlavourProfile } from '@/components/FlavourProfile';
import {
  Badge,
  BeanCard,
  Button,
  Card,
  ChipRow,
  Empty,
  Fact,
  Loading,
  NoteChip,
  Notice,
  Screen,
  Section,
} from '@/components/ui';
import { BEAN_LIST_SQL, useQuery, type BeanRow } from '@/db';
import { fonts, space } from '@/theme';

interface BeanDetail {
  id: string;
  name: string;
  company_id: string;
  company: string;
  company_verified: number;
  roast: string | null;
  roast_order: number | null;
  process: string | null;
  is_blend: number;
  is_decaf: number;
  sold_ground: number;
  sold_whole_bean: number;
  altitude_min_m: number | null;
  altitude_max_m: number | null;
  roaster_notes: string | null;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  bitterness: number | null;
  serve: 'black' | 'milk' | 'either' | null;
  url: string;
  availability: string;
  retrieved_on: string;
}

export default function BeanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bean = useQuery<BeanDetail>(
    `SELECT b.*, c.name AS company, c.verified AS company_verified,
            r.name AS roast, r.sort_order AS roast_order, p.name AS process
       FROM bean b JOIN company c ON c.id = b.company_id
       LEFT JOIN roast_level r ON r.id = b.roast_level_id
       LEFT JOIN process p ON p.id = b.process_id
      WHERE b.id = ?`,
    [id],
  );
  const notes = useQuery<{ id: string; name: string; family: string }>(
    `SELECT n.id, n.name, n.family_id AS family FROM bean_flavor_note bfn
       JOIN flavor_note n ON n.id = bfn.flavor_note_id
      WHERE bfn.bean_id = ? ORDER BY bfn.position`,
    [id],
  );
  const brew = useQuery<{ id: string; name: string }>(
    `SELECT d.id, d.name FROM bean_brew_method bm JOIN drink_type d ON d.id = bm.drink_type_id
      WHERE bm.bean_id = ? ORDER BY d.name`,
    [id],
  );
  const origins = useQuery<{
    country: string;
    region: string | null;
    producer: string | null;
    percent: number | null;
  }>(
    `SELECT co.name AS country, o.region, o.producer, bo.percent
       FROM bean_origin bo JOIN origin o ON o.id = bo.origin_id
       JOIN country co ON co.code = o.country_code
      WHERE bo.bean_id = ?`,
    [id],
  );
  const varieties = useQuery<{ name: string }>(
    `SELECT v.name FROM bean_variety bv JOIN variety v ON v.id = bv.variety_id
      WHERE bv.bean_id = ? ORDER BY v.name`,
    [id],
  );
  const drinks = useQuery<{ id: string; name: string }>(
    `SELECT m.id, m.name FROM menu_item_bean mb JOIN menu_item m ON m.id = mb.menu_item_id
      WHERE mb.bean_id = ? ORDER BY m.name`,
    [id],
  );
  // Beans from any roaster that share at least two flavour notes with this one.
  const similar = useQuery<BeanRow>(
    `${BEAN_LIST_SQL}
       JOIN (SELECT x.bean_id AS sid, count(*) AS shared FROM bean_flavor_note x
              WHERE x.flavor_note_id IN (SELECT flavor_note_id FROM bean_flavor_note WHERE bean_id = ?)
                AND x.bean_id <> ?
              GROUP BY x.bean_id HAVING count(*) >= 2) s ON s.sid = b.id
      ORDER BY s.shared DESC, b.name LIMIT 5`,
    [id, id],
  );

  if (!bean || !notes || !brew || !origins || !varieties || !drinks || !similar) return <Loading />;
  const b = bean[0];
  if (!b) return <Empty text="Bean not found" />;

  const altitude =
    b.altitude_min_m === null
      ? null
      : b.altitude_min_m === b.altitude_max_m || b.altitude_max_m === null
        ? `${b.altitude_min_m} m`
        : `${b.altitude_min_m}–${b.altitude_max_m} m`;
  const soldAs = [b.sold_whole_bean ? 'whole bean' : null, b.sold_ground ? 'ground' : null]
    .filter(Boolean)
    .join(' or ');
  // Omni is not a darkness level, so it gets no gauge.
  const roastLevel = b.roast_order && b.roast_order <= 5 ? b.roast_order : null;

  return (
    <Screen>
      <Text style={fonts.display}>{b.name}</Text>
      <ChipRow>
        <Badge label={b.is_blend ? 'Blend' : 'Single origin'} />
        {b.process ? <Badge label={b.process} /> : null}
        {b.is_decaf ? <Badge label="Decaf" /> : null}
        {b.availability === 'seasonal' ? <Badge label="Seasonal" tone="warn" /> : null}
        {b.availability === 'discontinued' ? <Badge label="No longer sold" tone="warn" /> : null}
      </ChipRow>
      <Card
        href={{ pathname: '/company', params: { id: b.company_id } }}
        title={b.company}
        subtitle="Roasted by"
      />
      {b.company_verified ? null : (
        <Notice text="Collected automatically and not yet checked by a person. Compare with the roaster’s page before relying on it." />
      )}

      <Section title="Flavour profile">
        <FlavourProfile
          data={{
            notes,
            sweetness: b.sweetness,
            acidity: b.acidity,
            body: b.body,
            bitterness: b.bitterness,
          }}
          serving={{
            roast: b.roast,
            roastLevel,
            serve: b.serve,
            brewMethods: brew.map((m) => m.name),
          }}
        />
        <Text style={styles.subheading}>Tasting notes</Text>
        {notes.length > 0 ? (
          <ChipRow>
            {notes.map((n) => (
              <NoteChip key={n.id} note={n} href={{ pathname: '/note', params: { id: n.id } }} />
            ))}
          </ChipRow>
        ) : (
          <Text style={fonts.muted}>None listed by the roaster</Text>
        )}
        {b.roaster_notes ? (
          <Text style={fonts.muted}>In the roaster’s words: “{b.roaster_notes}”</Text>
        ) : null}
      </Section>

      {origins.length > 0 ? (
        <Section title="Grown in">
          {origins.map((o, i) => (
            <Card
              key={i}
              title={o.country + (o.percent ? ` · ${o.percent}%` : '')}
              subtitle={[o.producer, o.region].filter(Boolean).join(' · ')}
            />
          ))}
        </Section>
      ) : null}

      <Section title="Details">
        <Fact label="Varieties" value={varieties.map((v) => v.name).join(', ')} />
        <Fact label="Altitude" value={altitude} />
        <Fact label="Sold as" value={soldAs.charAt(0).toUpperCase() + soldAs.slice(1)} />
        <Fact label="Checked on" value={b.retrieved_on} />
      </Section>
      <Button
        label="See it on the roaster’s site"
        icon="open-in-new"
        onPress={() => Linking.openURL(b.url)}
      />

      {drinks.length > 0 ? (
        <Section title="Used in drinks">
          {drinks.map((d) => (
            <Card key={d.id} href={{ pathname: '/drink', params: { id: d.id } }} title={d.name} />
          ))}
        </Section>
      ) : null}

      {similar.length > 0 ? (
        <Section title="Similar beans">
          {similar.map((s) => (
            <BeanCard key={s.id} bean={s} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subheading: { ...fonts.label, marginTop: space.sm },
});
