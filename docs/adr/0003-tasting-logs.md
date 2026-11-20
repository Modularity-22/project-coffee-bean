# ADR 0003: Room for tasting logs (planned)

Date: 2026-11-15 · Status: proposed, not implemented

## Context

A later phase adds a guided coffee-tasting walkthrough and lets people log how a particular bean or
cafe drink tasted to them.

## Decision

Nothing is built yet, but the current design keeps these doors open:

- Bean and menu item ids are permanent slugs, so a log entry can point at them safely across data
  updates. Discontinued beans stay in the dataset.
- The flavour taxonomy is the vocabulary people will pick from when logging, so a person's notes can
  be compared with the roaster's.
- Logs are personal data. They will live in a second, user-owned SQLite database on the device,
  never in the bundled catalogue. A sketch:

```sql
CREATE TABLE tasting_log (
  id            TEXT PRIMARY KEY,
  tasted_at     TEXT NOT NULL,
  bean_id       TEXT,          -- catalogue bean id, or
  menu_item_id  TEXT,          -- catalogue menu item id
  brew_method   TEXT,
  acidity       INTEGER, body INTEGER, sweetness INTEGER, bitterness INTEGER,
  overall       INTEGER,
  comment       TEXT
);
CREATE TABLE tasting_log_note (
  log_id         TEXT NOT NULL REFERENCES tasting_log (id),
  flavor_note_id TEXT NOT NULL,
  PRIMARY KEY (log_id, flavor_note_id)
);
```

## Open questions

Sync and accounts (and the privacy policy they would need), and whether anonymous aggregate
ratings should flow back into the open dataset.
