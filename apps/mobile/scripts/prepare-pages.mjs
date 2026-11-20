// Runs after `expo export -p web` to make dist/ ready for GitHub Pages.
//
// - Loads coi-serviceworker.js first thing in the page (see that file for why).
// - Copies index.html to 404.html, so a deep link such as /bean?id=... still
//   opens the app: Pages serves 404.html for any path it has no file for.
//
// Deploying from GitHub Actions skips Jekyll, so Expo's _expo/ folder is served
// as it is and no .nojekyll file is needed.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
const index = join(dist, 'index.html');

if (!existsSync(join(dist, 'coi-serviceworker.js'))) {
  throw new Error('dist/coi-serviceworker.js is missing: was public/ copied by the export?');
}

const html = readFileSync(index, 'utf8');
const tag = `<script src="${base}/coi-serviceworker.js"></script>`;
if (!html.includes(tag)) writeFileSync(index, html.replace('<head>', `<head>\n    ${tag}`));

copyFileSync(index, join(dist, '404.html'));
console.log(`Prepared dist/ for GitHub Pages at "${base || '/'}"`);
