import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv } from 'ajv';
import type { CompanyFile, Dataset, Taxonomy, WheelNode } from '../../../packages/schema/types.ts';
import { FlavourVocabulary } from './flavour.ts';
import { ROOT } from './load.ts';

// Instant coffee is out of scope for the project. The schema already has no
// "instant" form; this catches instant products entered as if they were beans.
const INSTANT_PATTERN = /\b(instant|soluble|freeze[- ]dried|spray[- ]dried|3[- ]in[- ]1)\b/i;

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string): string | undefined {
  try {
    const name = regionNames.of(code);
    return name && name !== code && name !== 'Unknown Region' ? name : undefined;
  } catch {
    return undefined;
  }
}

export function validateDataset(dataset: Dataset): string[] {
  const errors: string[] = [];
  const schema = JSON.parse(
    readFileSync(join(ROOT, 'packages/schema/company.schema.json'), 'utf8'),
  );
  const validate = new Ajv({ allErrors: true }).compile<CompanyFile>(schema);

  const { taxonomy } = dataset;
  errors.push(...validateTaxonomy(taxonomy));
  const vocab = new FlavourVocabulary(taxonomy);
  const drinks = new Set(taxonomy.drinkTypes.map((d) => d.id));

  /** The strict flavour rule: only wheel ids, with a suggestion when a word is close. */
  const checkNotes = (notes: string[] | undefined, where: string, err: (m: string) => void) => {
    for (const n of notes ?? []) {
      if (vocab.has(n)) continue;
      const suggestion = vocab.lookup(n.replace(/-/g, ' '));
      err(
        `${where}: "${n}" is not on the flavour wheel` +
          (suggestion
            ? `; use "${suggestion}" (see data/taxonomy/flavor-aliases.yaml)`
            : suggestion === null
              ? '; it describes texture, not flavour, so keep it in roaster_notes only'
              : '; pick the closest term in data/taxonomy/flavor-wheel.yaml, or add an alias'),
      );
    }
  };
  const processes = new Set(taxonomy.processes.map((p) => p.id));
  const roasts = new Set(taxonomy.roastLevels.map((r) => r.id));
  const varieties = new Set(taxonomy.varieties.map((v) => v.id));

  const seenCompanies = new Set<string>();
  for (const { file, data } of dataset.companies) {
    const err = (msg: string) => errors.push(`companies/${file}: ${msg}`);

    if (!validate(data)) {
      for (const e of validate.errors ?? []) err(`${e.instancePath || '/'} ${e.message}`);
      continue; // structural errors make the checks below unreliable
    }
    if (`${data.id}.yaml` !== file) err(`id "${data.id}" must match the file name`);
    if (seenCompanies.has(data.id)) err(`duplicate company id "${data.id}"`);
    seenCompanies.add(data.id);

    const checkCountry = (code: string, where: string) => {
      if (!countryName(code)) err(`${where}: unknown country code "${code}"`);
    };
    checkCountry(data.country, 'country');

    if (INSTANT_PATTERN.test(data.name)) err('company name looks like an instant coffee brand');
    if (data.has_cafes !== true && (data.cafes?.length || data.menu?.length)) {
      err('cafes or menu items are listed but has_cafes is not true');
    }

    const beanIds = new Set<string>();
    for (const bean of data.beans) {
      const where = `bean "${bean.id}"`;
      if (beanIds.has(bean.id)) err(`${where}: duplicate bean id`);
      beanIds.add(bean.id);
      if (INSTANT_PATTERN.test(`${bean.name} ${bean.roaster_notes ?? ''}`)) {
        err(`${where}: looks like instant coffee, which is out of scope`);
      }
      if (bean.roast_level && !roasts.has(bean.roast_level)) {
        err(`${where}: unknown roast_level "${bean.roast_level}"`);
      }
      if (bean.process && !processes.has(bean.process)) {
        err(`${where}: unknown process "${bean.process}"`);
      }
      for (const v of bean.varieties ?? []) {
        if (!varieties.has(v)) err(`${where}: unknown variety "${v}"`);
      }
      checkNotes(bean.flavor_notes, where, err);
      for (const m of bean.brew_methods ?? []) {
        if (!drinks.has(m)) err(`${where}: unknown brew method "${m}" (use a drink type id)`);
      }
      for (const o of bean.origins ?? []) checkCountry(o.country, where);
      const total = (bean.origins ?? []).reduce((sum, o) => sum + (o.percent ?? 0), 0);
      if (total > 100) err(`${where}: origin percentages add up to more than 100`);
      const { min, max } = bean.altitude_m ?? {};
      if (min !== undefined && max !== undefined && min > max) {
        err(`${where}: altitude min is above max`);
      }
    }

    const cafeIds = new Set<string>();
    for (const cafe of data.cafes ?? []) {
      if (cafeIds.has(cafe.id)) err(`cafe "${cafe.id}": duplicate cafe id`);
      cafeIds.add(cafe.id);
      checkCountry(cafe.country, `cafe "${cafe.id}"`);
    }

    const menuIds = new Set<string>();
    for (const item of data.menu ?? []) {
      const where = `menu item "${item.id}"`;
      if (menuIds.has(item.id)) err(`${where}: duplicate menu id`);
      menuIds.add(item.id);
      if (!drinks.has(item.drink)) err(`${where}: unknown drink type "${item.drink}"`);
      if (item.cafe && !cafeIds.has(item.cafe)) err(`${where}: unknown cafe "${item.cafe}"`);
      checkNotes(item.flavor_notes, where, err);
      for (const b of item.beans ?? []) {
        if (!beanIds.has(b)) err(`${where}: bean "${b}" is not listed in this file`);
      }
    }
  }
  return errors;
}

