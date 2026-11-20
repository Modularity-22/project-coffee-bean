# The scraper

Typing every roaster in by hand does not scale, so the project has a scraper that reads roasters'
own online shops and writes **draft** company files.

```bash
npm run scrape -- in
```

`in` is a country code: the scraper reads its to-do list from
[`tools/scraper/companies/in.yaml`](../tools/scraper/companies/in.yaml).

| Option        | Meaning                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `--only <id>` | Scrape one company                                                     |
| `--max <n>`   | Keep at most `n` beans per company (default 10)                        |
| `--refresh`   | Ignore cached responses in `.cache/scrape/`                            |
| `--pages`     | Also read each bean's product page for published ratings and "have it" |
| `--out <dir>` | Write drafts to another folder, for review before merging              |
| `--force`     | Rewrite existing drafts. Verified files are never overwritten          |

## How it works

1. Reads `robots.txt` and stops if the shop feed is disallowed.
2. Reads the home page and checks that it names the company. A wrong web address is reported,
   not scraped.
3. Reads the shop's public product feed: Shopify (`/products.json`) first, then WooCommerce
   (`/wp-json/wc/store/v1/products`). These are the same feeds the shop's own pages use.
4. Drops anything that is not a bag of roasted coffee: instant coffee, capsules, drip bags, cold
   brew, equipment, gift sets, green beans.
5. Reads roast, process, origin, variety, altitude and tasting notes out of each product's text
   ([`tools/src/lib/extract.ts`](../tools/src/lib/extract.ts)) and maps them onto the taxonomy.
6. Writes `data/companies/<id>.yaml` with `verified: false`.

It makes at most one request a second to any site and identifies itself as `ProjectCoffeeBeanBot`.

### Tasting notes and ratings

Tasting notes are mapped onto the flavour wheel through the alias list; words that map to nothing
are left out ([flavour-vocabulary.md](flavour-vocabulary.md)). Ratings (sweetness, acidity, body,
bitterness) are read only where the roaster states them. From the product description both
"Acidity: Medium" and "low acidity" count. From a full product page only labelled values count,
because the page also shows other products and customer reviews.

## Drafts are not facts yet

The extraction is pattern matching over marketing text. It is usually right about roast, process
and tasting notes, and it misses things. So:

- Every scraped company is marked `verified: false`, and the app labels it "Unverified".
- `has_cafes` is left out (unknown). When the home page links to something that looks like a cafe
  or locations page, the link is recorded in the source note for a reviewer to follow.
- Cafes and drinks are never scraped. They need a person.

**To verify a draft:** open the bean links, correct or remove what is wrong, fill in what the
scraper could not know (city, cafes, menu), set `verified: true`, and open a pull request.

## Adding companies

Add a line to the country's list with `id`, `name` and `website`, then run the scraper. To start a
new country, create `tools/scraper/companies/<code>.yaml`.

Shops that are not on Shopify or WooCommerce are reported as "no readable product feed". They need
either a manual entry or a new adapter in `tools/src/scrape.ts` (a function that returns
`RawProduct[]`).

## Limits

- "Every coffee company" is a moving target. The list file is the honest record of what is covered;
  the report printed after each run says what failed and why.
- The scraper stores short factual fields and a tasting line of at most 200 characters. It does not
  copy descriptions or images.
