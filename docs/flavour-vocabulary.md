# Flavour vocabulary and the flavour profile

Every coffee and every cafe drink in the database is described the same way, and the app draws
the same profile for all of them. This page is the standard. It has three layers:

1. **Tasting notes**: what the roaster says it tastes of, recorded as flavour-wheel terms.
2. **Flavour families**: the nine wheel categories those notes fall into. Counted, not judged.
3. **Attributes**: sweetness, acidity, body and bitterness, on a 1–4 scale, only as published.

Nothing in any layer is estimated. Every value is either published by the roaster or cafe, or
counted mechanically from what they published.

## Why this system

It follows the coffee industry's own standards, so roasters, baristas, Q graders and casual
drinkers can all read it:

- The terms are the **Coffee Taster's Flavor Wheel** (Specialty Coffee Association and World Coffee
  Research, 2016), the standard tasting vocabulary, built on the WCR Sensory Lexicon. The hierarchy
  used here comes from Table 4 of the paper that designed it: Spencer M., Sage E., Velez M.,
  Guinard J.-X. (2016), _Journal of Food Science_ 81(12): S2997–S3005.
- The nine **families** are the wheel's inner circle. The SCA's current assessment method, the
  Coffee Value Assessment (2024), uses exactly these nine categories when cuppers describe aroma
  and flavour ("check all that apply").
- The **attributes** are what the same assessment rates for intensity (acidity, sweetness,
  mouthfeel, which roasters usually call body), plus bitterness, which many roasters publish.

## Layer 1: tasting notes

`flavor_notes` may only contain terms from
[`data/taxonomy/flavor-wheel.yaml`](../data/taxonomy/flavor-wheel.yaml). The validator rejects
anything else and suggests the right term.

The wheel has three tiers: 9 categories, then groups, then specific descriptors.

| Category           | Groups and descriptors                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| Floral             | black tea, chamomile, rose, jasmine                                                 |
| Fruity             | berry, dried fruit, other fruit, citrus fruit (e.g. raspberry, prune, cherry, lime) |
| Sour / fermented   | sour (citric acid, malic acid…), alcohol / fermented (winey, whiskey, fermented…)   |
| Green / vegetative | olive oil, raw, under-ripe, herb-like, beany…                                       |
| Other              | papery / musty (incl. woody, musty/earthy), chemical; mostly defects                |
| Roasted            | pipe tobacco, tobacco, burnt (smoky, ashy…), cereal (grain, malt)                   |
| Spices             | pungent, pepper, brown spice (anise, nutmeg, cinnamon, clove)                       |
| Nutty / cocoa      | nutty (peanuts, hazelnut, almond), cocoa (chocolate, dark chocolate)                |
| Sweet              | brown sugar (molasses, maple syrup, caramelized, honey), vanilla, overall sweet…    |

Where the wheel repeats a name one tier down (Floral › Floral, Green / vegetative › Green /
vegetative), the repeated level is folded into its parent. Nothing is added to the wheel.

### Rules for notes

1. **Use the roaster's notes, in the roaster's order.** Keep their exact words in `roaster_notes`.
2. **Map each word to the closest wheel term, and go up a level rather than guess.** Mango is not
   on the wheel, so it is "Other fruit", not "Pineapple". Unsure between raspberry and blackberry?
   "Berry". This is how the wheel is meant to be used: start in the centre and move out only as
   far as you are sure.
3. **Broad and narrow terms can sit side by side.** Apricot (recorded as "Other fruit") and
   coconut are two different notes even though both are other fruit.
4. **Texture and praise are not flavours.** Creamy, juicy, smooth, clean, bright, complex stay in
   `roaster_notes` only.
5. **Process is not flavour.** "Yellow honey process", "fermented for 72 hours", "aged in an oak
   barrel" describe how the coffee was made. They go in `process`, not in the notes.
6. **Never add a term to the wheel to fit one coffee.** Add an alias instead.

### How roaster text is read

The same method is applied to every bean, by the scraper and when data is checked
(`FlavourVocabulary.fromText` in [`tools/src/lib/flavour.ts`](../tools/src/lib/flavour.ts)):

