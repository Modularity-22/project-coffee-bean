// Prints dataset coverage as a Markdown table (used for docs/roadmap.md).
import { loadDataset } from './lib/load.ts';
import { countryName } from './lib/validate.ts';

const { companies } = loadDataset();
const byCountry = new Map<string, { companies: number; beans: number; menu: number }>();
for (const { data } of companies) {
  const row = byCountry.get(data.country) ?? { companies: 0, beans: 0, menu: 0 };
  row.companies += 1;
  row.beans += data.beans.length;
  row.menu += data.menu?.length ?? 0;
  byCountry.set(data.country, row);
}

console.log('| Country | Companies | Beans | Menu items |');
console.log('| --- | ---: | ---: | ---: |');
let total = { companies: 0, beans: 0, menu: 0 };
for (const [code, row] of [...byCountry].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`| ${countryName(code) ?? code} | ${row.companies} | ${row.beans} | ${row.menu} |`);
  total = {
    companies: total.companies + row.companies,
    beans: total.beans + row.beans,
    menu: total.menu + row.menu,
  };
}
console.log(`| **Total** | **${total.companies}** | **${total.beans}** | **${total.menu}** |`);
