// Scrapes roasters' own online shops and writes draft company files.
//
//   npm run scrape -- in                 every company in tools/scraper/companies/in.yaml
//   npm run scrape -- in --only subko    one company
//   npm run scrape -- in --max 12        at most 12 beans per company (default 10)
//   npm run scrape -- in --refresh       ignore the local cache
//   npm run scrape -- in --force         also rewrite existing *unverified* drafts
//   npm run scrape -- in --pages         also read each bean's product page for published
//                                        acidity/body/sweetness/bitterness, serving and brew methods
//   npm run scrape -- in --out <dir>     write drafts to <dir> instead of data/companies
//
// What it does, per company:
//   1. reads robots.txt and skips every path it disallows for ProjectCoffeeBeanBot
//   2. reads the home page and checks it really belongs to the named company
//   3. reads the public product feed (Shopify, then WooCommerce)
//   4. writes data/companies/<id>.yaml with `verified: false`
//
// It never overwrites a file a person has verified, makes at most one request a
// second to any site, and caches raw responses in .cache/scrape/ (not committed).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import type { BeanEntry, CompanyFile } from '../../packages/schema/types.ts';
import {
  extractBean,
  extractServing,
  isRoastedCoffee,
  stripHtml,
  type RawProduct,
} from './lib/extract.ts';
import { DATA_DIR, ROOT, loadTaxonomy } from './lib/load.ts';
import { BOT_NAME, disallowed } from './lib/robots.ts';

// Shop feeds are loosely typed JSON; fields are read defensively below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

interface ListEntry {
  id: string;
  name: string;
  website: string;
  city?: string;
  has_cafes?: boolean;
  cafe_count_approx?: number;
}

const USER_AGENT = `${BOT_NAME}/0.1 (+https://github.com/Modularity-22/project-coffee-bean; respects robots.txt)`;
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) =>
  args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined;
const country = args.find(
  (a) => !a.startsWith('--') && a !== option('only') && a !== option('max') && a !== option('out'),
);
const OUT_DIR = option('out')
  ? resolve(process.cwd(), option('out')!)
  : join(DATA_DIR, 'companies');
const MAX_BEANS = Number(option('max') ?? 10);
const TODAY = new Date().toISOString().slice(0, 10);
const CACHE = join(ROOT, '.cache/scrape');

if (!country) {
  console.error(
    'Usage: npm run scrape -- <country code, e.g. in> [--only id] [--max n] [--pages] [--refresh] [--force] [--out dir]',
  );
  process.exit(1);
}

const lastHit = new Map<string, number>();
async function get(url: string): Promise<{ status: number; text: string }> {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + 1000 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(host, Date.now());
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(30_000),
    redirect: 'follow',
  });
  return { status: res.status, text: await res.text() };
}

/** Does the page look like it belongs to this company? Guards against wrong domains. */
function matchesName(name: string, html: string): boolean {
  const page = html.toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter((w) => w.length > 2 && !['coffee', 'roasters', 'the', 'company', 'and'].includes(w));
  return words.length === 0 || words.some((w) => page.includes(w));
}

async function shopifyProducts(base: string, robots: string): Promise<RawProduct[] | null> {
  if (disallowed(robots, '/products.json')) return null;
  const out: RawProduct[] = [];
  for (let page = 1; page <= 2; page++) {
    const res = await get(`${base}/products.json?limit=250&page=${page}`);
    if (res.status !== 200 || !res.text.trimStart().startsWith('{')) return page === 1 ? null : out;
    const { products } = JSON.parse(res.text) as { products: Array<Record<string, Json>> };
    for (const p of products) {
      if (p.variants?.every((v: { available?: boolean }) => v.available === false)) continue;
      out.push({
        title: p.title,
        handle: p.handle,
        url: `${base}/products/${p.handle}`,
        body: p.body_html ?? '',
        type: p.product_type ?? '',
        tags: Array.isArray(p.tags) ? p.tags : String(p.tags ?? '').split(','),
        options: (p.options ?? []).flatMap((o: { values: string[] }) => o.values),
      });
    }
    if (products.length < 250) break;
  }
  return out;
}

