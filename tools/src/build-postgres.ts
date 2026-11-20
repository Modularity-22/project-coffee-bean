// Loads the dataset into a PostgreSQL database.
//   DATABASE_URL=postgres://coffee:coffee@localhost:5432/coffee npm run build:postgres
// The target schema is dropped and rebuilt, so point this at a database that
// holds nothing but Project Coffee Bean data.
import pg from 'pg';
import { loadDataset } from './lib/load.ts';
import { TABLE_ORDER, buildTables } from './lib/rows.ts';
import { readMigrations, seedSql } from './lib/sql.ts';
import { validateDataset } from './lib/validate.ts';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL, e.g. postgres://coffee:coffee@localhost:5432/coffee');
  process.exit(1);
}

const dataset = loadDataset();
const errors = validateDataset(dataset);
if (errors.length > 0) {
  console.error(`Data is invalid (${errors.length} problems). Run "npm run validate".`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('BEGIN');
  for (const table of [...TABLE_ORDER].reverse()) {
    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
  await client.query(readMigrations());
  await client.query(seedSql(buildTables(dataset)));
  await client.query('COMMIT');
  const { rows } = await client.query('SELECT count(*)::int AS n FROM company');
  console.log(`✓ loaded ${rows[0].n} companies into PostgreSQL`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
