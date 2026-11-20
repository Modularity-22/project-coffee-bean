import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { FlavourProfile } from '@/components/FlavourProfile';
import { Badge, Card, ChipRow, Empty, Loading, NoteChip, Screen, Section } from '@/components/ui';
import { useQuery } from '@/db';
import { fonts } from '@/theme';

interface DrinkDetail {
  name: string;
  notes: string | null;
  company_id: string;
  company: string;
  drink: string;
  drink_description: string | null;
  cafe: string | null;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  bitterness: number | null;
}

export default function DrinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useQuery<DrinkDetail>(
    `SELECT m.name, m.notes, m.company_id, c.name AS company,
            d.name AS drink, d.description AS drink_description, f.name AS cafe,
            m.sweetness, m.acidity, m.body, m.bitterness
       FROM menu_item m
       JOIN company c ON c.id = m.company_id
       JOIN drink_type d ON d.id = m.drink_type_id
       LEFT JOIN cafe f ON f.id = m.cafe_id
      WHERE m.id = ?`,
    [id],
  );
  const beans = useQuery<{ id: string; name: string }>(
    `SELECT b.id, b.name FROM menu_item_bean mb JOIN bean b ON b.id = mb.bean_id
      WHERE mb.menu_item_id = ? ORDER BY b.name`,
    [id],
  );

  const notes = useQuery<{ id: string; name: string; family: string }>(
    `SELECT n.id, n.name, n.family_id AS family FROM menu_item_flavor_note mf
       JOIN flavor_note n ON n.id = mf.flavor_note_id
      WHERE mf.menu_item_id = ? ORDER BY mf.position`,
    [id],
  );

  if (!item || !beans || !notes) return <Loading />;
  const d = item[0];
  if (!d) return <Empty text="Drink not found" />;

  return (
    <Screen>
      <Text style={fonts.display}>{d.name}</Text>
      <ChipRow>
        <Badge label={d.drink} />
        <Badge label={d.cafe ?? 'At the company’s cafes'} />
      </ChipRow>
      {d.drink_description ? <Text style={fonts.muted}>{d.drink_description}</Text> : null}
      {d.notes ? <Text style={fonts.body}>{d.notes}</Text> : null}
      <Card
        href={{ pathname: '/company', params: { id: d.company_id } }}
        title={d.company}
        subtitle="Served by"
      />

      <Section title="Flavour profile">
        <FlavourProfile
          data={{
            notes,
            sweetness: d.sweetness,
            acidity: d.acidity,
            body: d.body,
            bitterness: d.bitterness,
          }}
        />
        {notes.length > 0 ? (
          <ChipRow>
            {notes.map((n) => (
              <NoteChip key={n.id} note={n} href={{ pathname: '/note', params: { id: n.id } }} />
            ))}
          </ChipRow>
        ) : null}
      </Section>

      <Section title="Beans used">
        {beans.length === 0 ? (
          <Empty text="This company does not publish which bean goes into the drink. If you know, you can add it: see the project’s contributing guide." />
        ) : null}
        {beans.map((b) => (
          <Card key={b.id} href={{ pathname: '/bean', params: { id: b.id } }} title={b.name} />
        ))}
      </Section>
    </Screen>
  );
}
