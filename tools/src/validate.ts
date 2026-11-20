import { loadDataset } from './lib/load.ts';
import { validateDataset } from './lib/validate.ts';

const dataset = loadDataset();
const errors = validateDataset(dataset);

if (errors.length > 0) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}

const beans = dataset.companies.reduce((n, c) => n + c.data.beans.length, 0);
console.log(`✓ ${dataset.companies.length} companies and ${beans} beans are valid.`);
