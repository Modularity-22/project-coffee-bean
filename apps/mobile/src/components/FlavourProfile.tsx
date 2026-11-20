import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Icon } from '@/components/ui';
import { ATTRIBUTES, FAMILIES, SCALE, colors, fonts, radius, space } from '@/theme';

/**
 * One flavour profile, drawn the same way for every coffee and every drink:
 *
 * 1. Flavour families: the nine categories of the coffee taster's flavour
 *    wheel, always in the same place. Each axis shows how many of the
 *    roaster's tasting notes fall in that family (1, 2, 3 or more). Nothing is
 *    estimated: it is counted from the notes.
 * 2. Attributes: sweetness, acidity, body and bitterness, always in this
 *    order, on the 1-4 scale, only as published by the roaster.
 * 3. How to have it (beans only): roast, black or with milk, brew methods.
 */
export interface ProfileData {
  /** Flavour-wheel terms with their family, in the roaster's order. */
  notes: { id: string; name: string; family: string }[];
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  bitterness: number | null;
}

export interface Serving {
  roast: string | null;
  /** 1 (light) to 5 (dark); null when not a darkness level (omni) or unknown. */
  roastLevel: number | null;
  serve: 'black' | 'milk' | 'either' | null;
  brewMethods: string[];
}

const SERVE_LABEL = { black: 'Black', milk: 'With milk', either: 'Black or with milk' } as const;

// Radar geometry, in viewBox units. Wider than tall so side labels fit.
const VIEW_W = 460;
const VIEW_H = 330;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const R = 104;
const RINGS = 3; // 1 note, 2 notes, 3 or more
const ring = (v: number) => (Math.min(v, RINGS) / RINGS) * R;
// SVG text on the web falls back to a serif font; native already uses the system font.
const FONT = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: undefined,
});

const point = (angle: number, r: number) => ({
  x: CX + r * Math.cos(angle),
  y: CY + r * Math.sin(angle),
});
const angleOf = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / FAMILIES.length;

