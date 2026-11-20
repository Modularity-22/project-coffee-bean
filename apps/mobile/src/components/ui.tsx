import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { parseNotes, type BeanRow, type CompanyRow, type Note } from '@/db';
import { colors, familyColor, fonts, radius, space } from '@/theme';

/** The app uses one icon set, Material Community Icons. */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export const Icon = MaterialCommunityIcons;

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={[fonts.muted, styles.empty]}>{text}</Text>;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={fonts.label} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function TextLink({ label, href }: { label: string; href: Href }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" hitSlop={8}>
        <Text style={styles.textLink}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function Tappable({ href, children }: { href?: Href; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => pressed && styles.pressed}>
        {children}
      </Pressable>
    </Link>
  );
}

export function Card({
  href,
  title,
  subtitle,
  detail,
  children,
}: {
  href?: Href;
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  children?: ReactNode;
}) {
  return (
    <Tappable href={href}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardBody}>
            <Text style={fonts.heading}>{title}</Text>
            {subtitle ? <Text style={fonts.muted}>{subtitle}</Text> : null}
            {detail ? <Text style={[fonts.body, styles.cardDetail]}>{detail}</Text> : null}
            {children}
          </View>
          {href ? <Icon name="chevron-right" size={20} color={colors.border} /> : null}
        </View>
      </View>
    </Tappable>
  );
}

/** A flavour note with its family colour: the signature, used only where taste is shown. */
export function NoteChip({ note, href }: { note: Note; href?: Href }) {
  return (
    <Tappable href={href}>
      <View style={styles.noteChip}>
        <View style={[styles.dot, { backgroundColor: familyColor(note.family) }]} />
        <Text style={styles.noteText}>{note.name}</Text>
      </View>
    </Tappable>
  );
}

/** Quiet text tag. Tone carries meaning only: ok = verified, warn = unverified. */
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const fg = tone === 'ok' ? colors.ok : tone === 'warn' ? colors.warn : colors.textMuted;
  const bg = tone === 'warn' ? colors.warnBg : tone === 'ok' ? '#E8F1EA' : colors.chip;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function BeanCard({ bean, showRoaster = true }: { bean: BeanRow; showRoaster?: boolean }) {
  const notes = parseNotes(bean.notes);
  const meta = [showRoaster ? bean.company : null, bean.roast, bean.process].filter(Boolean);
  return (
    <Card
      href={{ pathname: '/bean', params: { id: bean.id } }}
      title={bean.name}
      subtitle={meta.join(' · ')}
    >
      {notes.length > 0 ? (
        <View style={[styles.chipRow, styles.cardDetail]}>
          {notes.slice(0, 4).map((n) => (
            <NoteChip key={n.name} note={n} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function cafesLabel(c: Pick<CompanyRow, 'has_cafes' | 'cafe_count_approx'>): string {
  if (c.has_cafes === null) return 'Cafes not known yet';
  if (!c.has_cafes) return 'No cafes';
  if (!c.cafe_count_approx) return 'Runs cafes';
  return c.cafe_count_approx === 1 ? '1 cafe' : `About ${c.cafe_count_approx} cafes`;
}

export function CompanyCard({ company }: { company: CompanyRow }) {
  return (
    <Card
      href={{ pathname: '/company', params: { id: company.id } }}
      title={company.name}
      subtitle={[company.city, company.country].filter(Boolean).join(', ')}
    >
      <View style={[styles.chipRow, styles.cardDetail]}>
        <Badge label={`${company.bean_count} ${company.bean_count === 1 ? 'bean' : 'beans'}`} />
        {company.has_cafes ? <Badge label={cafesLabel(company)} /> : null}
        {company.verified ? null : <Badge label="Unverified" tone="warn" />}
      </View>
    </Card>
  );
}

/** A horizontally scrolling row of single-choice filters. Tapping the active one clears it. */
export function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; color?: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <View style={styles.filterRow} accessibilityLabel={`${label} filter`}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(active ? null : o.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function Fact({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.fact}>
      <Text style={[fonts.muted, styles.factLabel]}>{label}</Text>
      <Text style={[fonts.body, styles.factValue]}>{value}</Text>
    </View>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Icon name="alert-circle-outline" size={18} color={colors.warn} />
      <Text style={[fonts.muted, styles.noticeText]}>{text}</Text>
    </View>
  );
}

/**
 * Primary is the accent fill, for the one main action on a screen. Secondary
 * (the default) is a quiet raised surface with a hairline.
 */
export function Button({
  label,
  icon,
  onPress,
  variant = 'secondary',
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onPrimary : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SearchBox({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="magnify" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable accessibilityLabel="Clear search" hitSlop={12} onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export const listStyles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  header: { gap: space.md },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  empty: { textAlign: 'center', paddingVertical: space.lg },
  section: { gap: space.sm, marginTop: space.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textLink: { color: colors.primary, fontWeight: '500', fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardBody: { flex: 1, gap: space.xs },
  cardDetail: { marginTop: space.xs },
  pressed: { opacity: 0.7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  noteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  noteText: { color: colors.text, fontSize: 13, fontWeight: '400' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: {
    borderRadius: radius.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  filterRow: { gap: space.sm },
  filterLabel: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  filterScroll: { gap: space.sm, paddingRight: space.lg },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 36,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.text, fontSize: 14, fontWeight: '400' },
  filterTextActive: { color: colors.onPrimary, fontWeight: '500' },
  fact: { flexDirection: 'row', gap: space.md, paddingVertical: space.xs },
  factLabel: { width: 96 },
  factValue: { flex: 1 },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.warnBg,
    borderRadius: radius.md,
    padding: space.md,
  },
  noticeText: { flex: 1, color: colors.warn },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonText: { fontWeight: '500', fontSize: 15 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: space.sm },
});