async function wooProducts(base: string, robots: string): Promise<RawProduct[] | null> {
  if (disallowed(robots, '/wp-json/wc/store/v1/products')) return null;
  const res = await get(`${base}/wp-json/wc/store/v1/products?per_page=100`);
  if (res.status !== 200 || !res.text.trimStart().startsWith('[')) return null;
  return (JSON.parse(res.text) as Array<Record<string, Json>>)
    .filter((p) => p.is_in_stock !== false)
    .map((p) => ({
      title: stripHtml(p.name ?? ''),
      handle: p.slug,
      url: p.permalink,
      body: `${p.short_description ?? ''} ${p.description ?? ''}`,
      type: (p.categories ?? []).map((c: { name: string }) => c.name).join(', '),
      tags: (p.tags ?? []).map((t: { name: string }) => t.name),
      options: (p.attributes ?? []).flatMap((a: { terms?: Array<{ name: string }> }) =>
        (a.terms ?? []).map((t) => t.name),
      ),
    }));
}

interface Scraped {
  platform: string;
  /** robots.txt as read, so product pages fetched later follow it too. */
  robots: string;
  home: string;
  products: RawProduct[];
}

async function scrape(entry: ListEntry): Promise<Scraped | string> {
  const base = entry.website.replace(/\/+$/, '');
  const cacheFile = join(CACHE, `${entry.id}.json`);
  if (!flag('refresh') && existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, 'utf8')) as Scraped;
  }
  const robotsRes = await get(`${base}/robots.txt`).catch(() => ({ status: 0, text: '' }));
  const robots = robotsRes.status === 200 ? robotsRes.text : '';
  if (disallowed(robots, '/')) return 'the whole site is closed to crawlers by robots.txt';

  const home = await get(base);
  if (home.status !== 200) return `home page returned HTTP ${home.status}`;
  if (!matchesName(entry.name, home.text))
    return 'home page does not mention the company name (wrong website?)';

  let platform = 'shopify';
  let products = await shopifyProducts(base, robots);
  if (!products) {
    platform = 'woocommerce';
    products = await wooProducts(base, robots);
  }
  if (!products)
    return 'no readable product feed (not Shopify or WooCommerce, or closed by robots.txt)';

  const result: Scraped = { platform, robots, home: home.text.slice(0, 200_000), products };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(result));
  return result;
}

/** Fills in published ratings, serving and brew methods from each bean's own page. */
async function readProductPages(
  entry: ListEntry,
  beans: BeanEntry[],
  robots: string,
): Promise<void> {
  const taxonomy = loadTaxonomy();
  const dir = join(CACHE, 'pages', entry.id);
  mkdirSync(dir, { recursive: true });
  for (const bean of beans) {
    if (disallowed(robots, new URL(bean.url).pathname)) continue;
    const cached = join(dir, `${bean.id}.txt`);
    let text: string;
    if (!flag('refresh') && existsSync(cached)) {
      text = readFileSync(cached, 'utf8');
    } else {
      const res = await get(bean.url).catch(() => ({ status: 0, text: '' }));
      if (res.status !== 200) continue;
      text = stripHtml(res.text);
      writeFileSync(cached, text);
    }
    const found = extractServing(text, taxonomy, { fromPage: true });
    if (found.profile) bean.profile = { ...found.profile, ...bean.profile };
    if (found.serve && !bean.serve) bean.serve = found.serve;
    if (found.brew_methods && !bean.brew_methods) bean.brew_methods = found.brew_methods;
  }
}

