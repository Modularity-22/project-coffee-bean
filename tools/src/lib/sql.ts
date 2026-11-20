import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './load.ts';
import { TABLE_ORDER, type Tables, type Value } from './rows.ts';

export function sqlLiteral(value: Value): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/** The schema DDL: every migration, in file-name order. */
export function readMigrations(): string {
  const dir = join(ROOT, 'db/migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
}

/** INSERT statements for the whole dataset, valid in PostgreSQL and SQLite. */
export function seedSql(tables: Tables): string {
  const lines: string[] = [];
  for (const name of TABLE_ORDER) {
    for (const row of tables[name]) {
      const columns = Object.keys(row);
      const values = columns.map((c) => sqlLiteral(row[c] ?? null));
      lines.push(`INSERT INTO ${name} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
    }
  }
  return lines.join('\n') + '\n';
}
