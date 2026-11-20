# ADR 0001: YAML files are the source of truth; databases are built from them

Date: 2026-11-15 · Status: accepted

## Context

The project needs the same data as a relational database, as a knowledge graph and inside a mobile
app, and it needs strangers to be able to contribute data that maintainers can review.

## Decision

Data lives as one YAML file per company in `data/companies/`, plus shared taxonomies. Tools validate
the files and generate PostgreSQL SQL, a SQLite snapshot and the graph exports. Nothing generated is
edited by hand. The schema is written in SQL that both PostgreSQL and SQLite accept, and primary keys
are stable text slugs.

## Consequences

- Contributions are ordinary pull requests with readable diffs, history and automatic checks.
- The relational and graph forms cannot drift apart, since both come from the same build.
- PostgreSQL-only features (enums, generated identities) are avoided in migrations.
- If the dataset grows to tens of thousands of companies, the directory may need sharding by
  country or first letter. Ids would not change.
