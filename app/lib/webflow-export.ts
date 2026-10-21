// Credentials are used only in headers to this fixed API origin, never persisted.
export async function webflowExport(siteId: string, token: string, deadline: number) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(siteId) || token.length < 10 || token.length > 2000) throw Error('Provide a valid Webflow site ID and token.');
  const notes: string[] = [];
  let calls = 0, bytes = 0;
  async function get(path: string) {
    if (++calls > 60 || Date.now() >= deadline) throw Error('Webflow export request/time limit reached.');
    const r = await fetch('https://api.webflow.com/v2' + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline-Date.now()))) });
    if (!r.ok) throw Error(`Webflow HTTP ${r.status}; check read scopes or rate limits.`);
    const reader = r.body?.getReader();
    if (!reader) throw Error('Empty Webflow response.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length; bytes += part.value.length;
      if (size > 4_000_000 || bytes > 10_000_000) { await reader.cancel(); throw Error('Webflow response byte limit reached.'); }
      chunks.push(part.value);
    }
    const text = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(text);
  }
  async function list(path: string, key: string, cap: number): Promise<Record<string, unknown>[]> {
    const items: Record<string, unknown>[] = [];
    try {
      while (items.length < cap) {
        const data = await get(`${path}?limit=100&offset=${items.length}`);
        const batch = Array.isArray(data[key]) ? data[key] : [];
        items.push(...batch.slice(0, cap-items.length));
        if (!batch.length || items.length >= (data.pagination?.total ?? Infinity) || batch.length < 100) return items;
      }
      notes.push(`${key}: capped at ${cap}; additional records may be omitted.`);
    } catch (e) { notes.push(`${key}: ${e instanceof Error ? e.message : 'unavailable'}`); }
    return items;
  }
  const site = await get(`/sites/${siteId}`);
  const pages = await list(`/sites/${siteId}/pages`, 'pages', 200);
  const collections = await list(`/sites/${siteId}/collections`, 'collections', 20);
  const cms = [];
  for (const collection of collections) {
    const id = String(collection.id);
    try { cms.push({ schema: await get(`/collections/${encodeURIComponent(id)}`), items: await list(`/collections/${encodeURIComponent(id)}/items`, 'items', 500) }); }
    catch { notes.push(`Collection ${id}: unavailable within permissions or limits.`); }
  }
  return { site, pages, cms, notes };
}
