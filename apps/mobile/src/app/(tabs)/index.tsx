import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mark } from '@/components/Brand';
import {
  BeanCard,
  ChipRow,
  CompanyCard,
  Empty,
  Loading,
  NoteChip,
  Screen,
  SearchBox,
  Section,
  TextLink,
  Icon,
} from '@/components/ui';
import {
  BEAN_LIST_SQL,
  COMPANY_LIST_SQL,
  parseNotes,
  useQuery,
  type BeanRow,
  type CompanyRow,
  type Note,
} from '@/db';
import { FAMILIES, colors, fonts, radius, space } from '@/theme';

interface Count {
  id: string;
  name: string;
  n: number;
}

function SearchResults({ query }: { query: string }) {
  const like = `%${query}%`;
  const roasters = useQuery<CompanyRow>(
    `${COMPANY_LIST_SQL} WHERE c.name LIKE ? OR c.city LIKE ? ORDER BY c.name LIMIT 5`,
    [like, like],
  );
  const beans = useQuery<BeanRow>(
    `${BEAN_LIST_SQL} WHERE b.name LIKE ? OR b.roaster_notes LIKE ? ORDER BY b.name LIMIT 8`,
    [like, like],
  );
  const notes = useQuery<{ id: string; name: string; family: string }>(
    `SELECT id, name, family_id AS family FROM flavor_note
      WHERE tier > 1 AND name LIKE ? ORDER BY tier, name LIMIT 8`,
    [like],
  );
  if (!roasters || !beans || !notes) return <Loading />;
  if (roasters.length + beans.length + notes.length === 0) {
    return <Empty text={`Nothing matches “${query}”. Try a roaster, a bean or a flavour.`} />;
  }
  return (
    <>
      {notes.length > 0 ? (
        <Section title="Flavours">
          <ChipRow>
            {notes.map((n) => (
              <NoteChip key={n.id} note={n} href={{ pathname: '/note', params: { id: n.id } }} />
            ))}
          </ChipRow>
        </Section>
      ) : null}
      {roasters.length > 0 ? (
        <Section title="Roasters">
          {roasters.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </Section>
      ) : null}
      {beans.length > 0 ? (
        <Section title="Beans">
          {beans.map((b) => (
            <BeanCard key={b.id} bean={b} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

/** A thin bar split by flavour family, in wheel order: a bean's profile at a glance. */
function FamilyBar({ notes }: { notes: Note[] }) {
  const counts = new Map<string, number>();
  for (const n of notes) counts.set(n.family, (counts.get(n.family) ?? 0) + 1);
  return (
    <View style={styles.familyBar}>
      {FAMILIES.filter((f) => counts.get(f.id)).map((f) => (
        <View key={f.id} style={{ flex: counts.get(f.id), backgroundColor: f.color }} />
      ))}
    </View>
  );
}

function BeanOfTheDay() {
  const candidates = useQuery<{ id: string }>(
    `SELECT b.id FROM bean b
      WHERE (SELECT count(*) FROM bean_flavor_note f WHERE f.bean_id = b.id) >= 3
      ORDER BY b.id`,
  );
  const [day] = useState(() => Math.floor(Date.now() / 86_400_000));
  const pick = candidates?.length ? candidates[day % candidates.length]!.id : null;
  const bean = useQuery<BeanRow>(`${BEAN_LIST_SQL} WHERE b.id = ?`, [pick ?? '']);
  const b = bean?.[0];
  if (!b) return null;
  const notes = parseNotes(b.notes);
  return (
    <Link href={{ pathname: '/bean', params: { id: b.id } }} asChild>
      <Pressable accessibilityRole="link">
        <View style={styles.feature}>
          <Text style={styles.featureLabel}>Bean of the day</Text>
          <Text style={styles.featureTitle} numberOfLines={3}>
            {b.name}
          </Text>
          <Text style={styles.featureMeta}>
            {[b.company, b.roast, b.process].filter(Boolean).join(' · ')}
          </Text>
          <FamilyBar notes={notes} />
          <ChipRow>
            {notes.slice(0, 4).map((n) => (
              <NoteChip key={n.name} note={n} />
            ))}
          </ChipRow>
          <View style={styles.featureFoot}>
            <Text style={styles.featureLink}>See its flavour profile</Text>
            <Icon name="arrow-right" size={18} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function Browse() {
  const stats = useQuery<{ companies: number; beans: number; countries: number }>(
    `SELECT (SELECT count(*) FROM company) AS companies, (SELECT count(*) FROM bean) AS beans,
            (SELECT count(DISTINCT country_code) FROM company) AS countries`,
  );
  const families = useQuery<{ id: string; n: number }>(
    `SELECT n.family_id AS id, count(DISTINCT bfn.bean_id) AS n FROM bean_flavor_note bfn
       JOIN flavor_note n ON n.id = bfn.flavor_note_id GROUP BY n.family_id`,
  );
  const countries = useQuery<Count>(
    `SELECT co.code AS id, co.name, count(*) AS n FROM company c
       JOIN country co ON co.code = c.country_code GROUP BY co.code, co.name ORDER BY n DESC, co.name`,
  );
  const origins = useQuery<Count>(
    `SELECT co.code AS id, co.name, count(DISTINCT bo.bean_id) AS n FROM bean_origin bo
       JOIN origin o ON o.id = bo.origin_id JOIN country co ON co.code = o.country_code
      GROUP BY co.code, co.name ORDER BY n DESC, co.name LIMIT 12`,
  );
  if (!stats || !families || !countries || !origins) return <Loading />;
  const s = stats[0];
  const familyCount = new Map(families.map((f) => [f.id, f.n]));

  return (
    <>
      <BeanOfTheDay />

      <Link href="/taste" asChild>
        <Pressable accessibilityRole="link">
          <View style={styles.promo}>
            <Icon name="coffee" size={28} color={colors.onPrimary} />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Learn to taste coffee</Text>
              <Text style={styles.promoBody}>Six steps to notice what is in your cup</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.onPrimary} />
          </View>
        </Pressable>
      </Link>

      <Section title="Explore by flavour">
        <View style={styles.grid}>
          {FAMILIES.map((f) => {
            const n = familyCount.get(f.id) ?? 0;
            return (
              <Link key={f.id} href={{ pathname: '/flavour', params: { id: f.id } }} asChild>
                <Pressable accessibilityRole="link" style={styles.tileWrap} disabled={n === 0}>
                  <View style={[styles.tile, n === 0 && styles.tileEmpty]}>
                    <View style={[styles.tileDot, { backgroundColor: f.color }]} />
                    <Text style={styles.tileName} numberOfLines={2}>
                      {f.short}
                    </Text>
                    <Text style={styles.tileCount}>
                      {n === 0 ? 'none yet' : `${n} ${n === 1 ? 'bean' : 'beans'}`}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </Section>

      <Section title="Roasters by country" action={<TextLink label="See all" href="/roasters" />}>
        <ChipRow>
          {countries.map((c) => (
            <Link key={c.id} href={{ pathname: '/roasters', params: { country: c.id } }} asChild>
              <Pressable accessibilityRole="link">
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{c.name}</Text>
                  <Text style={styles.pillCount}>{c.n}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </ChipRow>
      </Section>

      <Section title="Beans by origin" action={<TextLink label="See all" href="/beans" />}>
        <ChipRow>
          {origins.map((c) => (
            <Link key={c.id} href={{ pathname: '/beans', params: { origin: c.id } }} asChild>
              <Pressable accessibilityRole="link">
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{c.name}</Text>
                  <Text style={styles.pillCount}>{c.n}</Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </ChipRow>
      </Section>

      {s ? (
        <View style={styles.footer}>
          <Mark size={40} />
          <Text style={styles.footerStats}>
            {s.companies} roasters · {s.beans} beans · {s.countries} countries
          </Text>
          <Text style={[fonts.muted, styles.footerNote]}>
            An open database, built by coffee people. Anyone can add a roaster.
          </Text>
        </View>
      ) : null}
    </>
  );
}

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const query = search.trim();
  return (
    <View style={styles.safe}>
      <Screen>
        <SearchBox
          value={search}
          onChangeText={setSearch}
          placeholder="Search roasters, beans, flavours"
        />
        {query.length >= 2 ? <SearchResults query={query} /> : <Browse />}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  feature: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.sm,
  },
  featureLabel: { ...fonts.label },
  featureTitle: { fontSize: 22, lineHeight: 28, fontWeight: '500', color: colors.text },
  featureMeta: { ...fonts.muted },
  featureFoot: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  featureLink: { color: colors.primary, fontWeight: '500', fontSize: 14 },
  familyBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.ring,
    marginVertical: space.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.sm,
  },
  tileWrap: { width: '31.5%' },
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 92,
    gap: space.xs,
  },
  tileEmpty: { opacity: 0.55 },
  tileDot: { width: 12, height: 12, borderRadius: 6 },
  tileName: { fontSize: 14, fontWeight: '500', color: colors.text },
  tileCount: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  promoText: { flex: 1, gap: space.xs },
  promoTitle: { ...fonts.heading, fontSize: 17, color: colors.onPrimary },
  promoBody: { ...fonts.muted, color: colors.onPrimary, opacity: 0.85 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 36,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  pillText: { color: colors.text, fontSize: 14, fontWeight: '400' },
  pillCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerStats: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  footerNote: { textAlign: 'center' },
});