function FamilyRadar({ counts, width }: { counts: Record<string, number>; width: number }) {
  const height = (width * VIEW_H) / VIEW_W;
  const shape = FAMILIES.map((f, i) => {
    const p = point(angleOf(i), ring(counts[f.id] ?? 0));
    return `${p.x},${p.y}`;
  }).join(' ');
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {[1, 2, 3].map((v) => (
        <Circle
          key={v}
          cx={CX}
          cy={CY}
          r={ring(v)}
          stroke={colors.ring}
          strokeWidth={1.5}
          fill="none"
        />
      ))}
      {FAMILIES.map((f, i) => {
        const end = point(angleOf(i), R);
        return (
          <Line
            key={f.id}
            x1={CX}
            y1={CY}
            x2={end.x}
            y2={end.y}
            stroke={colors.ring}
            strokeWidth={1.5}
          />
        );
      })}
      <Polygon
        points={shape}
        fill={colors.attribute}
        fillOpacity={0.18}
        stroke={colors.attribute}
        strokeWidth={2}
      />
      {FAMILIES.map((f, i) => {
        const n = counts[f.id] ?? 0;
        if (n === 0) return null;
        const p = point(angleOf(i), ring(n));
        return (
          <Circle
            key={f.id}
            cx={p.x}
            cy={p.y}
            r={8}
            fill={f.color}
            stroke={colors.surface}
            strokeWidth={2}
          />
        );
      })}
      {FAMILIES.map((f, i) => {
        const angle = angleOf(i);
        const lab = point(angle, R + 18);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
        const n = counts[f.id] ?? 0;
        return (
          <G key={f.id}>
            {f.short.split(' / ').map((line, j, lines) => (
              <SvgText
                key={line}
                x={lab.x}
                y={
                  lab.y +
                  5 +
                  (sin > 0.6 ? 8 : sin < -0.6 ? -4 : 0) +
                  (j - (lines.length - 1) / 2) * 17
                }
                fontSize={15}
                fontWeight={n > 0 ? '600' : '400'}
                fontFamily={FONT}
                fill={n > 0 ? colors.text : colors.textMuted}
                textAnchor={anchor}
              >
                {lines.length > 1 && j === 0 ? `${line} /` : line}
              </SvgText>
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

function AttributeMeter({ name, value }: { name: string; value: number | null }) {
  return (
    <View
      style={styles.meterRow}
      accessibilityLabel={`${name}: ${value ? SCALE[value - 1] : 'not published'}`}
    >
      <Text style={styles.meterName}>{name}</Text>
      <View style={styles.meterBar}>
        {[1, 2, 3, 4].map((v) => (
          <View
            key={v}
            style={[
              styles.segment,
              value === null
                ? styles.segmentMissing
                : v <= value
                  ? styles.segmentOn
                  : styles.segmentOff,
            ]}
          />
        ))}
      </View>
      <Text style={[styles.meterValue, value === null && styles.missing]}>
        {value ? SCALE[value - 1] : 'Not published'}
      </Text>
    </View>
  );
}

/** Roast level as a ring of five segments, filled up to the level. */
export function RoastGauge({ level, size = 34 }: { level: number; size?: number }) {
  const segments = 5;
  const r = 14;
  const c = 18;
  const gap = 0.22;
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      {Array.from({ length: segments }, (_, i) => {
        const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / segments + gap / 2;
        const a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / segments - gap / 2;
        const p0 = { x: c + r * Math.cos(a0), y: c + r * Math.sin(a0) };
        const p1 = { x: c + r * Math.cos(a1), y: c + r * Math.sin(a1) };
        return (
          <Path
            key={i}
            d={`M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`}
            stroke={i < level ? colors.primary : colors.border}
            strokeWidth={4}
            fill="none"
          />
        );
      })}
    </Svg>
  );
}

function ServingRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string | null;
  children?: ReactNode;
}) {
  return (
    <View style={styles.servingRow}>
      <View style={styles.servingText}>
        <Text style={styles.heading}>{label}</Text>
        <Text style={[styles.servingValue, value === null && styles.missing]}>
          {value ?? 'Not stated by the roaster'}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function FlavourProfile({ data, serving }: { data: ProfileData; serving?: Serving }) {
  const [width, setWidth] = useState(0);
  const counts: Record<string, number> = {};
  for (const n of data.notes) counts[n.family] = (counts[n.family] ?? 0) + 1;
  const chartWidth = Math.min(width, 480);
  const families = FAMILIES.filter((f) => counts[f.id]);
  const summary = families.length
    ? `Tasting notes fall in: ${families.map((f) => `${f.name} (${counts[f.id]})`).join(', ')}.`
    : 'No tasting notes listed.';

  return (
    <View
      style={styles.card}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - space.lg * 2)}
    >
      <Text style={styles.heading}>Flavour families</Text>
      {chartWidth > 0 ? (
        <View
          style={styles.chart}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Flavour families chart. ${summary}`}
        >
          <FamilyRadar counts={counts} width={chartWidth} />
        </View>
      ) : null}
      <Text style={styles.caption}>
        {data.notes.length
          ? 'Each axis is a family of the coffee taster’s flavour wheel. The rings count how many of the roaster’s tasting notes fall in it: 1, 2, or 3 and more.'
          : 'The roaster lists no tasting notes, so no family is marked'}
      </Text>

      <View style={styles.divider} />
      <Text style={styles.heading}>Attributes</Text>
      {ATTRIBUTES.map((a) => (
        <AttributeMeter key={a.id} name={a.name} value={data[a.id]} />
      ))}
      <Text style={styles.caption}>
        Low · Medium · Medium-high · High, as published by the roaster
      </Text>

      {serving ? (
        <>
          <View style={styles.divider} />
          <ServingRow label="Roast" value={serving.roast}>
            {serving.roastLevel ? <RoastGauge level={serving.roastLevel} /> : null}
          </ServingRow>
          <ServingRow label="Have it" value={serving.serve ? SERVE_LABEL[serving.serve] : null}>
            {serving.serve ? (
              <Icon
                name={serving.serve === 'black' ? 'coffee' : 'coffee-outline'}
                size={28}
                color={colors.primary}
              />
            ) : null}
          </ServingRow>
          <ServingRow
            label="Brew with"
            value={serving.brewMethods.length ? serving.brewMethods.join(', ') : null}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  heading: { ...fonts.label },
  chart: { alignItems: 'center' },
  caption: { ...fonts.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 },
  meterName: { width: 88, fontSize: 14, fontWeight: '500', color: colors.text },
  meterBar: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  segmentOn: { backgroundColor: colors.attribute },
  segmentOff: { backgroundColor: colors.ring },
  segmentMissing: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
  meterValue: {
    width: 92,
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'right',
  },
  missing: { color: colors.textMuted, fontWeight: '400' },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  servingText: { flex: 1, gap: space.xs },
  servingValue: { fontSize: 16, fontWeight: '500', color: colors.text },
});
