## What this changes

<!-- One or two sentences. Link the issue if there is one: Closes #123 -->

## Type

- [ ] Data (new roaster, new beans, correction)
- [ ] Code (tools, schema, app)
- [ ] Docs or project housekeeping

## Data checklist (skip for code-only changes)

- [ ] The company sells roasted whole-bean or ground coffee, and nothing I added is instant coffee
- [ ] Every fact comes from a source listed in the file, with the date I read it
- [ ] I left out anything the source does not state, rather than guessing
- [ ] `npm run validate` passes
- [ ] I did not rename or delete existing ids

## Code checklist (skip for data-only changes)

- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass
- [ ] Schema changes are in a new migration and work in both PostgreSQL and SQLite
- [ ] Docs updated where behaviour changed
