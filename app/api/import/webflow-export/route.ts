import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
const MAX_BYTES = 25 * 1024 * 1024;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function items(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value.items)) return [];
  return value.items.filter(isRecord);
}
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Upload a .zip website export.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'ZIP exceeds 25 MB limit.' }, { status: 413 });
    const zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true });
    const read = async (path: string): Promise<unknown> => {
      const entry = zip.file(path);
      if (!entry) return null;
      if (entry._data.uncompressedSize > 5_000_000) throw new Error('Metadata file too large.');
      return JSON.parse(await entry.async('string')) as unknown;
    };
    const [site, pagesData, collectionsData] = await Promise.all([
      read('data/site.json'), read('data/pages.json'), read('data/collections.json'),
    ]);
    if (!isRecord(site) || !isRecord(pagesData) || !isRecord(collectionsData)) {
      return NextResponse.json({ error: 'Missing expected Webflow export metadata.' }, { status: 422 });
    }
    const pages = items(pagesData).map(p => ({
      id: String(p.id ?? ''), title: String(p.title ?? ''), slug: String(p.slug ?? ''),
      path: String(p.publishedPath ?? ''), seoTitle: isRecord(p.seo) ? String(p.seo.title ?? '') : '',
      seoDescription: isRecord(p.seo) ? String(p.seo.description ?? '') : '',
    }));
    const collections = items(collectionsData).map(c => ({
      id: String(c.id ?? ''), name: String(c.displayName ?? ''), slug: String(c.slug ?? ''),
    }));
    const assets = Object.keys(zip.files).filter(p => p.startsWith('assets/') && !zip.files[p].dir);
    return NextResponse.json({
      site: { name: String(site.displayName ?? ''), shortName: String(site.shortName ?? '') },
      summary: { pages: pages.length, collections: collections.length, assets: assets.length },
      pages, collections, assets: assets.slice(0, 50),
      warnings: [
        'Preview only: no database records have been created.',
        'Webflow page metadata does not include editable page DOM or CMS item records.',
        'Custom scripts and integrations are not executed or imported.',
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not read export.' }, { status: 400 });
  }
}
