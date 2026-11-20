import { useLocalSearchParams } from 'expo-router';
import { Linking, Text } from 'react-native';
import {
  Badge,
  BeanCard,
  Button,
  Card,
  ChipRow,
  Empty,
  Loading,
  Notice,
  Screen,
  Section,
  cafesLabel,
} from '@/components/ui';
import { BEAN_LIST_SQL, COMPANY_LIST_SQL, useQuery, type BeanRow, type CompanyRow } from '@/db';
import { fonts } from '@/theme';

interface CafeRow {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
}

interface MenuRow {
  id: string;
  name: string;
  drink: string;
  beans_known: number;
}

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const company = useQuery<CompanyRow>(`${COMPANY_LIST_SQL} WHERE c.id = ?`, [id]);
  const beans = useQuery<BeanRow>(`${BEAN_LIST_SQL} WHERE b.company_id = ? ORDER BY b.name`, [id]);
  const cafes = useQuery<CafeRow>(
    `SELECT f.id, f.name, f.city, co.name AS country, f.address
       FROM cafe f JOIN country co ON co.code = f.country_code
      WHERE f.company_id = ? ORDER BY co.name, f.city, f.name`,
    [id],
  );
  const menu = useQuery<MenuRow>(
    `SELECT m.id, m.name, d.name AS drink, m.beans_known
       FROM menu_item m JOIN drink_type d ON d.id = m.drink_type_id
      WHERE m.company_id = ? ORDER BY m.name`,
    [id],
  );

  if (!company || !beans || !cafes || !menu) return <Loading />;
  const c = company[0];
  if (!c) return <Empty text="Roaster not found" />;
  const place = [c.city, c.country].filter(Boolean).join(', ');

  return (
    <Screen>
      <Text style={fonts.display}>{c.name}</Text>
      <ChipRow>
        <Badge label={place} />
        {c.founded_year ? <Badge label={`Since ${c.founded_year}`} /> : null}
        <Badge label={cafesLabel(c)} />
        {c.verified ? <Badge label="Verified" tone="ok" /> : null}
      </ChipRow>
      {c.verified ? null : (
        <Notice text="Collected automatically from this roaster’s online shop and not yet checked by a person. Details may be incomplete." />
      )}
      {c.description ? <Text style={fonts.body}>{c.description}</Text> : null}
      <Button label="Visit website" icon="open-in-new" onPress={() => Linking.openURL(c.website)} />

      <Section title={`Beans (${beans.length})`}>
        {beans.map((b) => (
          <BeanCard key={b.id} bean={b} showRoaster={false} />
        ))}
      </Section>

      {c.has_cafes ? (
        <Section title="Cafes">
          {cafes.length === 0 ? <Empty text="Individual cafes have not been recorded yet" /> : null}
          {cafes.map((f) => (
            <Card
              key={f.id}
              title={f.name}
              subtitle={`${f.city}, ${f.country}`}
              detail={f.address}
            />
          ))}
          {c.cafe_count_approx && cafes.length > 0 && c.cafe_count_approx > cafes.length ? (
            <Text style={fonts.muted}>
              Showing {cafes.length} of about {c.cafe_count_approx}
            </Text>
          ) : null}
        </Section>
      ) : null}

      {menu.length > 0 ? (
        <Section title="Drinks">
          {menu.map((m) => (
            <Card
              key={m.id}
              href={{ pathname: '/drink', params: { id: m.id } }}
              title={m.name}
              subtitle={m.beans_known ? m.drink : `${m.drink} · bean not published`}
            />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
