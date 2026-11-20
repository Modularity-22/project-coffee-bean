// Turns a scraped shop product into a draft bean entry. Everything here is a
// heuristic over free text, so the results are drafts: the scraper marks the
// company `verified: false` until a person has checked it against the source.
import type { BeanEntry, BeanOrigin, Taxonomy } from '../../../packages/schema/types.ts';
import {
  FlavourVocabulary,
  brewMethodsFromText,
  profileFromText,
  serveFromText,
} from './flavour.ts';
import { slugify } from './rows.ts';

export interface RawProduct {
  title: string;
  handle: string;
  url: string;
  body: string; // HTML or text
  type: string;
  tags: string[];
  options: string[]; // variant option values, e.g. grind sizes
}

/** Products that are not bags of roasted coffee. */
const NOT_BEANS =
  /instant|soluble|freeze[- ]dried|capsule|\bpods?\b|drip bag|coffee bags?|brew bags?|easy pour|cold brew|concentrate|\bcans?\b|bottle|subscription|gift|hamper|sampler|sample|trial|pack of|combo|bundle|\bmugs?\b|\bcups?\b|tumbler|filter paper|grinder|kettle|french press|dripper|\bv60\b|moka pot|machine|t-?shirt|\btee\b|tote|merch|voucher|\bcards?\b|workshop|course|session|chocolate bar|\btea\b|syrup|cookie|\bbox\b|\bkit\b|scale|server|brewer|equipment|decoction|liquid|sachet|matcha|protein|badge|calendar|dabara|dabra|custom|\btest\b|mushroom|premix|green beans|sticker|\bbook\b|tasting|pepper|honey jar|\bcascara\b|aeropress|\bmaker\b|cashew|green coffee|^green\b|unroasted|deliver(?:y|ies)|taster|\btrio\b|\bduo\b|explorer pack|variety pack|\bjar\b/i;
const LOOKS_LIKE_COFFEE = /coffee|arabica|robusta|roast|estate|blend|espresso|kaapi|kapi/i;

export function isRoastedCoffee(p: RawProduct): boolean {
  if (NOT_BEANS.test(stripHtml(p.title)) || NOT_BEANS.test(p.type)) return false;
  return LOOKS_LIKE_COFFEE.test(`${p.title} ${p.type} ${p.tags.join(' ')} ${stripHtml(p.body)}`);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '-')
    .replace(/&#0?38;/g, '&')
    .replace(/&#\d+;|\u{2060}|\u{200b}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------ labelled fields

const LABELS: Record<string, RegExp> = {
  notes:
    /(?:tasting notes?|tastes? like|taste notes?|cup(?:ping)? notes?|cup profile|flavou?r notes?|flavou?r profile|notes)/,
  roast: /(?:roast(?:ing)? (?:level|profile|degree)|roast)/,
  process: /(?:post[- ]harvest process|process(?:ing)?(?: method)?)/,
  altitude: /(?:altitude|elevation)/,
  variety: /(?:varietals?|variet(?:y|ies)|cultivar)/,
  region: /(?:region|location|origin)/,
  producer: /(?:estate|farm|producers?(?: name)?)/,
};
const ANY_LABEL = new RegExp(
  `\\b(${Object.values(LABELS)
    .map((r) => r.source)
    .join('|')})\\s*[:\\-–]\\s+`,
  'gi',
);

/** Finds "Label: value" pairs in running text. The first hit per field wins. */
export function labelledFields(text: string): Record<string, string> {
  const hits = [...text.matchAll(ANY_LABEL)];
  const out: Record<string, string> = {};
  hits.forEach((hit, i) => {
    const start = hit.index + hit[0].length;
    const end = Math.min(hits[i + 1]?.index ?? text.length, start + 140);
    const value = text
      .slice(start, end)
      .split(/(?<=[a-z)])\. /)[0]!
      .trim()
      .replace(/[\s|,;&-]+$/, '');
    const field = Object.keys(LABELS).find((k) =>
      new RegExp(`^${LABELS[k]!.source}$`, 'i').test(hit[1]!),
    );
    if (field && value && !(field in out)) out[field] = value;
  });
  return out;
}

// ------------------------------------------------------------ single fields

export function roastLevel(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/omni/.test(t)) return 'omni';
  if (/light[\s-]*(to[\s-]*|\/\s*)?med|med(ium)?[\s-]*light/.test(t)) return 'medium-light';
  if (/med(ium)?[\s-]*(to[\s-]*|\/\s*)?dark|dark[\s-]*med/.test(t)) return 'medium-dark';
  const found = [
    /\blight\b/.test(t) && 'light',
    /\bmedium\b/.test(t) && 'medium',
    /\bdark\b|vienna|french roast|italian roast/.test(t) && 'dark',
  ].filter(Boolean) as string[];
  return found.length === 1 ? found[0] : undefined; // several = a list of options, not a level
}

