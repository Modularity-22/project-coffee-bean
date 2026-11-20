# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Code follows
[Semantic Versioning](https://semver.org); dataset releases are tagged by date (`data-YYYY.MM.DD`).

## [Unreleased]

### Added

- Relational schema for companies, beans, origins, varieties, flavour notes, cafes and menu items.
- Data validator, including the rule that keeps instant coffee out.
- Builders for PostgreSQL, SQLite and the knowledge graph (Cypher, CSV, Turtle, JSON-LD).
- Flavour, drink, process, roast and variety taxonomies.
- First batch of 14 roasters, checked against their own websites on 2026-11-15.
- Scraper (`npm run scrape`) that drafts company files from Shopify and WooCommerce shop feeds,
  with a company list for India.
- India: 28 companies checked by hand and 13 scraped drafts.
- `has_cafes` may be left out when it is not known.
- Strict flavour vocabulary: tasting notes must be terms of the SCA/WCR Coffee Taster's Flavor
  Wheel, with an alias list for roasters' own words; sweetness, acidity, body and bitterness on
  a 1–4 scale, recorded only as published. Applies to beans and cafe drinks.
- Uniform flavour profile on every bean and drink page: a radar of the nine flavour-wheel
  families (counted from the roaster's notes), four attribute meters, and roast, "have it" and
  "brew with", with missing values shown as missing. Database views `bean_flavor_family` and
  `menu_item_flavor_family` hold the same counts.
- All tasting notes re-read with one method: process sentences skipped, adjectives dropped,
  plurals and British spellings understood. Numeric ratings on any scale convert to 1–4.
- Blue Tokai: 16 beans with their published ratings.
- Interface polish following the unslop review method by Damir Sokolovsky (github.com/heydamir/unslop):
  sentence-case labels, weights 400–600, one accent, one icon set, sized corners instead of pills,
  and secondary-style external links.
- The scraper reads robots.txt (RFC 9309: agent groups, Allow and Disallow, `*` and `$`, longest
  match) and skips anything a site closes to crawlers. Its user agent links to this repository.
- CI checks that the app's bundled database matches the data, and lints and type-checks the app.
- README rewritten as the project page: aims, current coverage, roadmap and ways to help.
- The app's web version is published to GitHub Pages on every change to the app or its data. A
  small service worker supplies the cross-origin isolation that the in-browser database needs,
  since Pages cannot set response headers.
- Start-up animation with the logo (native splash, then an animated intro while the catalogue
  opens), a redesigned home page (logo hero, bean of the day, flavour families, learn-to-taste
  card), a branded header and a new tab bar. The app icon now uses the logo mark.
- Fixed: the web build could overwrite its open database ("no such table", "Error finalizing
  statement"). A second browser tab now shows a clear message instead of a blank page.
- Expo (React Native) app: Discover home with search, browsing by flavour family, country and
  origin; filters for roasters and beans; similar beans; offline.
- Project governance, contribution guide, issue and pull request templates, CI.
