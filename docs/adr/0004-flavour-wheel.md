# ADR 0004: Tasting notes use the SCA/WCR flavour wheel, strictly

Date: 2026-11-19 · Status: accepted

## Context

The first data used a home-made list of flavour words. Each roaster has its own vocabulary
("jaggery", "orange creamsicle", "berry compote"), so the same taste ended up under different
words and coffees could not be compared. The app also needs a fixed set of attributes to draw a
flavour profile.

## Decision

- `flavor_notes` may contain only terms from the Coffee Taster's Flavor Wheel (SCA and WCR, 2016),
  stored in three tiers in `data/taxonomy/flavor-wheel.yaml`. The validator rejects anything else.
- Roaster words are mapped through `data/taxonomy/flavor-aliases.yaml`; when in doubt, the broader
  term is used. The roaster's own wording is kept in `roaster_notes`.
- Sweetness, acidity, body and bitterness are stored on a 1–4 scale (low, medium, medium-high,
  high), only as published by the roaster or cafe. Nothing is estimated.
- The same rules apply to cafe drinks.
- The earlier list was replaced before the first release, so the first migration was edited in
  place instead of adding a new one.

## Consequences

- Notes are coarser than what roasters print ("mango" becomes "Other fruit"), but comparable.
- Many coffees have no published ratings, so their profiles show only notes.
- The planned tasting log can offer exactly the same vocabulary to people logging what they taste,
  so their notes can be compared with the roaster's.
