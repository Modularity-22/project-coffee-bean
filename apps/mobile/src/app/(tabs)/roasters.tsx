import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { CompanyCard, Empty, FilterRow, Loading, SearchBox, listStyles } from '@/components/ui';
import { COMPANY_LIST_SQL, useQuery, where, type CompanyRow } from '@/db';
import { fonts } from '@/theme';

type Kind = 'cafes' | 'verified';

export default function RoastersScreen() {
  const params = useLocalSearchParams<{ country?: string }>();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string | null>(params.country ?? null);
  const [kind, setKind] = useState<Kind | null>(null);

  // Arriving from Discover with a country chosen.
  const [linked, setLinked] = useState(params.country);
  if (linked !== params.country) {
    setLinked(params.country);
    if (params.country) setCountry(params.country);
  }

  const countries = useQuery<{ code: string; name: string }>(
    `SELECT co.code, co.name FROM company c JOIN country co ON co.code = c.country_code
      GROUP BY co.code, co.name ORDER BY count(*) DESC, co.name`,
  );
  const like = `%${search.trim()}%`;
  const filter = where([
    ['c.name LIKE ? OR c.city LIKE ? OR co.name LIKE ?', [like, like, like]],
    country && ['c.country_code = ?', [country]],
    kind === 'cafes' && ['c.has_cafes = 1', []],
    kind === 'verified' && ['c.verified = 1', []],
  ]);
  const rows = useQuery<CompanyRow>(
    `${COMPANY_LIST_SQL} ${filter.sql} ORDER BY c.name`,
    filter.params,
  );

  return (
    <FlatList
      style={listStyles.list}
      contentContainerStyle={listStyles.content}
      keyboardShouldPersistTaps="handled"
      data={rows ?? []}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <CompanyCard company={item} />}
      ListHeaderComponent={
        <View style={listStyles.header}>
          <SearchBox
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, city or country"
          />
          <FilterRow
            label="Country"
            value={country}
            onChange={setCountry}
            options={(countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          />
          <FilterRow<Kind>
            label="Show only"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'cafes', label: 'Runs cafes' },
              { value: 'verified', label: 'Verified' },
            ]}
          />
          {rows ? (
            <Text style={fonts.muted}>
              {rows.length} {rows.length === 1 ? 'roaster' : 'roasters'}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        rows === null ? <Loading /> : <Empty text="No roasters match. Try clearing a filter." />
      }
    />
  );
}