function draft(entry: ListEntry, scraped: Scraped): CompanyFile | string {
  const taxonomy = loadTaxonomy();
  const beans: BeanEntry[] = [];
  const seen = new Set<string>();
  for (const p of scraped.products.filter(isRoastedCoffee)) {
    const bean = extractBean(p, taxonomy, TODAY);
    if (!bean.id || seen.has(bean.id)) continue;
    seen.add(bean.id);
    beans.push(bean);
  }
  if (beans.length === 0) return 'no roasted coffee products found';
  // Prefer the entries we could read the most from.
  const richness = (b: BeanEntry) =>
    (b.flavor_notes?.length ?? 0) +
    Object.keys(b.profile ?? {}).length +
    (b.origins ? 2 : 0) +
    (b.process ? 1 : 0) +
    (b.roast_level ? 1 : 0);
  beans.sort((a, b) => richness(b) - richness(a));
  // A product we could read nothing from is as likely to be merchandise as coffee.
  const useful = beans.filter((b) => richness(b) > 0);
  if (useful.length === 0) return 'products found, but no coffee details could be read from them';

  const base = entry.website.replace(/\/+$/, '');
  const cafeLinks = [...scraped.home.matchAll(/href=["']([^"'#?]+)["']/g)]
    .map((m) => m[1]!)
    .filter(
      (h) =>
        /cafe|caf%C3%A9|location|store-locator|outlets?|visit|find-us/i.test(h) &&
        !/wholesale|products\/|collections\/|blogs\/|cdn\.|\.(css|js|png|jpg|svg|webp)/.test(h),
    );
  const cafePage = cafeLinks[0] ? new URL(cafeLinks[0], base).href : undefined;

  return {
    id: entry.id,
    name: entry.name,
    country: country!.toUpperCase(),
    ...(entry.city ? { city: entry.city } : {}),
    website: base,
    ...(entry.has_cafes !== undefined ? { has_cafes: entry.has_cafes } : {}),
    ...(entry.cafe_count_approx ? { cafe_count_approx: entry.cafe_count_approx } : {}),
    verified: false,
    sources: [
      {
        url: base,
        retrieved: TODAY,
        note:
          `Collected automatically from the shop's ${scraped.platform === 'shopify' ? 'Shopify' : 'WooCommerce'} product feed; not yet checked by a person.` +
          (cafePage ? ` The site has a page that may list cafes: ${cafePage}` : ''),
      },
    ],
    beans: useful.slice(0, MAX_BEANS),
  };
}

const list = parse(
  readFileSync(join(ROOT, `tools/scraper/companies/${country}.yaml`), 'utf8'),
) as ListEntry[];
const todo = list.filter((e) => !option('only') || e.id === option('only'));
const report: string[] = [];
let written = 0;

await Promise.all(
  // One worker per company; requests to the same host are still spaced out.
  todo.map(async (entry) => {
    const file = join(OUT_DIR, `${entry.id}.yaml`);
    if (existsSync(file)) {
      const current = parse(readFileSync(file, 'utf8')) as CompanyFile;
      if (current.verified || !flag('force')) {
        report.push(`= ${entry.id}: kept existing ${current.verified ? 'verified' : 'draft'} file`);
        return;
      }
    }
    try {
      const scraped = await scrape(entry);
      if (typeof scraped === 'string') {
        report.push(`✗ ${entry.id}: ${scraped}`);
        return;
      }
      const result = draft(entry, scraped);
      if (typeof result === 'string') {
        report.push(`✗ ${entry.id}: ${result}`);
        return;
      }
      if (flag('pages')) await readProductPages(entry, result.beans, scraped.robots ?? '');
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(file, stringify(result, { lineWidth: 0, aliasDuplicateObjects: false }));
      written += 1;
      report.push(`✓ ${entry.id}: ${result.beans.length} beans (draft)`);
    } catch (error) {
      report.push(`✗ ${entry.id}: ${(error as Error).message}`);
    }
  }),
);

report.sort();
console.log(report.join('\n'));
console.log(
  `\n${written} draft file(s) written. Run "npm run validate", then review them against the source pages.`,
);
mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, `report-${country}.txt`), report.join('\n') + '\n');
