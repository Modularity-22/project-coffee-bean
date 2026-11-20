import type { Row, Tables, Value } from './rows.ts';

export type Props = Record<string, Value>;
export interface GraphNode {
  label: string;
  id: string;
  props: Props;
}
export interface GraphEdge {
  type: string;
  from: { label: string; id: string };
  to: { label: string; id: string };
  props: Props;
}
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Namespace for identifiers. These IRIs are names, not pages you can open. */
export const BASE_IRI = 'https://projectcoffeebean.org/';

const clean = (row: Row, skip: string[] = []): Props =>
  Object.fromEntries(
    Object.entries(row).filter(([k, v]) => v !== null && k !== 'id' && !skip.includes(k)),
  );

/** Derives the knowledge graph from the relational rows. */
export function buildGraph(t: Tables): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const node = (label: string, id: Value, props: Props) =>
    nodes.push({ label, id: String(id), props });
  const edge = (
    type: string,
    fromLabel: string,
    from: Value,
    toLabel: string,
    to: Value,
    props: Props = {},
  ) => {
    if (from === null || to === null) return;
    edges.push({
      type,
      from: { label: fromLabel, id: String(from) },
      to: { label: toLabel, id: String(to) },
      props,
    });
  };

  for (const r of t.country) node('Country', r.code ?? null, { name: r.name ?? null });
  for (const r of t.roast_level) node('RoastLevel', r.id ?? null, clean(r));
  for (const r of t.process) node('Process', r.id ?? null, clean(r));
  for (const r of t.variety) node('Variety', r.id ?? null, clean(r));
  for (const r of t.drink_type) node('DrinkType', r.id ?? null, clean(r));
  for (const r of t.flavor_note) {
    node('FlavorNote', r.id ?? null, { name: r.name ?? null, tier: r.tier ?? null });
    edge('SUBNOTE_OF', 'FlavorNote', r.id ?? null, 'FlavorNote', r.parent_id ?? null);
  }

  for (const r of t.company) {
    node('Company', r.id ?? null, clean(r, ['country_code']));
    edge('LOCATED_IN', 'Company', r.id ?? null, 'Country', r.country_code ?? null);
  }
  for (const r of t.origin) {
    const name = [r.producer, r.region].filter(Boolean).join(', ') || String(r.country_code);
    node('Origin', r.id ?? null, { name, ...clean(r, ['country_code']) });
    edge('LOCATED_IN', 'Origin', r.id ?? null, 'Country', r.country_code ?? null);
  }
  for (const r of t.bean) {
    node('Bean', r.id ?? null, clean(r, ['company_id', 'roast_level_id', 'process_id']));
    edge('ROASTS', 'Company', r.company_id ?? null, 'Bean', r.id ?? null);
    edge('ROASTED_TO', 'Bean', r.id ?? null, 'RoastLevel', r.roast_level_id ?? null);
    edge('PROCESSED_BY', 'Bean', r.id ?? null, 'Process', r.process_id ?? null);
  }
  for (const r of t.bean_origin) {
    edge(
      'SOURCED_FROM',
      'Bean',
      r.bean_id ?? null,
      'Origin',
      r.origin_id ?? null,
      r.percent === null ? {} : { percent: r.percent ?? null },
    );
  }
  for (const r of t.bean_variety) {
    edge('HAS_VARIETY', 'Bean', r.bean_id ?? null, 'Variety', r.variety_id ?? null);
  }
  for (const r of t.bean_flavor_note) {
    edge('HAS_NOTE', 'Bean', r.bean_id ?? null, 'FlavorNote', r.flavor_note_id ?? null, {
      position: r.position ?? null,
    });
  }
  for (const r of t.bean_brew_method) {
    edge('BREWED_AS', 'Bean', r.bean_id ?? null, 'DrinkType', r.drink_type_id ?? null);
  }
  for (const r of t.cafe) {
    node('Cafe', r.id ?? null, clean(r, ['company_id', 'country_code']));
    edge('OPERATES', 'Company', r.company_id ?? null, 'Cafe', r.id ?? null);
    edge('LOCATED_IN', 'Cafe', r.id ?? null, 'Country', r.country_code ?? null);
  }
  for (const r of t.menu_item) {
    node('MenuItem', r.id ?? null, clean(r, ['company_id', 'cafe_id', 'drink_type_id']));
    if (r.cafe_id) edge('SERVES', 'Cafe', r.cafe_id, 'MenuItem', r.id ?? null);
    else edge('SERVES', 'Company', r.company_id ?? null, 'MenuItem', r.id ?? null);
    edge('IS_A', 'MenuItem', r.id ?? null, 'DrinkType', r.drink_type_id ?? null);
  }
  for (const r of t.menu_item_bean) {
    edge('USES_BEAN', 'MenuItem', r.menu_item_id ?? null, 'Bean', r.bean_id ?? null);
  }
  for (const r of t.menu_item_flavor_note) {
    edge('HAS_NOTE', 'MenuItem', r.menu_item_id ?? null, 'FlavorNote', r.flavor_note_id ?? null, {
      position: r.position ?? null,
    });
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------- Cypher

const cypherValue = (v: Value): string =>
  typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v);

