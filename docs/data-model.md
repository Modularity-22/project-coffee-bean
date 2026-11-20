# Data model

The YAML files in `data/` are the source of truth. The relational database and the knowledge graph
are both generated from them and always describe the same facts.

## Company file reference (`data/companies/<id>.yaml`)

| Field                            | Required           | Meaning                                                                                                                |
| -------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                             | yes                | Permanent slug, same as the file name                                                                                  |
| `name`, `website`                | yes                | As the company writes them                                                                                             |
| `country`                        | yes                | ISO 3166-1 alpha-2 code of the company's home country. Quote `'NO'` (YAML reads bare `NO` as false)                    |
| `city`, `founded`, `description` | no                 | Only when a source states them                                                                                         |
| `has_cafes`                      | no                 | Whether the company runs its own cafes. Leave out when not known                                                       |
| `cafe_count_approx`              | no                 | Number of cafes the company reports                                                                                    |
| `verified`                       | no                 | `true` when a person checked the entry against its sources. Scraped drafts are `false`                                 |
| `sources[]`                      | yes                | `url`, `retrieved` (date read), optional `note`                                                                        |
| `beans[]`                        | yes (may be empty) | See below                                                                                                              |
| `cafes[]`                        | no                 | `id`, `name`, `city`, `country`, optional `address`, `latitude`, `longitude`, `url`                                    |
| `menu[]`                         | no                 | `id`, `drink` (id from `drink-types.yaml`), `name`, optional `cafe`, `notes`, `beans[]`, plus `source` and `retrieved` |

Bean fields: `id`, `name`, `forms` (`whole_bean`, `ground`), `url`, `retrieved` are required.
Optional: `roast_level`, `process`, `blend`, `decaf`, `origins[]` (`country`, `region`, `producer`,
`percent`), `varieties[]`, `altitude_m` (`min`, `max`), `flavor_notes[]` (flavour-wheel ids only),
`roaster_notes`, `serve` (`black`, `milk`, `either`), `brew_methods[]` (drink type ids),
`profile` (`sweetness`, `acidity`, `body`, `bitterness`, each 1–4, only when the roaster publishes
numbers), `availability` (`current`, `seasonal`, `discontinued`).

Leave `menu[].beans` out when the company does not publish which bean a drink uses. The database
then records `beans_known = false`, which is different from "uses no bean".

Menu items take the same `flavor_notes` and `profile` as beans. Ratings are columns on `bean`
and `menu_item`. `flavor_note` has `tier` (1 category, 2 group, 3 descriptor), `parent_id` and
`family_id` (the tier-1 category). See [flavour-vocabulary.md](flavour-vocabulary.md).
The views `bean_flavor_family` and `menu_item_flavor_family` give, for each bean or drink, the
number of its notes in each flavour-wheel family: the data behind the app's flavour profile.

## Relational schema

Defined in [`db/migrations/0001_init.sql`](../db/migrations/0001_init.sql). The same SQL runs on
PostgreSQL and SQLite. Primary keys are text slugs (`blue-tokai`, `blue-tokai/kolli-berri-estate`)
so that ids stay the same across rebuilds.

```
country ◀── company ──▶ source
               │
               ├──▶ bean ──▶ roast_level, process
               │     ├──▶ bean_origin ──▶ origin ──▶ country
               │     ├──▶ bean_variety ──▶ variety
               │     ├──▶ bean_flavor_note ──▶ flavor_note (wheel term) ──▶ parent term, family
               │     └──▶ bean_brew_method ──▶ drink_type
               ├──▶ cafe
               └──▶ menu_item ──▶ drink_type
                        ├──▶ menu_item_bean ──▶ bean
                        └──▶ menu_item_flavor_note ──▶ flavor_note
```

### Example queries

Beans with any chocolate note, and who roasts them:

```sql
SELECT c.name AS roaster, b.name AS bean, n.name AS note
  FROM bean b
  JOIN company c ON c.id = b.company_id
  JOIN bean_flavor_note bfn ON bfn.bean_id = b.id
  JOIN flavor_note n ON n.id = bfn.flavor_note_id
 WHERE n.family_id = 'nutty-cocoa'
 ORDER BY roaster, bean;
```

Cafe drinks and the beans in them, where published:

```sql
SELECT c.name AS company, m.name AS drink, b.name AS bean
  FROM menu_item m
  JOIN company c ON c.id = m.company_id
  LEFT JOIN menu_item_bean mb ON mb.menu_item_id = m.id
  LEFT JOIN bean b ON b.id = mb.bean_id;
```

## Knowledge graph

See [ontology.md](ontology.md).

## Planned: tasting logs

Not built yet; recorded in [ADR 0003](adr/0003-tasting-logs.md) so the current model leaves room for it.
