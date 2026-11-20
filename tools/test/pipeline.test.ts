import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import initSqlJs from 'sql.js';
import type { CompanyFile, Dataset } from '../../packages/schema/types.ts';
import { buildGraph, toCypher, toJsonLd, toTurtle } from '../src/lib/graph.ts';
import { loadDataset, loadTaxonomy } from '../src/lib/load.ts';
import { TABLE_ORDER, buildTables, slugify } from '../src/lib/rows.ts';
import { readMigrations, seedSql, sqlLiteral } from '../src/lib/sql.ts';
import { validateDataset, validateTaxonomy } from '../src/lib/validate.ts';

const sample = (): CompanyFile => ({
  id: 'test-roasters',
  name: 'Test Roasters',
  country: 'IN',
  website: 'https://example.com',
  has_cafes: true,
  sources: [{ url: 'https://example.com', retrieved: '2026-11-15' }],
  beans: [
    {
      id: 'house',
      name: "Owner's House Blend",
      forms: ['whole_bean', 'ground'],
      roast_level: 'medium',
      process: 'washed',
      blend: true,
      origins: [
        { country: 'IN', region: 'Chikmagalur', percent: 60 },
        { country: 'ET', percent: 40 },
      ],
      varieties: ['sln-795'],
      flavor_notes: ['dark-chocolate', 'almond'],
      url: 'https://example.com/house',
      retrieved: '2026-11-15',
    },
  ],
  cafes: [{ id: 'main', name: 'Main Street', city: 'Bengaluru', country: 'IN' }],
  menu: [
    {
      id: 'flat-white',
      drink: 'flat-white',
      name: 'Flat White',
      beans: ['house'],
      source: 'https://example.com/menu',
      retrieved: '2026-11-15',
    },
  ],
});

const datasetOf = (...companies: CompanyFile[]): Dataset => ({
  taxonomy: loadTaxonomy(),
  companies: companies.map((data) => ({ file: `${data.id}.yaml`, data })),
});

test('the repository data is valid', () => {
  assert.deepEqual(validateDataset(loadDataset()), []);
});

test('a well-formed company passes validation', () => {
  assert.deepEqual(validateDataset(datasetOf(sample())), []);
});

test('instant coffee is rejected', () => {
  const company = sample();
  company.beans[0]!.name = 'Classic Instant Coffee';
  const errors = validateDataset(datasetOf(company));
  assert.ok(errors.some((e) => e.includes('instant')));

  const viaForm = sample();
  (viaForm.beans[0]!.forms as string[]) = ['instant'];
  assert.ok(validateDataset(datasetOf(viaForm)).length > 0);
});

test('unknown references are reported', () => {
  const company = sample();
  company.beans[0]!.flavor_notes = ['not-a-note'];
  company.beans[0]!.process = 'not-a-process';
  company.menu![0]!.beans = ['missing-bean'];
  company.country = 'ZZ';
  const errors = validateDataset(datasetOf(company)).join('\n');
  assert.match(errors, /"not-a-note" is not on the flavour wheel/);
  assert.match(errors, /unknown process/);
  assert.match(errors, /is not listed in this file/);
  assert.match(errors, /unknown country code/);
});

test('cafes are not allowed when has_cafes is false', () => {
  const company = sample();
  company.has_cafes = false;
  assert.ok(validateDataset(datasetOf(company)).some((e) => e.includes('has_cafes')));
});

test('helpers', () => {
  assert.equal(slugify('Finca Liquidámbar, La Paz'), 'finca-liquidambar-la-paz');
  assert.equal(sqlLiteral("O'Neil"), "'O''Neil'");
  assert.equal(sqlLiteral(null), 'NULL');
  assert.equal(sqlLiteral(true), 'TRUE');
});

test('rows are built with stable ids', () => {
  const t = buildTables(datasetOf(sample()));
  assert.equal(t.bean[0]!.id, 'test-roasters/house');
  assert.equal(t.bean[0]!.sold_ground, true);
  assert.equal(t.bean_origin.length, 2);
  assert.equal(t.menu_item[0]!.beans_known, true);
  assert.deepEqual(
    t.country.map((c) => c.code),
    ['ET', 'IN'],
  );
});

