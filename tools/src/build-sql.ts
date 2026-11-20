// Writes dist/postgres/schema.sql and dist/postgres/seed.sql.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR, loadDataset } from './lib/load.ts';
import { buildTables } from './lib/rows.ts';
import { readMigrations, seedSql } from './lib/sql.ts';

const outDir = join(DIST_DIR, 'postgres');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'schema.sql'), readMigrations());
writeFileSync(join(outDir, 'seed.sql'), seedSql(buildTables(loadDataset())));
console.log(`✓ wrote ${join('dist', 'postgres', 'schema.sql')} and seed.sql`);
