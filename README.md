<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-on-cream.png">
    <img src="docs/images/logo.png" alt="Project Coffee Bean" width="220">
  </picture>
</p>

<h3 align="center">Know what is in your cup, and who roasted it.</h3>

<p align="center">
  An open, sourced database of coffee roasters and their beans, with one flavour profile for every
  coffee. Published as SQL, as a knowledge graph, and as a mobile app for Android and iOS.
</p>

<p align="center">
  <a href="https://github.com/Modularity-22/project-coffee-bean/actions/workflows/ci.yml"><img src="https://github.com/Modularity-22/project-coffee-bean/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-MIT-5A2A18" alt="Code licence: MIT"></a>
  <a href="DATA_LICENSE"><img src="https://img.shields.io/badge/data-ODbL_1.0-5A2A18" alt="Data licence: ODbL 1.0"></a>
  <a href="#how-you-can-help"><img src="https://img.shields.io/badge/contributions-welcome-3F7A4E" alt="Contributions welcome"></a>
</p>

<p align="center">
  <a href="#why-this-project-exists">Why</a> ·
  <a href="#what-works-today">What works today</a> ·
  <a href="#where-we-are-going">Roadmap</a> ·
  <a href="#how-you-can-help">How to help</a> ·
  <a href="#quick-start">Quick start</a>
</p>

<p align="center">
  <img src="docs/images/screens.png" alt="The app: the Discover screen, a bean's flavour profile, roasters in India, and the Learn to taste tab" width="100%">
</p>

## Why this project exists

Every roaster describes its coffee in its own words: _jammy_, _stone fruit_, _notes of Darjeeling
tea_. The facts are spread over thousands of shop pages, and there is no open place to ask simple
questions such as:

- Which roasters sell a washed coffee from Chikmagalur?
- What does this bean taste like next to that one?
- Which beans go into the flat white at this cafe?
- Who roasts coffee from this estate?

Project Coffee Bean collects what roasters publish into one open database. It puts every tasting note
on the same standard flavour wheel so coffees can be compared. It records where each fact came from,
and it gives everything away under open licences.

**In scope:**

- Companies anywhere in the world that sell roasted coffee, whole bean or ground.
- Their beans: origin, variety, process and roast level. Also tasting notes, plus sweetness, acidity,
  body and bitterness when the roaster publishes them.
- Their cafes, the drinks those cafes serve, and which beans go into each drink.

**Out of scope:** instant coffee. A brand that sells only instant coffee is not listed, and the
validator rejects instant products.

**Ground rules:**

- Every fact has a source URL and the date it was read.
- Nothing is guessed. If a roaster does not publish something, the field stays empty.

## What works today

> **Status: early but working.** The whole pipeline, from data files to the app, runs end to end and
> CI checks it. The dataset is a first batch: the project needs contributors to grow it.

- **52 roasters** in 9 countries. 41 are in India, the first country covered in depth.
- **225 beans**, with every tasting note on the same flavour wheel.
- **39 roasters checked by hand** against their own websites. 13 more are scraped drafts that are
  waiting for a person to check them.
- **10 cafe drinks**. Which drink uses which bean is the thinnest part of the data so far, because
  few roasters publish it.

| Part                                             | What it does                                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [Data files](data/companies)                     | One YAML file per roaster. Changes come in as pull requests and are checked by CI.                        |
| [Relational database](docs/data-model.md)        | A PostgreSQL schema and seed, and a SQLite snapshot with the same tables.                                 |
| [Knowledge graph](docs/ontology.md)              | Neo4j Cypher and CSV, and RDF in Turtle and JSON-LD with schema.org terms.                                |
| [Mobile app](apps/mobile)                        | Android and iOS (Expo, React Native). Works offline. Browse by roaster, bean, origin or flavour.          |
| [Flavour vocabulary](docs/flavour-vocabulary.md) | A strict set of terms based on the SCA and WCR Coffee Taster's Flavor Wheel.                              |
| [Scraper](docs/scraper.md)                       | Drafts roaster files from Shopify and WooCommerce shops. Makes one request a second and obeys robots.txt. |

## How it works

```mermaid
flowchart LR
  S["Scraper<br/>drafts from shops"] -.-> A
  A["data/companies/*.yaml<br/>one file per roaster"] --> V{"Validate<br/>schema and rules"}
  T["data/taxonomy/<br/>flavour wheel, drinks,<br/>processes, roasts"] --> V
  V --> P[("PostgreSQL<br/>schema and seed")]
  V --> Q[("SQLite<br/>snapshot")]
  V --> G["Knowledge graph<br/>Cypher · CSV · Turtle · JSON-LD"]
  Q --> M["Mobile app<br/>Android and iOS"]
```

The YAML files are the source of truth. Anyone can read a change as a diff, review it and see its
history. Everything else is built from them, and every build gives the same output.

### One flavour language for every coffee

