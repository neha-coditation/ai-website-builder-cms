import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteSlug: string; collectionSlug: string; entrySlug: string }> }
) {
  const { siteSlug, collectionSlug, entrySlug } = await params;
  const entry = await prisma.cmsEntry.findFirst({
    where: {
      slug: entrySlug,
      status: 'published',
      collection: { slug: collectionSlug, site: { slug: siteSlug } },
    },
    select: { id: true, slug: true, data: true, updatedAt: true },
  });
  if (!entry) return NextResponse.json({ error: 'Published entry not found' }, { status: 404 });
  return NextResponse.json(entry);
}