test('schema and seed load into PostgreSQL', async () => {
  const tables = buildTables(loadDataset());
  const db = new PGlite();
  await db.exec(readMigrations());
  await db.exec(seedSql(tables));
  for (const name of TABLE_ORDER) {
    const result = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${name}`);
    assert.equal(result.rows[0]!.n, tables[name].length, name);
  }
  // A typical query: which beans taste of a given note family?
  const result = await db.query(
    `SELECT b.name FROM bean b
       JOIN bean_flavor_note bfn ON bfn.bean_id = b.id
       JOIN flavor_note n ON n.id = bfn.flavor_note_id
      WHERE n.family_id = 'nutty-cocoa'`,
  );
  assert.ok(result.rows.length > 0);
  // The uniform profile view counts notes per flavour family.
  const families = await db.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM bean_flavor_family WHERE notes > 0',
  );
  assert.ok(families.rows[0]!.n > 0);
  await db.close();
});

test('schema and seed load into SQLite with the same row counts', async () => {
  const tables = buildTables(loadDataset());
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(readMigrations());
  db.run(seedSql(tables));
  for (const name of TABLE_ORDER) {
    const n = db.exec(`SELECT count(*) FROM ${name}`)[0]!.values[0]![0];
    assert.equal(n, tables[name].length, name);
  }
  assert.equal(db.exec('PRAGMA foreign_key_check;').length, 0);
  db.close();
});

test('the graph mirrors the relational data', () => {
  const tables = buildTables(datasetOf(sample()));
  const graph = buildGraph(tables);
  const count = (label: string) => graph.nodes.filter((n) => n.label === label).length;
  assert.equal(count('Company'), 1);
  assert.equal(count('Bean'), 1);
  assert.equal(count('Origin'), 2);
  const types = new Set(graph.edges.map((e) => e.type));
  for (const type of ['ROASTS', 'SOURCED_FROM', 'HAS_NOTE', 'OPERATES', 'SERVES', 'USES_BEAN']) {
    assert.ok(types.has(type), type);
  }
  // Every edge must point at nodes that exist.
  const keys = new Set(graph.nodes.map((n) => `${n.label}:${n.id}`));
  for (const e of graph.edges) {
    assert.ok(keys.has(`${e.from.label}:${e.from.id}`), `missing ${e.from.label}:${e.from.id}`);
    assert.ok(keys.has(`${e.to.label}:${e.to.id}`), `missing ${e.to.label}:${e.to.id}`);
  }
  assert.match(toCypher(graph), /MERGE \(n:Bean \{id: 'test-roasters\/house'\}\)/);
  assert.match(toCypher(graph), /Owner\\'s House Blend/);
  assert.match(toTurtle(graph), /pcb:usesBean/);
  const jsonld = toJsonLd(graph) as { '@graph': unknown[] };
  assert.equal(jsonld['@graph'].length, graph.nodes.length);
});

test('flavour notes must be flavour-wheel terms', () => {
  const company = sample();
  company.beans[0]!.flavor_notes = ['jaggery', 'creamy'];
  const errors = validateDataset(datasetOf(company)).join('\n');
  assert.match(errors, /"jaggery" is not on the flavour wheel; use "brown-sugar"/);
  assert.match(errors, /"creamy" is not on the flavour wheel; it describes texture/);

  const drink = sample();
  drink.menu![0]!.flavor_notes = ['mango'];
  assert.match(
    validateDataset(datasetOf(drink)).join('\n'),
    /menu item "flat-white": "mango".*use "other-fruit"/,
  );
});

test('sensory attributes use the 1-4 scale and brew methods are drink types', () => {
  const company = sample();
  company.beans[0]!.profile = { sweetness: 5 };
  company.beans[0]!.brew_methods = ['kettle'];
  const errors = validateDataset(datasetOf(company)).join('\n');
  assert.match(errors, /must be <= 4/);

  const ok = sample();
  ok.beans[0]!.profile = { sweetness: 2, acidity: 3, body: 4, bitterness: 1 };
  ok.beans[0]!.serve = 'either';
  ok.beans[0]!.brew_methods = ['espresso', 'moka-pot'];
  assert.deepEqual(validateDataset(datasetOf(ok)), []);
  const t = buildTables(datasetOf(ok));
  assert.equal(t.bean[0]!.body, 4);
  assert.equal(t.bean_brew_method.length, 2);
});

test('taxonomy typos are caught', () => {
  const taxonomy = loadTaxonomy();
  taxonomy.drinkTypes.push({
    id: 'x',
    name: 'X',
    category: 'other',
    description: 'a',
    'served hot.': null,
  } as never);
  assert.ok(validateTaxonomy(taxonomy).some((e) => e.includes('unexpected key')));
});
