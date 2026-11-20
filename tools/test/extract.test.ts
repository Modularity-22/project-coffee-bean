import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  altitude,
  extractBean,
  flavorNotes,
  isRoastedCoffee,
  labelledFields,
  processId,
  roastLevel,
  varieties,
  type RawProduct,
} from '../src/lib/extract.ts';
import {
  FlavourVocabulary,
  brewMethodsFromText,
  profileFromText,
  serveFromText,
  toFourPoint,
} from '../src/lib/flavour.ts';
import { loadTaxonomy } from '../src/lib/load.ts';

const taxonomy = loadTaxonomy();

const product = (over: Partial<RawProduct>): RawProduct => ({
  title: 'Salawara Estate - Mosto Honey Sun Dried',
  handle: 'salawara-estate-mosto-hsd',
  url: 'https://example.com/products/salawara-estate-mosto-hsd',
  body: '<p>Tastes Like - Muscat Grape, Soft Pear and Lingering Finish Roasting Profile - Filter profile (Light Roast) Process - Mosto Honey Sun Dried Varietal - SLN 795 Altitude - 1100 MASL Region - Belur, Karnataka, India</p>',
  type: 'Coffee',
  tags: ['coffee'],
  options: ['WHOLE BEANS', 'MOKA POT', '250g'],
  ...over,
});

test('labelled fields are split at the next label', () => {
  const f = labelledFields(
    'Tasting notes: Berries, Grapefruit & Honey Roast: Light Process: Washed. More text here.',
  );
  assert.equal(f.notes, 'Berries, Grapefruit & Honey');
  assert.equal(f.roast, 'Light');
  assert.equal(f.process, 'Washed');
});

test('roast levels', () => {
  assert.equal(roastLevel('Light to Medium Roast'), 'medium-light');
  assert.equal(roastLevel('Medium-Dark'), 'medium-dark');
  assert.equal(roastLevel('Vienna Roast'), 'dark');
  assert.equal(roastLevel('Omni roast'), 'omni');
  assert.equal(roastLevel('Dark, Light, Medium'), undefined); // a list of options
});

test('processes', () => {
  assert.equal(processId('Anaerobic Natural'), 'anaerobic-natural');
  assert.equal(processId('Hibiscus Co-Ferment'), 'experimental');
  assert.equal(processId('Monsooned Malabar'), 'monsooned');
  assert.equal(processId('Yellow Honey'), 'honey');
  assert.equal(processId('Fully washed'), 'washed');
  assert.equal(processId('Sugarcane Decaffeinated decaf'), 'decaf-sugarcane');
  assert.equal(processId('plain text'), undefined);
});

test('altitude is converted to metres and sanity-checked', () => {
  assert.deepEqual(altitude('1,400-1,450 MASL'), { min: 1400, max: 1450 });
  assert.deepEqual(altitude('4500 ft'), { min: 1372, max: 1372 });
  assert.equal(altitude('250 g'), undefined);
  assert.equal(altitude('90000 m'), undefined);
});

test('varieties and flavour notes map onto the taxonomy', () => {
  assert.deepEqual(varieties('SL 795 & Chandragiri', taxonomy).sort(), ['chandragiri', 'sln-795']);
  assert.deepEqual(varieties('100% Arabica', taxonomy), []);
  assert.deepEqual(flavorNotes('Dark Chocolate, roasted almonds & treacle', taxonomy), [
    'dark-chocolate',
    'almond',
    'molasses',
  ]);
});

test('non-coffee and instant products are filtered out', () => {
  assert.equal(isRoastedCoffee(product({})), true);
  for (const title of [
    'Classic Instant Coffee',
    'AeroPress Coffee Maker',
    'Cold Brew Bottles',
    'Green Coffee 250g',
  ]) {
    assert.equal(isRoastedCoffee(product({ title })), false, title);
  }
});