const cypherMap = (props: Props): string =>
  `{${Object.entries(props)
    .map(([k, v]) => `${k}: ${cypherValue(v)}`)
    .join(', ')}}`;

export function toCypher(graph: Graph): string {
  const labels = [...new Set(graph.nodes.map((n) => n.label))];
  const out: string[] = [
    '// Project Coffee Bean knowledge graph. Generated file: do not edit.',
    ...labels.map(
      (l) =>
        `CREATE CONSTRAINT ${l.toLowerCase()}_id IF NOT EXISTS FOR (n:${l}) REQUIRE n.id IS UNIQUE;`,
    ),
  ];
  for (const n of graph.nodes) {
    out.push(`MERGE (n:${n.label} {id: ${cypherValue(n.id)}}) SET n += ${cypherMap(n.props)};`);
  }
  for (const e of graph.edges) {
    const props = Object.keys(e.props).length > 0 ? ` ${cypherMap(e.props)}` : '';
    out.push(
      `MATCH (a:${e.from.label} {id: ${cypherValue(e.from.id)}}), (b:${e.to.label} {id: ${cypherValue(e.to.id)}}) MERGE (a)-[:${e.type}${props}]->(b);`,
    );
  }
  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------- CSV

const csvCell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(graph: Graph): { nodes: string; edges: string } {
  const nodes = ['key,label,id,name,properties'];
  for (const n of graph.nodes) {
    nodes.push(
      [`${n.label}:${n.id}`, n.label, n.id, String(n.props.name ?? ''), JSON.stringify(n.props)]
        .map(csvCell)
        .join(','),
    );
  }
  const edges = ['from,type,to,properties'];
  for (const e of graph.edges) {
    edges.push(
      [`${e.from.label}:${e.from.id}`, e.type, `${e.to.label}:${e.to.id}`, JSON.stringify(e.props)]
        .map(csvCell)
        .join(','),
    );
  }
  return { nodes: nodes.join('\n') + '\n', edges: edges.join('\n') + '\n' };
}

// ---------------------------------------------------------------- RDF

const kebab = (label: string) => label.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const camel = (type: string) =>
  type.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export const iri = (ref: { label: string; id: string }): string =>
  `${BASE_IRI}id/${kebab(ref.label)}/${ref.id.split('/').map(encodeURIComponent).join('/')}`;

const ttlString = (v: string) =>
  `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;

const ttlValue = (v: Value): string => (typeof v === 'string' ? ttlString(v) : String(v));

/** Turtle. Edge properties (blend percent, note position) are not carried over. */
export function toTurtle(graph: Graph): string {
  const out: string[] = [
    `@prefix pcb: <${BASE_IRI}ontology#> .`,
    '@prefix schema: <https://schema.org/> .',
    '',
  ];
  const outgoing = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    const key = iri(e.from);
    outgoing.set(key, [...(outgoing.get(key) ?? []), e]);
  }
  for (const n of graph.nodes) {
    const subject = iri(n);
    const lines = [`<${subject}> a pcb:${n.label}`];
    for (const [k, v] of Object.entries(n.props)) {
      lines.push(`  ${k === 'name' ? 'schema:name' : `pcb:${camel(k)}`} ${ttlValue(v)}`);
    }
    for (const e of outgoing.get(subject) ?? []) {
      lines.push(`  pcb:${camel(e.type)} <${iri(e.to)}>`);
    }
    out.push(lines.join(' ;\n') + ' .');
  }
  return out.join('\n') + '\n';
}

export function toJsonLd(graph: Graph): object {
  const outgoing = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    const key = iri(e.from);
    outgoing.set(key, [...(outgoing.get(key) ?? []), e]);
  }
  return {
    '@context': {
      '@vocab': `${BASE_IRI}ontology#`,
      schema: 'https://schema.org/',
      name: 'schema:name',
    },
    '@graph': graph.nodes.map((n) => {
      const doc: Record<string, unknown> = { '@id': iri(n), '@type': n.label };
      for (const [k, v] of Object.entries(n.props)) doc[k === 'name' ? 'name' : camel(k)] = v;
      for (const e of outgoing.get(iri(n)) ?? []) {
        const key = camel(e.type);
        doc[key] = [...((doc[key] as object[] | undefined) ?? []), { '@id': iri(e.to) }];
      }
      return doc;
    }),
  };
}
