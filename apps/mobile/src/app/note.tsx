import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { BeanCard, Empty, Loading, Screen, Section, TextLink } from '@/components/ui';
import { BEAN_LIST_SQL, useQuery, type BeanRow } from '@/db';
import { fonts } from '@/theme';

/** One flavour-wheel term. A broad term (Berry) also lists beans with its narrower terms. */
export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useQuery<{
    name: string;
    family_id: string;
    family: string;
    parent: string | null;
    parent_id: string | null;
  }>(
    `SELECT n.name, f.id AS family_id, f.name AS family, p.name AS parent, p.id AS parent_id
       FROM flavor_note n
       JOIN flavor_note f ON f.id = n.family_id
       LEFT JOIN flavor_note p ON p.id = n.parent_id AND p.tier > 1
      WHERE n.id = ?`,
    [id],
  );
  const beans = useQuery<BeanRow>(
    `${BEAN_LIST_SQL}
      WHERE b.id IN (SELECT bfn.bean_id FROM bean_flavor_note bfn
                       JOIN flavor_note n ON n.id = bfn.flavor_note_id
                      WHERE n.id = ? OR n.parent_id = ? OR n.family_id = ?)
      ORDER BY b.name`,
    [id, id, id],
  );

  if (!note || !beans) return <Loading />;
  const n = note[0];
  if (!n) return <Empty text="Flavour not found" />;

  return (
    <Screen>
      <Text style={fonts.display}>{n.name}</Text>
      {n.parent && n.parent_id ? (
        <TextLink
          label={`Part of ${n.parent}`}
          href={{ pathname: '/note', params: { id: n.parent_id } }}
        />
      ) : null}
      <TextLink
        label={`${n.family} category`}
        href={{ pathname: '/flavour', params: { id: n.family_id } }}
      />
      <Section title={`Beans with this note (${beans.length})`}>
        {beans.length === 0 ? <Empty text="No beans with this note yet" /> : null}
        {beans.map((b) => (
          <BeanCard key={b.id} bean={b} />
        ))}
      </Section>
    </Screen>
  );
}
