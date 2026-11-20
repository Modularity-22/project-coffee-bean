# ADR 0005: One uniform flavour profile for every coffee and drink

Date: 2026-11-19 · Status: accepted

## Context

The first flavour chart put each coffee's own tasting notes on the spokes, next to its ratings.
Every coffee therefore had different spokes in different places, so two charts could not be
compared, and two different measurements (notes, and 1–4 ratings) shared one scale.

An audit of all 177 beans with roaster text also found that the note parser read process
descriptions as flavours ("yellow honey process" → honey) and that a rule removing broad terms
next to narrow ones deleted real notes (apricot, recorded as "other fruit", vanished next to
coconut).

## Decision

- Every bean and drink gets the same card: a radar with the nine flavour-wheel families as fixed
  axes in the wheel's order, four fixed attribute meters, and (for beans) roast, serving and brew
  methods. Missing values are shown as missing, in place.
- The radar shows how many of the roaster's notes fall in each family. This is counted, so it
  needs no judgement and no data the roaster did not publish.
- The nine families are the inner circle of the 2016 SCA/WCR wheel, the same set the SCA's
  Coffee Value Assessment (2024) uses for describing coffee.
- Attributes stay on their own 1–4 meters. Numeric ratings on other scales are converted into
  four equal bands.
- All beans' notes were re-read from the roaster's own words with one method: process sentences
  skipped, adjectives dropped, plurals and British spellings understood, broad and narrow terms
  kept side by side. The database exposes the family counts as views.

## Consequences

- Any two coffees can be compared at a glance, and the data behind the picture is reproducible by
  anyone from the database.
- The radar reflects the roaster's description, not measured intensity. That is stated on the
  card.
- Coffees whose roasters write long marketing text get notes only from the parts that name
  flavours; the rest is kept in `roaster_notes` for people to read.
