import type { Dataset, SensoryProfile } from '../../../packages/schema/types.ts';
import { flattenWheel } from './flavour.ts';
import { countryName } from './validate.ts';

export type Value = string | number | boolean | null;
export type Row = Record<string, Value>;

/** Tables in an order that satisfies every foreign key. */
export const TABLE_ORDER = [
  'country',
  'roast_level',
  'process',
  'variety',
  'flavor_note',
  'drink_type',
  'company',
  'source',
  'bean',
  'origin',
  'bean_origin',
  'bean_variety',
  'bean_flavor_note',
  'bean_brew_method',
  'cafe',
  'menu_item',
  'menu_item_bean',
  'menu_item_flavor_note',
] as const;

export type TableName = (typeof TABLE_ORDER)[number];
export type Tables = Record<TableName, Row[]>;

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const orNull = <T extends Value>(v: T | undefined): T | null => v ?? null;

const attributes = (p: SensoryProfile | undefined) => ({
  sweetness: orNull(p?.sweetness),
  acidity: orNull(p?.acidity),
  body: orNull(p?.body),
  bitterness: orNull(p?.bitterness),
});

/** Turns the YAML dataset into relational rows. Output is deterministic. */
export function buildTables(dataset: Dataset): Tables {
  const t = Object.fromEntries(TABLE_ORDER.map((name) => [name, [] as Row[]])) as Tables;
  const { taxonomy } = dataset;

  const countries = new Set<string>();
  const origins = new Map<string, Row>();

  t.roast_level = taxonomy.roastLevels.map((r) => ({ ...r }));
  t.process = taxonomy.processes.map((p) => ({
    id: p.id,
    name: p.name,
    description: orNull(p.description),
  }));
  t.variety = taxonomy.varieties.map((v) => ({ ...v }));
  t.drink_type = taxonomy.drinkTypes.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    description: orNull(d.description),
  }));
  // Parents before children, so the foreign keys hold while inserting.
  t.flavor_note = flattenWheel(taxonomy.flavorWheel)
    .sort((a, b) => a.tier - b.tier)
    .map((n) => ({ ...n }));

  for (const { data: c } of dataset.companies) {
    countries.add(c.country);
    t.company.push({
      id: c.id,
      name: c.name,
      country_code: c.country,
      city: orNull(c.city),
      founded_year: orNull(c.founded),
      website: c.website,
      description: orNull(c.description),
      has_cafes: orNull(c.has_cafes),
      cafe_count_approx: orNull(c.cafe_count_approx),
      status: c.status ?? 'active',
      verified: c.verified ?? false,
    });

    c.sources.forEach((s, i) => {
      t.source.push({
        id: `${c.id}/${i + 1}`,
        company_id: c.id,
        url: s.url,
        retrieved_on: s.retrieved,
        note: orNull(s.note),
      });
    });

    for (const b of c.beans) {
      const beanId = `${c.id}/${b.id}`;
      t.bean.push({
        id: beanId,
        company_id: c.id,
        name: b.name,
        roast_level_id: orNull(b.roast_level),
        process_id: orNull(b.process),
        is_blend: b.blend ?? false,
        is_decaf: b.decaf ?? false,
        sold_whole_bean: b.forms.includes('whole_bean'),
        sold_ground: b.forms.includes('ground'),
        altitude_min_m: orNull(b.altitude_m?.min),
        altitude_max_m: orNull(b.altitude_m?.max),
        roaster_notes: orNull(b.roaster_notes),
        ...attributes(b.profile),
        serve: orNull(b.serve),
        url: b.url,
        availability: b.availability ?? 'current',
        retrieved_on: b.retrieved,
      });

      const seenOrigins = new Set<string>();
      for (const o of b.origins ?? []) {
        countries.add(o.country);
        const originId = slugify([o.country, o.region, o.producer].filter(Boolean).join(' '));
        if (!origins.has(originId)) {
          origins.set(originId, {
            id: originId,
            country_code: o.country,
            region: orNull(o.region),
            producer: orNull(o.producer),
          });
        }
        if (seenOrigins.has(originId)) continue;
        seenOrigins.add(originId);
        t.bean_origin.push({ bean_id: beanId, origin_id: originId, percent: orNull(o.percent) });
      }
      for (const v of b.varieties ?? []) {
        t.bean_variety.push({ bean_id: beanId, variety_id: v });
      }
      (b.flavor_notes ?? []).forEach((n, i) => {
        t.bean_flavor_note.push({ bean_id: beanId, flavor_note_id: n, position: i + 1 });
      });
      for (const m of b.brew_methods ?? []) {
        t.bean_brew_method.push({ bean_id: beanId, drink_type_id: m });
      }
    }

    for (const cafe of c.cafes ?? []) {
      countries.add(cafe.country);
      t.cafe.push({
        id: `${c.id}/${cafe.id}`,
        company_id: c.id,
        name: cafe.name,
        city: cafe.city,
        country_code: cafe.country,
        address: orNull(cafe.address),
        latitude: orNull(cafe.latitude),
        longitude: orNull(cafe.longitude),
        url: orNull(cafe.url),
      });
    }

    for (const m of c.menu ?? []) {
      const itemId = `${c.id}/${m.id}`;
      t.menu_item.push({
        id: itemId,
        company_id: c.id,
        cafe_id: m.cafe ? `${c.id}/${m.cafe}` : null,
        drink_type_id: m.drink,
        name: m.name,
        notes: orNull(m.notes),
        ...attributes(m.profile),
        beans_known: (m.beans?.length ?? 0) > 0,
        source_url: m.source,
        retrieved_on: m.retrieved,
      });
      for (const b of m.beans ?? []) {
        t.menu_item_bean.push({ menu_item_id: itemId, bean_id: `${c.id}/${b}` });
      }
      (m.flavor_notes ?? []).forEach((n, i) => {
        t.menu_item_flavor_note.push({ menu_item_id: itemId, flavor_note_id: n, position: i + 1 });
      });
    }
  }

  t.country = [...countries].sort().map((code) => ({ code, name: countryName(code) ?? code }));
  t.origin = [...origins.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return t;
}
