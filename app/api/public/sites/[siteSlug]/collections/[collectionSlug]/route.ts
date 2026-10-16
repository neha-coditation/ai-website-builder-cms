import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Public read-only delivery endpoint. Draft entries and collection field
// definitions are deliberately not exposed.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string; collectionSlug: string }> }
) {
  const { siteSlug, collectionSlug } = await params;
  const page = Number(request.nextUrl.searchParams.get('page') || '1');
  const limit = Number(request.nextUrl.searchParams.get('limit') || '20');
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: 'page must be positive and limit must be 1–100' }, { status: 400 });
  }
  const collection = await prisma.cmsCollection.findFirst({
    where: { slug: collectionSlug, site: { slug: siteSlug } },
    select: { id: true, name: true, slug: true },
  });
  if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

  const where = { collectionId: collection.id, status: 'published' };
  const [total, entries] = await Promise.all([
    prisma.cmsEntry.count({ where }),
    prisma.cmsEntry.findMany({
      where,
      select: { id: true, slug: true, data: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return NextResponse.json({
    collection: { name: collection.name, slug: collection.slug },
    entries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