test('a product becomes a draft bean', () => {
  const bean = extractBean(product({}), taxonomy, '2026-11-16');
  assert.equal(bean.id, 'salawara-estate-mosto-hsd');
  assert.deepEqual(bean.forms, ['whole_bean', 'ground']);
  assert.equal(bean.roast_level, 'light');
  assert.equal(bean.process, 'honey');
  assert.deepEqual(bean.varieties, ['sln-795']);
  assert.deepEqual(bean.altitude_m, { min: 1100, max: 1100 });
  assert.deepEqual(bean.flavor_notes, ['grape', 'pear']);
  assert.equal(bean.origins?.[0]?.country, 'IN');
  assert.equal(bean.origins?.[0]?.region, 'Belur, Karnataka');
  assert.equal(bean.origins?.[0]?.producer, 'Salawara Estate');
});

test('the vocabulary reads roaster phrases onto the wheel', () => {
  const vocab = new FlavourVocabulary(taxonomy);
  assert.deepEqual(
    vocab.fromText('rich dark chocolate, sweet prune and zesty orange marmalade').ids,
    ['dark-chocolate', 'prune', 'orange'],
  );
  assert.deepEqual(vocab.fromText('Jaggery, raw mango & cardamom').ids, [
    'brown-sugar',
    'other-fruit',
    'brown-spice',
  ]);
  const r = vocab.fromText('creamy, umeboshi');
  assert.deepEqual(r.ids, []);
  assert.deepEqual(r.unknown, ['umeboshi']);
  // Mapped broad terms survive next to narrow ones: apricot (other fruit) and coconut.
  assert.deepEqual(
    vocab.fromText('Apricot, brown sugar, toasted coconut. Yellow honey process.').ids,
    ['other-fruit', 'brown-sugar', 'coconut'],
  );
  assert.deepEqual(vocab.fromText('Figs, mulberries and caramelised sweetness').ids, [
    'dried-fruit',
    'berry',
    'caramelized',
  ]);
});

test('published ratings, serving and brew methods', () => {
  const s = taxonomy.sensory;
  assert.deepEqual(
    profileFromText('SWEETNESS MEDIUM BODY MEDIUM-HIGH acidity-medium bitterness-low', s),
    {
      sweetness: 2,
      body: 3,
      acidity: 2,
      bitterness: 1,
    },
  );
  assert.deepEqual(profileFromText('Acidity Level - Medium Body - High', s), {
    acidity: 2,
    body: 4,
  });
  assert.deepEqual(profileFromText('a balanced, low acidity coffee', s), { acidity: 1 });
  // On a full product page, prose like this may belong to another product.
  assert.deepEqual(
    profileFromText('a balanced, low acidity coffee', s, { labelledOnly: true }),
    {},
  );
  assert.equal(serveFromText('HAVE IT WITH MILK/BLACK'), 'either');
  assert.equal(serveFromText('Best enjoyed with milk.'), 'milk');
  assert.deepEqual(
    brewMethodsFromText(
      'It can best be enjoyed when brewed as an espresso or using a Moka Pot or French Press.',
    ),
    ['espresso', 'moka-pot', 'french-press'],
  );
  // A list of grind sizes on sale is not a recommendation.
  assert.deepEqual(brewMethodsFromText('Grind: Espresso / French Press / Pour Over'), []);
});

test('process sentences are not read as tasting notes', () => {
  const vocab = new FlavourVocabulary(taxonomy);
  assert.deepEqual(
    vocab.fromText('Honey, lychee, rose. Wet-hulled, lychee co-fermented and infused.').ids,
    ['honey', 'other-fruit', 'rose'],
  );
  assert.deepEqual(vocab.fromText('Honey process coffee aged in an oak barrel.').ids, []);
  // ...unless the sentence also announces notes.
  assert.deepEqual(vocab.fromText('A washed coffee with notes of lemon.').ids, ['lemon']);
  // Adjectives are not notes of their own.
  assert.deepEqual(vocab.fromText('roasted malt, sweet spices, fresh plum').ids, [
    'malt',
    'spices',
    'other-fruit',
  ]);
  assert.deepEqual(vocab.fromText('Orange blossoms').ids, ['floral']);
});

test('numeric ratings on any scale become 1-4', () => {
  const s = taxonomy.sensory;
  assert.equal(toFourPoint(3, 5), 3);
  assert.equal(toFourPoint(1, 5), 1);
  assert.equal(toFourPoint(12, 15), 4);
  assert.deepEqual(profileFromText('Acidity: 3/5, Body 7 out of 10, Sweetness 5/15', s), {
    acidity: 3,
    body: 3,
    sweetness: 2,
  });
});
