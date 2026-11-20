// The flavour wheel as a vocabulary: lookup, aliases, and turning roaster text
// into wheel ids. Used by the validator, the row builder and the scraper.
import type { SensoryScale, Taxonomy, WheelNode } from '../../../packages/schema/types.ts';

export interface FlatNote {
  id: string;
  name: string;
  tier: number;
  parent_id: string | null;
  family_id: string;
}

export function flattenWheel(wheel: WheelNode[]): FlatNote[] {
  const out: FlatNote[] = [];
  const walk = (node: WheelNode, tier: number, parent: string | null, family: string) => {
    out.push({ id: node.id, name: node.name, tier, parent_id: parent, family_id: family });
    for (const child of node.children ?? []) walk(child, tier + 1, node.id, family);
  };
  for (const category of wheel) walk(category, 1, null, category.id);
  return out;
}

/** Lower-case, unify punctuation and spacing, so "Dark Chocolate!" == "dark chocolate". */
export function normalise(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' /-]+/g, ' ')
    .replace(/[/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adjective-like terms. Inside a phrase that also names something more
 * specific ("sweet prune", "toasted coconut", "fresh plum") they only describe
 * it and are not recorded as notes of their own.
 */
const MODIFIER_IDS = new Set([
  'overall-sweet',
  'fruity',
  'spices',
  'roasted',
  'brown-roast',
  'fresh',
]);

/**
 * Sentences about how the coffee was grown or processed ("Yellow honey
 * process", "fermented for 72 hours", "aged in an oak barrel"). Their words
 * name processes, not tastes, so they are skipped unless they also announce
 * tasting notes ("notes of ...").
 */
const PROCESS_SENTENCE =
  /\b(process(ed|ing)?|ferment(ed|ation)?\s+(for|in|with|without|alongside)|co[\s-]?ferment(ed|ation)?|anaerobic|aerobic|maceration|washed|sun[\s-]?dried|dried on|raised beds|\d+\s*hours?|aged in|barrel[\s-]aged|cask|harvest(ed)?|altitude|masl|varietal|grown|wet[\s-]hulled|infused|supernatural|pulped|cherries are|green beans|decaffeinated)\b/i;
const NOTES_CUE =
  /\b(notes? of|tastes? (of|like)|hints? of|flavou?rs? of|reminiscent of|expect)\b/i;

/** "fig" -> "figs", "berry" -> "berries", "peach" -> "peaches" (last word only). */
function plural(phrase: string): string {
  if (/[^aeiou]y$/.test(phrase)) return phrase.slice(0, -1) + 'ies';
  if (/(s|sh|ch|x|z)$/.test(phrase)) return phrase + 'es';
  return phrase + 's';
}

export class FlavourVocabulary {
  readonly notes: FlatNote[];
  private readonly byId = new Map<string, FlatNote>();
  /** normalised word -> wheel id, or null for words that are not flavours */
  private readonly words = new Map<string, string | null>();
  /** All known words, longest first, for finding them inside longer phrases. */
  private readonly phrases: Array<[string, string | null]>;

  constructor(taxonomy: Pick<Taxonomy, 'flavorWheel' | 'flavorAliases'>) {
    this.notes = flattenWheel(taxonomy.flavorWheel);
    const add = (word: string, id: string | null) => {
      const w = normalise(word);
      if (!this.words.has(w)) this.words.set(w, id);
    };
    for (const n of this.notes) this.byId.set(n.id, n);
    // Aliases first: a roaster word that is also a wheel name keeps the alias.
    for (const [word, id] of Object.entries(taxonomy.flavorAliases)) add(word, id ?? null);
    for (const n of this.notes) {
      add(n.name, n.id);
      add(n.id, n.id);
    }
    // Plurals of everything known ("figs", "black currants", "florals").
    for (const [word, id] of [...this.words]) {
      if (word.length > 2 && !word.endsWith('s')) add(plural(word), id);
    }
    this.phrases = [...this.words].sort((a, b) => b[0].length - a[0].length);
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  get(id: string): FlatNote | undefined {
    return this.byId.get(id);
  }

  /** Wheel id for an exact word: a string, null (not a flavour) or undefined (unknown). */
  lookup(word: string): string | null | undefined {
    return this.words.get(normalise(word));
  }

  /**
   * Keeps order and removes exact duplicates. A broad term next to a narrow one
   * is kept on purpose: "apricot" is recorded as "other-fruit", and that must
   * not disappear because "coconut" (also other fruit) is listed too.
   */
  tidy(ids: string[]): string[] {
    return [...new Set(ids)];
  }

  /**
   * Reads tasting notes such as "Dark Chocolate, roasted almonds & treacle"
   * into wheel ids, in order. Words that match nothing come back in `unknown`.
   */
  fromText(text: string): { ids: string[]; unknown: string[] } {
    const ids: string[] = [];
    const unknown: string[] = [];
    const sentences = text
      .split(/(?<=[.!?;])\s+|\n/)
      .filter((s) => !PROCESS_SENTENCE.test(s) || NOTES_CUE.test(s));
    const items = sentences
      .join(', ')
      .split(/[,;&+|•·]|\band\b|\bwith\b|\bnotes? of\b|\bhints? of\b|\.\s|\.$/i)
      .map((s) => normalise(s))
      .filter((s) => s.length > 1);
    for (const item of items) {
      const exact = this.words.get(item);
      if (exact !== undefined) {
        if (exact) ids.push(exact);
        continue;
      }
      // Find known words inside the item, longest first, without overlaps.
      let rest = ` ${item} `;
      const found: Array<{ at: number; id: string | null }> = [];
      for (const [phrase, id] of this.phrases) {
        let at = rest.indexOf(` ${phrase} `);
        while (at >= 0) {
          found.push({ at, id });
          rest =
            rest.slice(0, at + 1) + '#'.repeat(phrase.length) + rest.slice(at + 1 + phrase.length);
          at = rest.indexOf(` ${phrase} `);
        }
      }
      if (found.length === 0) unknown.push(item);
      const real = found.filter((f) => f.id);
      real.sort((a, b) => a.at - b.at);
      let kept = real.length > 1 ? real.filter((f) => !MODIFIER_IDS.has(f.id!)) : real;
      // Only adjectives ("sweet spices"): keep the last word, which is the noun.
      if (kept.length === 0 && real.length > 0) kept = [real[real.length - 1]!];
      for (const f of kept) ids.push(f.id!);
    }
    return { ids: this.tidy(ids), unknown: [...new Set(unknown)] };
  }
}

// ------------------------------------------------------------ sensory attributes

export const ATTRIBUTES = ['sweetness', 'acidity', 'body', 'bitterness'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Profile = Partial<Record<Attribute, number>>;

/**
 * Reads published attribute ratings such as "Acidity: Medium",
 * "SWEETNESS MEDIUM BODY MEDIUM-HIGH", the tag "acidity-medium" or
 * "low acidity". Only the scale words in sensory-attributes.yaml count.
 */
export function profileFromText(
  text: string,
  scale: SensoryScale,
  { labelledOnly = false }: { labelledOnly?: boolean } = {},
): Profile {
  const words = Object.keys(scale.scale_words).sort((a, b) => b.length - a.length);
  const level = words.map((w) => w.replace(/-/g, '[\\s-]')).join('|');
  const attr = ATTRIBUTES.join('|');
  const profile: Profile = {};
  const set = (name: string, word: string) => {
    const key = name.toLowerCase() as Attribute;
    const value = scale.scale_words[word.toLowerCase().replace(/\s+/g, '-')];
    if (value && profile[key] === undefined) profile[key] = value;
  };
  const forward = new RegExp(`\\b(${attr})\\b\\s*(?:level)?\\s*[:\\-–]?\\s*(${level})\\b`, 'gi');
  for (const m of text.matchAll(forward)) set(m[1]!, m[2]!);
  // Numeric ratings on any published scale: "Acidity: 3/5", "Body 7 out of 10", CVA's 0-15.
  const numeric = new RegExp(
    `\\b(${attr})\\b\\s*[:\\-–]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:\\/|out of|of)\\s*(\\d+)\\b`,
    'gi',
  );
  for (const m of text.matchAll(numeric)) {
    const key = m[1]!.toLowerCase() as Attribute;
    const value = Number(m[2]);
    const max = Number(m[3]);
    if (profile[key] === undefined && max >= 3 && value >= 0 && value <= max) {
      profile[key] = toFourPoint(value, max);
    }
  }
  // "low acidity", "a full body": only trusted in the product's own description.
  if (!labelledOnly) {
    const reverse = new RegExp(`\\b(${level})[\\s-]+(${attr})\\b`, 'gi');
    for (const m of text.matchAll(reverse)) set(m[2]!, m[1]!);
  }
  return profile;
}

/**
 * Converts a rating on any published scale to the project's 1-4 scale by
 * splitting the scale into four equal bands: 3/5 -> 3, 2/5 -> 2, 7/10 -> 3,
 * 12/15 (SCA CVA intensity) -> 4.
 */
export function toFourPoint(value: number, max: number): number {
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

export function serveFromText(text: string): 'black' | 'milk' | 'either' | undefined {
  const t = text.toLowerCase();
  if (
    /(black|without milk)\s*(or|\/|&|and)\s*(with )?milk|milk\s*(or|\/|&|and)\s*black|with or without milk/.test(
      t,
    )
  ) {
    return 'either';
  }
  if (
    /best (be )?(enjoyed |had |served )?with milk|have it with milk|great with milk|perfect with milk|(made|ideal|best) for milk/.test(
      t,
    )
  ) {
    return 'milk';
  }
  if (
    /best (be )?(enjoyed |had |served )?black|have it black|drink it black|(made|ideal|best) for black coffee/.test(
      t,
    )
  ) {
    return 'black';
  }
  return undefined;
}

const BREW_WORDS: Array<[RegExp, string]> = [
  [/south indian filter|channi|dabara|decoction/, 'south-indian-filter'],
  [/cold brew/, 'cold-brew'],
  [/espresso/, 'espresso'],
  [/moka/, 'moka-pot'],
  [/french press|plunger|cafetiere/, 'french-press'],
  [/aero ?press/, 'aeropress'],
  [/pour ?over|v60|chemex|kalita|hand ?brew|paper filter/, 'pour-over'],
  [/drip machine|electric (brewer|drip|coffee filter)|filter machine|drip coffee/, 'batch-brew'],
  [/turkish|ibrik|cezve|gezve/, 'turkish'],
  [/siphon|syphon/, 'siphon'],
];

/**
 * Brew methods the roaster recommends. Only reads sentences that say so
 * ("best enjoyed as an espresso", "Recommended equipment: ..."), not the list
 * of grind sizes on sale.
 */
export function brewMethodsFromText(text: string): string[] {
  const recommending =
    /recommended (equipment|brew(ing)? methods?)|brew with|best (be )?(enjoyed|brewed|suited|as|for|in|with|when)|ideal (for|as)|perfect (for|as)|works (well|best|beautifully) (as|in|with|for)|great (as|for|in)|suited (to|for)|we recommend/i;
  const methods: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+|\n/)) {
    if (!recommending.test(sentence)) continue;
    const s = sentence.toLowerCase();
    for (const [pattern, id] of BREW_WORDS) if (pattern.test(s)) methods.push(id);
  }
  return [...new Set(methods)];
}
