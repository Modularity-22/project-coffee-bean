import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { BeanCard, Empty, FilterRow, Loading, SearchBox, listStyles } from '@/components/ui';
import { BEAN_LIST_SQL, useQuery, where, type BeanRow } from '@/db';
import { familyColor, fonts } from '@/theme';

interface Option {
  id: string;
  name: string;
}

export default function BeansScreen() {
  const params = useLocalSearchParams<{ origin?: string; family?: string }>();
  const [search, setSearch] = useState('');
  const [roast, setRoast] = useState<string | null>(null);
  const [family, setFamily] = useState<string | null>(params.family ?? null);
  const [origin, setOrigin] = useState<string | null>(params.origin ?? null);

  // Arriving from Discover with a filter chosen.
  const [linked, setLinked] = useState({ origin: params.origin, family: params.family });
  if (linked.origin !== params.origin || linked.family !== params.family) {
    setLinked({ origin: params.origin, family: params.family });
    if (params.origin) setOrigin(params.origin);
    if (params.family) setFamily(params.family);
  }

  const roasts = useQuery<Option>(
    `SELECT id, name FROM roast_level r
      WHERE EXISTS (SELECT 1 FROM bean b WHERE b.roast_level_id = r.id) ORDER BY sort_order`,
  );
  const families = useQuery<Option>(
    `SELECT g.id, g.name FROM flavor_note g
      WHERE g.tier = 1 AND EXISTS (
        SELECT 1 FROM flavor_note n JOIN bean_flavor_note bfn ON bfn.flavor_note_id = n.id
         WHERE n.family_id = g.id)
      ORDER BY g.name`,
  );
  const origins = useQuery<Option>(
    `SELECT co.code AS id, co.name FROM bean_origin bo
       JOIN origin o ON o.id = bo.origin_id JOIN country co ON co.code = o.country_code
      GROUP BY co.code, co.name ORDER BY count(DISTINCT bo.bean_id) DESC, co.name`,
  );

  const like = `%${search.trim()}%`;
  const filter = where([
    ['b.name LIKE ? OR c.name LIKE ? OR b.roaster_notes LIKE ?', [like, like, like]],
    roast && ['b.roast_level_id = ?', [roast]],
    family && [
      `b.id IN (SELECT bfn.bean_id FROM bean_flavor_note bfn
                  JOIN flavor_note n ON n.id = bfn.flavor_note_id WHERE n.family_id = ?)`,
      [family],
    ],
    origin && [
      `b.id IN (SELECT bo.bean_id FROM bean_origin bo
                  JOIN origin o ON o.id = bo.origin_id WHERE o.country_code = ?)`,
      [origin],
    ],
  ]);
  const rows = useQuery<BeanRow>(`${BEAN_LIST_SQL} ${filter.sql} ORDER BY b.name`, filter.params);

  return (
    <FlatList
      style={listStyles.list}
      contentContainerStyle={listStyles.content}
      keyboardShouldPersistTaps="handled"
      data={rows ?? []}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => <BeanCard bean={item} />}
      initialNumToRender={12}
      ListHeaderComponent={
        <View style={listStyles.header}>
          <SearchBox
            value={search}
            onChangeText={setSearch}
            placeholder="Search beans, roasters, tasting notes"
          />
          <FilterRow
            label="Flavour"
            value={family}
            onChange={setFamily}
            options={(families ?? []).map((f) => ({
              value: f.id,
              label: f.name,
              color: familyColor(f.id),
            }))}
          />
          <FilterRow
            label="Roast"
            value={roast}
            onChange={setRoast}
            options={(roasts ?? []).map((r) => ({ value: r.id, label: r.name }))}
          />
          <FilterRow
            label="Grown in"
            value={origin}
            onChange={setOrigin}
            options={(origins ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
          {rows ? (
            <Text style={fonts.muted}>
              {rows.length} {rows.length === 1 ? 'bean' : 'beans'}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        rows === null ? <Loading /> : <Empty text="No beans match. Try clearing a filter." />
      }
    />
  );
}
