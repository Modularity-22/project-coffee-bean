# Governance

Project Coffee Bean is a small, maintainer-led open source project. This document says who decides
what, so that nobody has to guess.

## Roles

- **Contributors** open issues and pull requests. Anyone can be one.
- **Data reviewers** may approve and merge pull requests that only touch `data/`. A contributor is
  invited after several accurate, well-sourced data contributions.
- **Maintainers** may merge anything, cut releases, and manage the repository. They are listed in
  [MAINTAINERS.md](MAINTAINERS.md). A maintainer is added by agreement of the existing maintainers.
- The **project lead** has the final say when maintainers cannot agree, and holds the project's
  name, logo and accounts.

## How decisions are made

- Ordinary changes: one approving review from someone with merge rights for that area, and passing checks.
- Changes to the schema, the taxonomy structure, licences, this document or the scope of the
  project (for example what counts as in-scope coffee): an issue open for comment for at least
  seven days, then a decision by the maintainers, recorded in `docs/adr/`.
- We look for consensus first. If there is none, maintainers vote; a tie goes to the project lead.

## Data disputes

A company's own published information wins over third-party sources. Where sources conflict and it
cannot be settled, the field is left empty. Requests from a listed company to correct or remove its
entry are answered by a maintainer.

## Stepping down and inactivity

Maintainers and reviewers can step down at any time. Someone inactive for twelve months may be
moved to emeritus status after being asked.

## Changes to this document

By pull request, under the seven-day rule above.
