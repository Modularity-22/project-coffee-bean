# ADR 0002: The app ships an offline SQLite snapshot

Date: 2026-11-15 · Status: accepted

## Context

The app is used on phones, often in cafes and shops with poor signal. The project has no budget for
a hosted API.

## Decision

The Expo app bundles `coffee.db`, built from the data files, and reads it with `expo-sqlite`. The catalogue is read-only. Its on-device copy is named after a fingerprint of its content
(`coffee-<version>.db`; `npm run build:sqlite` writes the version to `src/db-version.ts`) and is
copied only when that file does not exist yet. A new release therefore gets fresh data, and a
database that is open is never overwritten. (Copying on every start overwrote the open database
when the web build ran in two tabs, which caused "no such table" and "Error finalizing statement".)
On the web the database can be open in only one tab; a second tab shows a message asking to close
the other one. The app lives in `apps/mobile` with its own `package.json`
and lockfile, separate from the root tooling.

## Consequences

- No server, no account, no network needed to browse.
- Data reaches users only with app releases. Downloading a newer snapshot from a GitHub release is
  a possible later addition.
- Anything the user creates must be stored in a separate database file, never in `coffee.db`.
- The app needs a newer Node.js (22.13+) than the data tools (20+).
