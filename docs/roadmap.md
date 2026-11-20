# Roadmap

## Phase 1: the open database (now)

- [x] Relational schema, validator, PostgreSQL and SQLite builds
- [x] Knowledge graph exports (Cypher, CSV, Turtle, JSON-LD)
- [x] Browsing app for Android and iOS (Expo)
- [x] First batch of roasters, checked against their own websites
- [x] Scraper that drafts company files from roasters' online shops ([scraper.md](scraper.md))
- [x] India: first pass over the company list (41 companies; see the list for what is still missing)
- [ ] Reach about 150–200 well-known roasters across every region (see coverage below)
- [x] Put the repository on GitHub, enable CI, Discussions and private vulnerability reporting
- [ ] First tagged dataset release and first app build through EAS

## Phase 2: breadth

The aim is every company that sells roasted coffee beans. No one-off effort gets there; it takes
many contributors and a steady review process.

- [ ] Country-by-country drives, starting with countries that have few entries
- [ ] Cafe menus and the beans used in each drink. This is the thinnest part of the data, because
      few companies publish it online. Contributions from people who work at or visit the cafes,
      with a source, are especially valuable.
- [ ] Scheduled link checker that flags dead product pages and marks beans as discontinued
- [ ] In-app "data updated" download from the latest dataset release

## Phase 3: tasting

- [ ] Guided walkthrough on how to taste coffee
- [ ] Personal tasting log for a bean or a cafe drink ([ADR 0003](adr/0003-tasting-logs.md))

## Coverage

As of 2026-11-20 (`npm run stats`):

| Country       | Companies |   Beans | Menu items |
| ------------- | --------: | ------: | ---------: |
| Australia     |         2 |       7 |          0 |
| Canada        |         1 |       4 |          0 |
| Germany       |         1 |       4 |          8 |
| Denmark       |         2 |       8 |          0 |
| India         |        41 |     185 |          1 |
| Netherlands   |         1 |       3 |          0 |
| Norway        |         1 |       3 |          1 |
| New Zealand   |         1 |       3 |          0 |
| United States |         2 |       8 |          0 |
| **Total**     |    **52** | **225** |     **10** |

Of these, 39 companies were checked by a person against the roaster's own site and 13 are scraped
drafts marked `verified: false`.

Known gaps:

- **India is not complete.** The list in `tools/scraper/companies/in.yaml` names about 25 more
  companies whose website could not be confirmed, whose shop has no readable feed, or which refused
  the scraper. Many small and regional roasters are not on the list at all yet.
- Most roasters have only a sample of their range (two to four beans by hand, up to ten scraped).
- Only three companies have drinks recorded, and no drink has a known bean: none of the companies
  read so far states it on its website.
- Outside India the dataset is still the first batch of 11 roasters, with nothing from Latin
  America, Africa, the Middle East, East or South-East Asia, or the UK.
- City, founding year and cafes are missing for many companies because the pages read did not state them.

## Wanted next

- Verify the 13 scraped drafts.
- Find the right websites for the parked entries in the India list.
- An adapter for shops that are not on Shopify or WooCommerce.
- Lists for other countries: `tools/scraper/companies/<code>.yaml`.