export function processId(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/decaf/.test(t) && /sugar ?cane|ethyl acetate|\bea\b/.test(t)) return 'decaf-sugarcane';
  if (/swiss water/.test(t)) return 'decaf-swiss-water';
  if (/co[- ]?ferment|barrel|cask|infus|thermal shock|cryo|yeast|koji|bio ?reactor/.test(t)) {
    return 'experimental';
  }
  if (/carbonic/.test(t)) return 'carbonic-maceration';
  if (/anaerobic|anoxic/.test(t)) {
    if (/natural/.test(t)) return 'anaerobic-natural';
    if (/wash/.test(t)) return 'anaerobic-washed';
    return 'experimental';
  }
  if (/monsoon/.test(t)) return 'monsooned';
  if (/wet[- ]hull|giling/.test(t)) return 'wet-hulled';
  const kinds = [
    /honey|pulped natural/.test(t) && 'honey',
    /natural|sun[- ]dried|dry process/.test(t) && 'natural',
    /wash|wet process/.test(t) && 'washed',
  ].filter(Boolean) as string[];
  if (kinds.length > 1) return /blend|\+|&| and /.test(t) ? 'mixed' : kinds[0];
  return kinds[0];
}

export function altitude(text: string): { min: number; max: number } | undefined {
  const m = text.match(
    /(\d[\d,]{2,5})(?:\s*(?:-|–|to)\s*(\d[\d,]{2,5}))?\s*(masl|msl|m\b|mts?\b|meters?|metres?|ft|feet)/i,
  );
  if (!m) return undefined;
  const feet = /^f/i.test(m[3]!);
  const toM = (s: string) => Math.round(Number(s.replace(/,/g, '')) * (feet ? 0.3048 : 1));
  const min = toM(m[1]!);
  const max = m[2] ? toM(m[2]) : min;
  return min >= 200 && max <= 3500 && min <= max ? { min, max } : undefined;
}

const VARIETY_ALIASES: Record<string, string> = {
  'sl ?n? ?-?795|s ?-?795|selection 795': 'sln-795',
  'sl ?n? ?-?0?9\\b|s ?-?9\\b|selection 9': 'sln-9',
  'sl ?-?28': 'sl28',
  'sl ?-?34': 'sl34',
  'geisha|gesha': 'gesha',
  heirloom: 'ethiopian-landrace',
  'kents?': 'kent',
};

export function varieties(text: string, taxonomy: Taxonomy): string[] {
  const found = new Set<string>();
  for (const [pattern, id] of Object.entries(VARIETY_ALIASES)) {
    if (new RegExp(`\\b(?:${pattern})`, 'i').test(text)) found.add(id);
  }
  for (const v of taxonomy.varieties) {
    if (v.name.length > 4 && new RegExp(`\\b${v.name}\\b`, 'i').test(text)) found.add(v.id);
  }
  // "100% Arabica" names the species, not a variety, so it is ignored.
  return [...found];
}

const vocabularies = new WeakMap<Taxonomy, FlavourVocabulary>();

/** Maps a tasting-note phrase onto flavour-wheel ids, in the order they appear. */
export function flavorNotes(text: string, taxonomy: Taxonomy): string[] {
  let vocab = vocabularies.get(taxonomy);
  if (!vocab) {
    vocab = new FlavourVocabulary(taxonomy);
    vocabularies.set(taxonomy, vocab);
  }
  return vocab.fromText(text).ids.slice(0, 8);
}

/** Text most likely to hold tasting notes when there is no labelled field. */
function notesSentence(text: string): string | undefined {
  const m = text.match(
    /(?:notes? of|tastes? (?:of|like)|hints? of|flavou?rs? of|reminiscent of|expect)\s+([^.!]{4,140})/i,
  );
  return m?.[1];
}

const COFFEE_COUNTRIES: Record<string, string> = {
  india: 'IN',
  ethiopia: 'ET',
  colombia: 'CO',
  brazil: 'BR',
  kenya: 'KE',
  guatemala: 'GT',
  honduras: 'HN',
  'costa rica': 'CR',
  'el salvador': 'SV',
  peru: 'PE',
  panama: 'PA',
  rwanda: 'RW',
  burundi: 'BI',
  indonesia: 'ID',
  sumatra: 'ID',
  vietnam: 'VN',
  mexico: 'MX',
  nicaragua: 'NI',
  uganda: 'UG',
  tanzania: 'TZ',
  yemen: 'YE',
  nepal: 'NP',
  'sri lanka': 'LK',
  bolivia: 'BO',
  ecuador: 'EC',
  'papua new guinea': 'PG',
  thailand: 'TH',
  myanmar: 'MM',
};
const INDIAN_REGIONS =
  /chikmagalur|chikkamagaluru|chickmagalur|coorg|kodagu|karnataka|baba ?budan ?giri|sakleshpur|hassan|belur|wayanad|kerala|idukki|nilgiris?|tamil nadu|yercaud|shevaroy|kodaikanal|palani|pulney|araku|andhra|koraput|odisha|nagaland|meghalaya|mizoram|tripura|manipur|arunachal|assam|biligiri|br hills|malnad/i;