- The text is split into items at commas, "and", "&", "with", "notes of" and full stops.
- **Sentences about processing are skipped** (process, fermented for, anaerobic, washed, dried,
  hours, aged in, barrel, altitude, harvest…) unless they also announce notes ("with notes of
  lemon").
- Each item is matched against wheel names and
  [`flavor-aliases.yaml`](../data/taxonomy/flavor-aliases.yaml), longest phrase first, so
  "dark chocolate" is not read as "chocolate" and "orange blossom" is floral, not orange.
- **Adjectives are dropped** when a phrase also names something more specific: "sweet prune" is
  prune, "toasted coconut" is coconut, "fresh plum" is other fruit, "roasted malt" is malt.
- **Plurals and British spellings** are understood ("figs", "black currants", "caramelised").
- Words that match nothing are reported, so the alias list can grow.

Roasters' words such as jaggery, toffee, cacao nibs or sweet lime are mapped in the alias list. To
support a new word, add one line there in your pull request. Teas other than black tea map to the
Floral category, because the wheel's only tea, black tea, sits there.

## Layer 2: flavour families (the radar)

For every bean and drink, the app counts how many of its tasting notes fall in each of the nine
families and draws them on a radar with **nine fixed axes, always in the wheel's own order**:

Floral · Fruity · Sour / fermented · Green / vegetative · Other (earthy, woody) · Roasted ·
Spices · Nutty / cocoa · Sweet

Rings mark 1, 2, and 3 or more notes. A coffee described as "rich dark chocolate, sweet prune and
zesty orange marmalade" has 2 Fruity (prune, orange) and 1 Nutty / cocoa (dark chocolate).

Because the axes never move, any two coffees can be compared at a glance: a fruity Ethiopian
leans to the top right, a chocolatey Indian estate to the left. The count says how much of the
roaster's description sits in a family, not how intense that family tastes; roasters do not
publish note intensities, so none are invented.

The same counts are in the database as the views `bean_flavor_family` and
`menu_item_flavor_family`, so anyone using the data draws the same picture.

## Layer 3: attributes

`profile` holds four ratings, always shown in this order, on a four-point scale defined in
[`data/taxonomy/sensory-attributes.yaml`](../data/taxonomy/sensory-attributes.yaml):

| Value | Meaning     |
| ----- | ----------- |
| 1     | Low         |
| 2     | Medium      |
| 3     | Medium-high |
| 4     | High        |

**Recorded only when the roaster or cafe publishes them.** Accepted forms:

- Words: "Acidity: Medium", "SWEETNESS MEDIUM-HIGH", the tag `acidity-medium`, and in the
  product's own description also "low acidity" or "a full body".
- Numbers on any scale, converted by splitting the scale into four equal bands:
  `ceil(value / max × 4)`. So 3/5 → 3, 2/5 → 2, 7/10 → 3, and an SCA CVA intensity of 12/15 → 4.

Vague words (bright, heavy, mild) are not converted. A missing rating is shown as an empty meter
marked "Not published", never filled in from the roast level or the notes.

## Serving suggestions

Also only from the roaster's own recommendation:

- `serve`: `black`, `milk` or `either` ("Have it with milk / black").
- `brew_methods`: drink-type ids the roaster recommends, such as `espresso`, `moka-pot`,
  `french-press`, `pour-over`. A list of grind sizes on sale is not a recommendation.

## What the app shows

Every bean and drink page has the same card, in the same order, whether the data is rich or
sparse:

1. **Flavour families**: the nine-axis radar.
2. **Attributes**: four meters, or "Not published".
3. **Roast, Have it, Brew with** (beans): the value, or "Not stated by the roaster".
4. The tasting notes as chips, and the roaster's own words.

## Licence note

The wheel's artwork is © SCA and WCR and is not reproduced. This project uses the vocabulary and
its grouping, credits both organisations, and links to the published research. If the project
ever wants to show the official wheel graphic or use the SCA or WCR names in its branding, it
should ask them first.
