import { useSQLiteContext, type SQLiteBindValue } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { DATABASE_VERSION } from './db-version';

/**
 * The bundled, read-only catalogue built by `npm run build:sqlite` at the repo
 * root. Its on-device copy is named after a fingerprint of its content and is
 * copied only when that file does not exist yet. Copying over a database that
 * is open (on every start, or from a second browser tab) is what caused the
 * "no such table" and "Error finalizing statement" errors on the web.
 */
export const DATABASE_NAME = `coffee-${DATABASE_VERSION}.db`;
export const DATABASE_ASSET = require('../assets/data/coffee.db');
export const DATABASE_SOURCE = { assetId: DATABASE_ASSET, forceOverwrite: false };

/** Runs a read query and re-runs it when the SQL or parameters change. */
export function useQuery<T>(sql: string, params: SQLiteBindValue[] = []): T[] | null {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<T[] | null>(null);
  const key = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    db.getAllAsync<T>(sql, JSON.parse(key) as SQLiteBindValue[])
      .then((result) => {
        if (active) setRows(result);
      })
      .catch((error) => {
        console.error('Query failed', error);
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [db, sql, key]);

  return rows;
}

export interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  country_code: string;
  country: string;
  website: string;
  description: string | null;
  founded_year: number | null;
  has_cafes: number | null; // null = not known
  cafe_count_approx: number | null;
  verified: number;
  bean_count: number;
}

export interface BeanRow {
  id: string;
  name: string;
  company_id: string;
  company: string;
  roast: string | null;
  process: string | null;
  /** "Name|family-id" pairs joined by ";;", in the roaster's order. */
  notes: string | null;
}

export interface Note {
  name: string;
  family: string;
}

export const parseNotes = (packed: string | null): Note[] =>
  (packed ?? '')
    .split(';;')
    .filter(Boolean)
    .map((pair) => {
      const [name = '', family = ''] = pair.split('|');
      return { name, family };
    });

export const COMPANY_LIST_SQL = `
  SELECT c.id, c.name, c.city, c.country_code, co.name AS country, c.website, c.description,
         c.founded_year, c.has_cafes, c.cafe_count_approx, c.verified,
         (SELECT count(*) FROM bean b WHERE b.company_id = c.id) AS bean_count
    FROM company c JOIN country co ON co.code = c.country_code`;

export const BEAN_LIST_SQL = `
  SELECT b.id, b.name, b.company_id, c.name AS company, r.name AS roast, p.name AS process,
         (SELECT group_concat(pair, ';;') FROM (
            SELECT n.name || '|' || n.family_id AS pair FROM bean_flavor_note bfn
              JOIN flavor_note n ON n.id = bfn.flavor_note_id
             WHERE bfn.bean_id = b.id ORDER BY bfn.position)) AS notes
    FROM bean b
    JOIN company c ON c.id = b.company_id
    LEFT JOIN roast_level r ON r.id = b.roast_level_id
    LEFT JOIN process p ON p.id = b.process_id`;

/** Builds "WHERE a AND b" from the conditions that are switched on. */
export function where(
  conditions: ([sql: string, params: SQLiteBindValue[]] | false | '' | null | undefined)[],
) {
  const active = conditions.filter(Boolean) as [string, SQLiteBindValue[]][];
  return {
    sql: active.length ? `WHERE ${active.map(([sql]) => `(${sql})`).join(' AND ')}` : '',
    params: active.flatMap(([, params]) => params),
  };
}
