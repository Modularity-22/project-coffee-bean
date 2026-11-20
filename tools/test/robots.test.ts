import assert from 'node:assert/strict';
import { test } from 'node:test';
import { disallowed } from '../src/lib/robots.ts';

test('robots.txt: the wildcard group applies when there is no group for our bot', () => {
  const robots = 'User-agent: *\nDisallow: /cart\nDisallow: /checkout';
  assert.equal(disallowed(robots, '/cart/1'), true);
  assert.equal(disallowed(robots, '/products.json'), false);
});

test('robots.txt: a group naming our bot replaces the wildcard group', () => {
  const robots = 'User-agent: *\nDisallow: /\n\nUser-agent: ProjectCoffeeBeanBot\nDisallow: /admin';
  assert.equal(disallowed(robots, '/products.json'), false);
  assert.equal(disallowed(robots, '/admin'), true);
});

test('robots.txt: consecutive user-agent lines share one group', () => {
  const robots = 'User-agent: Googlebot\nUser-agent: *\nDisallow: /products';
  assert.equal(disallowed(robots, '/products.json'), true);
});

test('robots.txt: the longest rule wins and Allow beats Disallow on a tie', () => {
  const robots = 'User-agent: *\nDisallow: /products\nAllow: /products.json';
  assert.equal(disallowed(robots, '/products.json'), false);
  assert.equal(disallowed(robots, '/products/abc'), true);
});

test('robots.txt: wildcards, end anchors, comments and empty rules', () => {
  const robots = 'User-agent: * # everyone\nDisallow: /*.json$\nDisallow:';
  assert.equal(disallowed(robots, '/products.json'), true);
  assert.equal(disallowed(robots, '/products.json?page=2'), false);
  assert.equal(disallowed('', '/anything'), false);
});