export function origins(fields: Record<string, string>, title: string): BeanOrigin[] {
  const where = [fields.region, fields.producer, title].filter(Boolean).join(' | ');
  const lower = where.toLowerCase();
  let country = Object.entries(COFFEE_COUNTRIES).find(([name]) =>
    new RegExp(`\\b${name}\\b`).test(lower),
  )?.[1];
  if (!country && INDIAN_REGIONS.test(where)) country = 'IN';
  if (!country) return [];
  const estate =
    where.match(
      /\b((?:[A-Z][\w'’.]+ ){1,3}(?:Estates?|Farm|Cooperative|Washing Station))\b/,
    )?.[1] ?? (fields.producer && fields.producer.length <= 60 ? fields.producer : undefined);
  const cleaned = fields.region?.replace(/[\s,;•|-]+$/, '').replace(/,?\s*India$/i, '');
  const region = cleaned && cleaned.length <= 60 && !/[×%—]/.test(cleaned) ? cleaned : undefined;
  return [{ country, ...(region ? { region } : {}), ...(estate ? { producer: estate } : {}) }];
}

// ------------------------------------------------------------ whole product

export function extractBean(p: RawProduct, taxonomy: Taxonomy, retrieved: string): BeanEntry {
  const text = stripHtml(p.body);
  const fields = labelledFields(text);
  const options = p.options.join(' / ');
  const tagText = p.tags.join(', ');

  const forms: BeanEntry['forms'] = [];
  if (/whole|beans?\b/i.test(options) || !/\S/.test(options)) forms.push('whole_bean');
  if (
    /ground|grind|powder|press|filter|espresso|pour|coarse|fine|drip|moka|channi/i.test(
      `${options} ${p.title}`,
    )
  ) {
    forms.push('ground');
  }
  if (forms.length === 0) forms.push('whole_bean');

  const bean: BeanEntry = {
    id: slugify(p.handle).slice(0, 60).replace(/-+$/, ''),
    name: stripHtml(p.title),
    forms,
    url: p.url,
    retrieved,
  };

  const roast =
    roastLevel(fields.roast ?? '') ?? roastLevel(p.title) ?? roastLevel(`${p.type}, ${tagText}`);
  if (roast) bean.roast_level = roast;
  const process = processId(fields.process ?? '') ?? processId(p.title);
  if (process) bean.process = process;
  if (/\bblends?\b/i.test(`${p.title} ${p.type} ${tagText}`)) bean.blend = true;
  if (/\bdecaf/i.test(p.title)) bean.decaf = true;

  const from = origins(fields, p.title);
  if (from.length) bean.origins = from;
  const kinds = varieties(`${fields.variety ?? ''} | ${p.title}`, taxonomy);
  if (kinds.length) bean.varieties = kinds;
  const height =
    altitude(fields.altitude ?? '') ??
    altitude(text.match(/grown (?:at|between)[^.]{0,60}/i)?.[0] ?? '');
  if (height) bean.altitude_m = height;

  const noteText = fields.notes ?? notesSentence(text);
  if (noteText) {
    const notes = flavorNotes(noteText, taxonomy);
    if (notes.length) bean.flavor_notes = notes;
    bean.roaster_notes = noteText.slice(0, 200).trim();
  }

  // Published ratings and recommendations, from the description and the tags.
  const published = `${text}
${tagText.replace(/,/g, '.')}`;
  Object.assign(bean, extractServing(published, taxonomy));
  return bean;
}

/**
 * The "how to have it" part of a bean: attribute ratings, black or milk, and
 * recommended brew methods. Used on the product feed and, with --pages, on the
 * product page itself.
 */
export function extractServing(
  text: string,
  taxonomy: Taxonomy,
  { fromPage = false }: { fromPage?: boolean } = {},
): Pick<BeanEntry, 'profile' | 'serve' | 'brew_methods'> {
  // A full product page also shows other products, reviews and menus, so only
  // labelled values ("Acidity: Medium", "Have it with milk") are read from it.
  const out: Pick<BeanEntry, 'profile' | 'serve' | 'brew_methods'> = {};
  const profile = profileFromText(text, taxonomy.sensory, { labelledOnly: fromPage });
  if (Object.keys(profile).length) out.profile = profile;
  const serve = fromPage
    ? serveFromText(text.match(/have it[^.]{0,40}/i)?.[0] ?? '')
    : serveFromText(text);
  if (serve) out.serve = serve;
  if (!fromPage) {
    const methods = brewMethodsFromText(text);
    if (methods.length) out.brew_methods = methods;
  }
  return out;
}
