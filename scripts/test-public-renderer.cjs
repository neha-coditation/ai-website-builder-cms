const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app/sites/[siteSlug]/[[...path]]/page.tsx'), 'utf8');

test('dropdown renders configured children rather than placeholder', () => {
  assert.match(source, /if\(block\.type==='dropdown'\)\{/);
  assert.match(source, /children=blocks\.filter\(child=>child\.parentId===block\.id\)/);
  assert.match(source, /children\.map\(child=><Element/);
  assert.doesNotMatch(source, /Dropdown content/);
});

test('nested dropdown children are not duplicated at the root', () => {
  assert.match(source, /b\.type==='container'\|\|b\.type==='dropdown'/);
  assert.match(source, /!b\.parentId\|\|!ids\.has\(b\.parentId\)/);
});

test('recursive render guards cycles and supports CMS list entries', () => {
  assert.match(source, /ancestors\.includes\(block\.id\)/);
  assert.match(source, /if\(block\.type==='cms-list'\)/);
  assert.match(source, /status:'published'/);
  assert.match(source, /siteId:site\.id/);
});
