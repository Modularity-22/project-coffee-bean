# Knowledge graph

`npm run build:graph` writes the graph to `dist/graph/` in four formats:

| File                     | Use                                                          |
| ------------------------ | ------------------------------------------------------------ |
| `graph.cypher`           | Run in Neo4j (Browser or `cypher-shell`) to create the graph |
| `nodes.csv`, `edges.csv` | Any other graph tool, or spreadsheets                        |
| `graph.ttl`              | RDF Turtle                                                   |
| `graph.jsonld`           | RDF as JSON-LD                                               |

## Node types

`Company`, `Bean`, `Origin`, `Country`, `Variety`, `Process`, `RoastLevel`, `FlavorNote`, `Cafe`,
`DrinkType`, `MenuItem`. Every node has an `id` (the same slug as in the relational database) and
usually a `name`. Bean and MenuItem nodes carry `sweetness`, `acidity`, `body` and
`bitterness` (1–4) when published. FlavorNote nodes are the flavour-wheel terms, with a `tier`.

## Relationships

| Relationship   | From → To                       | Properties                                    |
| -------------- | ------------------------------- | --------------------------------------------- |
| `ROASTS`       | Company → Bean                  |                                               |
| `SOURCED_FROM` | Bean → Origin                   | `percent` (blends, when published)            |
| `LOCATED_IN`   | Company, Origin, Cafe → Country |                                               |
| `HAS_VARIETY`  | Bean → Variety                  |                                               |
| `PROCESSED_BY` | Bean → Process                  |                                               |
| `ROASTED_TO`   | Bean → RoastLevel               |                                               |
| `HAS_NOTE`     | Bean → FlavorNote               | `position` (order the roaster lists it)       |
| `SUBNOTE_OF`   | FlavorNote → FlavorNote         | term to its broader term on the flavour wheel |
| `OPERATES`     | Company → Cafe                  |                                               |
| `SERVES`       | Company or Cafe → MenuItem      |                                               |
| `IS_A`         | MenuItem → DrinkType            |                                               |
| `USES_BEAN`    | MenuItem → Bean                 | only when the company publishes it            |
| `BREWED_AS`    | Bean → DrinkType                | brew methods the roaster recommends           |
| `HAS_NOTE`     | MenuItem → FlavorNote           | `position`                                    |

## Example Cypher

Beans that share at least two flavour notes with a given bean:

```cypher
MATCH (b:Bean {id: 'the-barn/inku'})-[:HAS_NOTE]->(n)<-[:HAS_NOTE]-(other:Bean)
WITH other, count(n) AS shared, collect(n.name) AS notes
WHERE shared >= 2
RETURN other.name, shared, notes ORDER BY shared DESC;
```

Roasters with cafes in a country, and what they roast:

```cypher
MATCH (c:Company)-[:OPERATES]->(:Cafe)-[:LOCATED_IN]->(:Country {id: 'AE'})
MATCH (c)-[:ROASTS]->(b:Bean)
RETURN DISTINCT c.name, collect(DISTINCT b.name);
```

## RDF

- Vocabulary prefix `pcb:` = `https://projectcoffeebean.org/ontology#`; node IRIs look like
  `https://projectcoffeebean.org/id/bean/the-barn/inku`. These IRIs are identifiers. Nothing is
  served at those addresses yet, and the namespace should be confirmed once the project has a domain.
- Classes are the node types above (`pcb:Bean`); relationships become camel-case predicates
  (`pcb:hasNote`); names use `schema:name`.
- RDF triples cannot carry relationship properties, so `percent` and `position` are only in the
  Cypher and CSV exports.