Roasters write _jammy_, _stone fruit_ or _dark chocolate_. The validator accepts only terms from the
Coffee Taster's Flavor Wheel by the Specialty Coffee Association and World Coffee Research
([Spencer et al., 2016](https://doi.org/10.1111/1750-3841.13555)). The wheel has three tiers and nine
families. An [alias list](data/taxonomy/flavor-aliases.yaml) maps roasters' words onto the wheel, and
the roaster's own description is kept next to it. Every bean and drink gets the same profile card:

- **Flavour families:** a radar of the nine families (floral, fruity, sour and fermented, green, other,
  roasted, spices, nutty and cocoa, sweet).
- **Attributes:** sweetness, acidity, body and bitterness on a 1 to 4 scale. These are shown only when
  the roaster publishes them.
- **Roast, serving and brew methods:** how dark the roast is, how the coffee is served, and which brew
  methods it suits.

The full rules are in [docs/flavour-vocabulary.md](docs/flavour-vocabulary.md).

## Where we are going

| Phase                 | Goal                                                                                    | Status                                            |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **1. Open database**  | Schema, pipeline, knowledge graph, a browsing app and a first set of verified roasters. | Working. Data is growing.                         |
| **2. Every roaster**  | Cover every company that sells roasted beans, country by country, cafes and drinks too. | Started with India.                               |
| **3. Learn to taste** | A guided tasting walkthrough in the app, and a personal tasting log.                    | Planned. The Taste tab already shows the 6 steps. |

**Next up:**

- Check the 13 scraped drafts by hand and mark them verified.
- Finish India, then run the same drive for more countries. There is nothing yet from Latin America,
  Africa, the Middle East, East or South-East Asia, or the UK.
- Record more cafe menus and the beans each drink uses.
- Tag the first dataset release, and build the app for the stores with EAS.
- Add a link checker that marks beans as discontinued when their pages disappear.

**Later, in the app:**

- A step-by-step guide to tasting coffee: smell, slurp, acidity, sweetness, body, finish.
- A log of every bean and cafe drink you try. It uses the same flavour wheel, so your notes sit next to
  the roaster's ([design](docs/adr/0003-tasting-logs.md)).

The full plan and a country-by-country coverage table are in [docs/roadmap.md](docs/roadmap.md).

## How you can help

Most of the work is data, and you do not need to write code for it.

| If you                         | You can                                                                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| know a roaster that is missing | Open an [Add a roaster](https://github.com/Modularity-22/project-coffee-bean/issues/new?template=add-company.yml) issue with its website.                                                                 |
| spot something wrong           | Open a [Data correction](https://github.com/Modularity-22/project-coffee-bean/issues/new?template=data-correction.yml) issue. Companies asking about their own entry are handled first.                   |
| have 15 minutes                | Check a scraped draft (`verified: false` in [`data/companies/`](data/companies)) against the roaster's site and send a pull request.                                                                      |
| work at or visit a cafe        | Add its drinks and the beans they use, with a source.                                                                                                                                                     |
| live outside India             | Start a roaster list for your country in [`tools/scraper/companies/`](tools/scraper/companies).                                                                                                           |
| write code                     | Pick an issue labelled [good first issue](https://github.com/Modularity-22/project-coffee-bean/labels/good%20first%20issue). Shop adapters beyond Shopify and WooCommerce, and the tasting log, are open. |

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Questions and ideas are welcome in
[Discussions](https://github.com/Modularity-22/project-coffee-bean/discussions). Everyone taking part
follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Quick start

You need Node.js 22 (see [`.nvmrc`](.nvmrc)).

```bash
git clone https://github.com/Modularity-22/project-coffee-bean.git
cd project-coffee-bean
npm install
npm run build
```

`npm run build` checks the data and writes every output to `dist/`. Other commands:

| Command                  | Does                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run validate`       | Check every data file against the schema and the project rules                                   |
| `npm test`               | Run the tool tests, which load the schema into real PostgreSQL and SQLite engines in memory      |
| `npm run scrape -- in`   | Draft company files from the shops of the roasters listed for a country ([how](docs/scraper.md)) |
| `npm run stats`          | Print the coverage table                                                                         |
| `npm run build:postgres` | Load the data into the PostgreSQL database named by `DATABASE_URL`                               |

### Mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

The app reads a SQLite snapshot bundled at `apps/mobile/assets/data/coffee.db`. After changing data,
run `npm run build:sqlite` at the repository root to refresh it.

### PostgreSQL and Neo4j

```bash
docker compose -f db/docker-compose.yml up -d
DATABASE_URL=postgres://coffee:coffee@localhost:5432/coffee npm run build:postgres
```

To load the graph, run `dist/graph/graph.cypher` in the Neo4j browser at http://localhost:7474. The
tables and example queries are in [docs/data-model.md](docs/data-model.md).

## Repository layout

| Path                                | What it is                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| [`data/companies/`](data/companies) | One YAML file per roaster. **This is the source of truth and what people edit.** |
| [`data/taxonomy/`](data/taxonomy)   | Flavour wheel, aliases, drink types, processes, roast levels, varieties          |
| [`db/migrations/`](db/migrations)   | Relational schema for PostgreSQL and SQLite                                      |
| [`tools/`](tools)                   | Validator, scraper, and the PostgreSQL, SQLite and graph builders                |
| [`apps/mobile/`](apps/mobile)       | The React Native (Expo) app                                                      |
| [`docs/`](docs)                     | Data model, ontology, flavour rules, roadmap, decision records                   |

## Project

[Governance](GOVERNANCE.md) · [Maintainers](MAINTAINERS.md) · [Support](SUPPORT.md) ·
[Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## Licence and credits

- **Code:** [MIT](LICENSE).
- **Data:** everything in `data/` and everything built from it is under the
  [Open Database License 1.0](DATA_LICENSE). If you use the data, credit "Project Coffee Bean
  contributors" and keep databases you derive from it open under the same licence.
- **Flavour vocabulary:** from the Coffee Taster's Flavor Wheel by the Specialty Coffee Association
  and World Coffee Research (2016). The wheel artwork is not reproduced. See [NOTICE](NOTICE).
- **Interface review:** the app's polish pass followed [unslop](https://github.com/heydamir/unslop)
  by Damir Sokolovsky (CC BY 4.0).
- Company and product names belong to their owners and are used only to identify them. A listing
  does not mean the company endorses the project, or the project the company. The logo in
  `assets/brand/` is the project's own mark and is not covered by the MIT or ODbL licences.