/** Checks the taxonomy files themselves, including stray keys from YAML typos. */
export function validateTaxonomy(taxonomy: Taxonomy): string[] {
  const errors: string[] = [];
  const allowed: Record<string, [file: string, entries: object[], keys: string[]]> = {
    drinkTypes: [
      'drink-types.yaml',
      taxonomy.drinkTypes,
      ['id', 'name', 'category', 'description'],
    ],
    processes: ['processes.yaml', taxonomy.processes, ['id', 'name', 'description']],
    roastLevels: ['roast-levels.yaml', taxonomy.roastLevels, ['id', 'name', 'sort_order']],
    varieties: ['varieties.yaml', taxonomy.varieties, ['id', 'name', 'species']],
  };
  for (const [file, entries, keys] of Object.values(allowed)) {
    for (const entry of entries) {
      const extra = Object.keys(entry).filter((k) => !keys.includes(k));
      if (extra.length) {
        errors.push(
          `taxonomy/${file}: "${(entry as { id?: string }).id}" has unexpected key(s) ${extra.join(', ')}` +
            ' (a comma inside an unquoted value? quote the value)',
        );
      }
    }
  }

  const seen = new Set<string>();
  const walk = (nodes: WheelNode[], depth: number) => {
    for (const n of nodes) {
      const extra = Object.keys(n).filter((k) => !['id', 'name', 'children'].includes(k));
      if (extra.length)
        errors.push(
          `taxonomy/flavor-wheel.yaml: "${n.id}" has unexpected key(s) ${extra.join(', ')}`,
        );
      if (seen.has(n.id)) errors.push(`taxonomy/flavor-wheel.yaml: duplicate id "${n.id}"`);
      if (depth > 3)
        errors.push(`taxonomy/flavor-wheel.yaml: "${n.id}" is deeper than three tiers`);
      seen.add(n.id);
      walk(n.children ?? [], depth + 1);
    }
  };
  walk(taxonomy.flavorWheel, 1);

  const expected = ['sweetness', 'acidity', 'body', 'bitterness'];
  const ids = taxonomy.sensory.attributes.map((a) => a.id);
  if (ids.join() !== expected.join()) {
    errors.push(
      `taxonomy/sensory-attributes.yaml: attributes must be ${expected.join(', ')} in that order`,
    );
  }
  if (taxonomy.sensory.scale.map((s) => s.value).join() !== '1,2,3,4') {
    errors.push('taxonomy/sensory-attributes.yaml: the scale must be 1, 2, 3, 4');
  }
  for (const [word, value] of Object.entries(taxonomy.sensory.scale_words)) {
    if (!Number.isInteger(value) || value < 1 || value > 4) {
      errors.push(`taxonomy/sensory-attributes.yaml: "${word}" maps to ${value}, outside 1-4`);
    }
  }
  for (const [word, id] of Object.entries(taxonomy.flavorAliases)) {
    if (id !== null && !seen.has(id)) {
      errors.push(
        `taxonomy/flavor-aliases.yaml: "${word}" points at "${id}", which is not on the wheel`,
      );
    }
  }
  return errors;
}
