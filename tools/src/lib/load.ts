import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { CompanyFile, Dataset, Taxonomy } from '../../../packages/schema/types.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const DATA_DIR = join(ROOT, 'data');
export const DIST_DIR = join(ROOT, 'dist');

function readYaml<T>(path: string): T {
  return parse(readFileSync(path, 'utf8')) as T;
}

export function loadTaxonomy(dataDir = DATA_DIR): Taxonomy {
  const dir = join(dataDir, 'taxonomy');
  return {
    flavorWheel: readYaml(join(dir, 'flavor-wheel.yaml')),
    flavorAliases: readYaml(join(dir, 'flavor-aliases.yaml')),
    sensory: readYaml(join(dir, 'sensory-attributes.yaml')),
    drinkTypes: readYaml(join(dir, 'drink-types.yaml')),
    processes: readYaml(join(dir, 'processes.yaml')),
    roastLevels: readYaml(join(dir, 'roast-levels.yaml')),
    varieties: readYaml(join(dir, 'varieties.yaml')),
  };
}

export function loadDataset(dataDir = DATA_DIR): Dataset {
  const companiesDir = join(dataDir, 'companies');
  const files = readdirSync(companiesDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort();
  return {
    taxonomy: loadTaxonomy(dataDir),
    companies: files.map((file) => ({
      file,
      data: readYaml<CompanyFile>(join(companiesDir, file)),
    })),
  };
}
