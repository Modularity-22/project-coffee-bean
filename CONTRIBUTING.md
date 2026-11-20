# Contributing to Project Coffee Bean

Thank you for helping. There are two kinds of contribution, and the first needs no programming.

## 1. Data: add or correct a roaster

Each roaster is one file: `data/companies/<id>.yaml`. Copy an existing file such as
[`data/companies/the-barn.yaml`](data/companies/the-barn.yaml) and change it.

### Rules for data

1. **Only companies that sell roasted coffee beans** (whole bean or ground). No instant, soluble or
   freeze-dried coffee, and no instant-only brands. For a company that sells both, list only the beans.
   Capsules, drip bags, canned drinks and equipment are not listed either.
2. **Every fact needs a source.** Use the company's own website wherever possible. Put the page in
   `sources` (or the bean's `url`) with the date you read it in `retrieved`.
3. **Do not guess.** If the roaster does not state the process, the origin, the founding year or
   which bean goes into its flat white, leave the field out. A missing value is correct; an invented one is not.
4. **Flavour notes use the flavour wheel, strictly.** `roaster_notes` is a short line in the roaster's
   own words. `flavor_notes` may only contain terms from
   [`data/taxonomy/flavor-wheel.yaml`](data/taxonomy/flavor-wheel.yaml) (the SCA/WCR Coffee Taster's
   Flavor Wheel). Map each note to the closest term and go up a level when unsure; if a roaster's
   word is missing, add it to [`flavor-aliases.yaml`](data/taxonomy/flavor-aliases.yaml), never to
   the wheel. Sweetness, acidity, body and bitterness (`profile`, 1–4) are filled in only when the
   roaster publishes them. Full rules: [docs/flavour-vocabulary.md](docs/flavour-vocabulary.md).
5. **Keep quotes short.** Record facts and a brief tasting line, not a roaster's marketing copy or photos.
6. **Ids are permanent.** They are lowercase with hyphens (`blue-tokai`, `kolli-berri-estate`). Do not
   rename an existing id: other data and, later, people's tasting logs point at it. When a coffee is
   no longer sold, set `availability: discontinued` instead of deleting it.
7. Set `verified: true` only if you checked the entry against the listed sources yourself.
   Files written by the scraper start as `verified: false`; checking one and flipping the flag is
   one of the most useful contributions ([docs/scraper.md](docs/scraper.md)).
8. To get a new company scraped, add it to `tools/scraper/companies/<country>.yaml`.

The full field reference is in [docs/data-model.md](docs/data-model.md).

### Check your change

```bash
npm install
```

```bash
npm run validate
```

The same check runs on every pull request. If you cannot run it locally, open the pull request
anyway and read the result there.

### No Git? No problem

Open an **Add a roaster** or **Data correction** issue and fill in the form. A maintainer will turn it into a file.

## 2. Code: tools, schema and the app

- Node.js 20+. `npm install` at the root; the app has its own `npm install` in `apps/mobile`.
- Before you push: `npm run lint`, `npm run typecheck`, `npm test`, and for the app `npm run typecheck` in `apps/mobile`.
- Schema changes go in a **new** numbered file in `db/migrations/`. Keep the SQL valid for both
  PostgreSQL and SQLite: the tests load it into both. Update `tools/src/lib/rows.ts`,
  `packages/schema/` and `docs/data-model.md` in the same pull request.
- A decision that is costly to reverse gets a short record in `docs/adr/`.
- Open an issue before starting anything large, so the work is not wasted.

## Pull requests

- One topic per pull request. Data and code changes in separate pull requests where possible.
- Titles follow [Conventional Commits](https://www.conventionalcommits.org): `data: add Kaffa Roastery`,
  `fix(tools): …`, `feat(app): …`, `docs: …`.
- Fill in the pull request template. A maintainer reviews within a week when possible.
- By contributing you agree that your code is released under the MIT licence and your data under
  the ODbL 1.0, and that you have the right to contribute it.

## For roasters

If your company is listed and something is wrong or out of date, or you want an entry changed or
removed, open a **Data correction** issue or use the contact in [SUPPORT.md](SUPPORT.md). Corrections
from the company itself are handled first.
