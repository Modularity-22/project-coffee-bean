// Writes the knowledge graph to dist/graph/ as Cypher, CSV, Turtle and JSON-LD.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph, toCsv, toCypher, toJsonLd, toTurtle } from './lib/graph.ts';
import { DIST_DIR, loadDataset } from './lib/load.ts';
import { buildTables } from './lib/rows.ts';

const graph = buildGraph(buildTables(loadDataset()));
const outDir = join(DIST_DIR, 'graph');
mkdirSync(outDir, { recursive: true });

const csv = toCsv(graph);
writeFileSync(join(outDir, 'graph.cypher'), toCypher(graph));
writeFileSync(join(outDir, 'nodes.csv'), csv.nodes);
writeFileSync(join(outDir, 'edges.csv'), csv.edges);
writeFileSync(join(outDir, 'graph.ttl'), toTurtle(graph));
writeFileSync(join(outDir, 'graph.jsonld'), JSON.stringify(toJsonLd(graph), null, 2) + '\n');

console.log(`✓ wrote dist/graph/ (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
