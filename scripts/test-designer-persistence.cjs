const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual route handlers with an isolated database double.
function loadRoute(file, prisma, getPrisma = () => prisma) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    crypto: require('node:crypto').webcrypto,
    require: id => id.endsWith('/lib/prisma') ? { getPrisma } : require(id),
  }, { filename: file });
  return exports;
}
const content = {
  name: 'Test website',
  blocks: [{ id: 'tabs-1', type: 'tabs', text: 'Overview|Details', tabContents: ['Saved overview', 'Saved details'] }],
  seo: { title: 'Test title', description: 'Test description', noindex: true, ogImage: '' },
};
const request = body => new Request('http://localhost/api/test', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('API JSON reader handles empty, HTML and unauthenticated responses safely', async () => {
  const { readJsonResponse } = loadRoute('lib/read-json-response.ts', null);
  await assert.rejects(readJsonResponse(new Response('', {status:502})), /empty response \(HTTP 502\)/);
  await assert.rejects(readJsonResponse(new Response('<html>Error</html>', {status:500})), /invalid response \(HTTP 500\)/);
  await assert.rejects(readJsonResponse(new Response('', {status:401})), /session expired/);
  await assert.rejects(readJsonResponse(new Response('{"error":"Page URL already exists"}', {status:409})), /Page URL already exists/);
  assert.equal((await readJsonResponse(new Response('{"ok":true}'))).ok, true);
});

test('concurrent reusable class requests get independent Prisma clients', async () => {
  let clients = 0;
  const route = loadRoute('app/api/projects/[siteId]/classes/route.ts', null, () => {
    const clientId = ++clients;
    return { site: { findUnique: async () => ({ globalDesign: { classes: { card: { padding: clientId } } } }) } };
  });
  const responses = await Promise.all([1, 2, 3].map(() => route.GET(
    new Request('http://localhost/api/classes'), { params: Promise.resolve({ siteId: 'site' }) },
  )));
  const values = await Promise.all(responses.map(response => response.json()));
  assert.equal(clients, 3);
  assert.deepEqual(values.map(value => value.card.padding), [1, 2, 3]);
});

test('page save preserves tab contents and SEO', async () => {
  let saved;
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {
    page: { findFirst: async () => ({ id: 'page' }), update: async args => { saved = args.data.content; return { id: 'page' }; } },
  });
  const response = await route.PUT(request({ content }), { params: Promise.resolve({ siteId: 'site', pageId: 'page' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), content);
});

test('homepage save preserves tab contents and SEO', async () => {
  let saved;
  const route = loadRoute('app/api/projects/[siteId]/home/route.ts', {
    site: { findUnique: async () => ({ id: 'site' }) },
    page: { upsert: async args => { saved = args.update.content; return { id: 'home' }; } },
  });
  const response = await route.PUT(request(content), { params: Promise.resolve({ siteId: 'site' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), content);
});

test('oversized tab content is rejected before database access', async () => {
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {});
  const response = await route.PUT(request({ content: { ...content, blocks: [{ ...content.blocks[0], tabContents: ['x'.repeat(100001)] }] } }), {
    params: Promise.resolve({ siteId: 'site', pageId: 'page' }),
  });
  assert.equal(response.status, 400);
});

test('page save refuses a page outside the requested site', async () => {
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {
    page: { findFirst: async args => { assert.equal(args.where.siteId, 'other-site'); return null; } },
  });
  const response = await route.PUT(request({ content }), { params: Promise.resolve({ siteId: 'other-site', pageId: 'page' }) });
  assert.equal(response.status, 404);
});

test('page metadata updates title and URL within the selected site', async () => {
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {
    page: {
      findFirst: async args => { assert.equal(args.where.siteId, 'site'); return { slug: 'about' }; },
      update: async args => ({ id: 'page', ...args.data }),
    },
  });
  const response = await route.PATCH(request({ title: 'About us', slug: 'about-us' }), { params: Promise.resolve({ siteId: 'site', pageId: 'page' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).slug, 'about-us');
});

test('homepage URL is protected and invalid slugs are rejected', async () => {
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {
    page: { findFirst: async () => ({ slug: 'home' }) },
  });
  const context = { params: Promise.resolve({ siteId: 'site', pageId: 'home' }) };
  assert.equal((await route.PATCH(request({ title: 'Home', slug: 'changed' }), context)).status, 400);
  assert.equal((await route.PATCH(request({ title: 'Home', slug: '../bad' }), context)).status, 400);
});

test('duplicating a page preserves all saved content and creates a distinct URL', async () => {
  let created;
  const route = loadRoute('app/api/projects/[siteId]/pages/[pageId]/route.ts', {
    page: {
      findFirst: async args => { assert.equal(args.where.siteId, 'site'); return { title: 'About', slug: 'about', content }; },
      create: async args => { created = args.data; return { id: 'copy', ...args.data }; },
    },
  });
  const response = await route.POST(request({}), { params: Promise.resolve({ siteId: 'site', pageId: 'page' }) });
  assert.equal(response.status, 201);
  assert.equal(created.title, 'About copy');
  assert.match(created.slug, /^about-copy-[a-f0-9]{8}$/);
  assert.equal(created.siteId, 'site');
  assert.deepEqual(created.content, content);
});
