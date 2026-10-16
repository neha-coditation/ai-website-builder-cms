import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/prisma';

const globalDesignSchema = z.object({
  logoText: z.string().max(120).default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3064fe'),
  bodyTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#131827'),
  pageBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  fontFamily: z.enum(['Inter','Arial','Georgia','system-ui']).default('Inter'),
  headerBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  headerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#131827'),
  footerText: z.string().max(300).default(''),
  footerBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),
  footerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#697386'),
});
const siteConfigSchema=z.object({
 seo:z.object({
  titleSuffix:z.string().max(100).default(''),
  defaultDescription:z.string().max(500).default(''),
  robotsTxt:z.string().max(10000).default('User-agent: *\\nAllow: /'),
  canonicalBaseUrl:z.union([z.literal(''),z.string().url().max(2000)]).default(''),
  defaultOgImage:z.union([z.literal(''),z.string().url().max(2000)]).default(''),
  noindex:z.boolean().default(false),
  redirects:z.array(z.object({from:z.string().regex(/^\/[a-z0-9/-]*$/).max(300),to:z.string().regex(/^\/[a-z0-9/-]*$/).max(300),permanent:z.boolean().default(true)}).refine(v=>v.from!==v.to)).max(200).default([]),
 }).default({}),
 forms:z.object({
  successMessage:z.string().max(500).default('Thanks! Your submission has been received.'),
  notificationEmail:z.union([z.literal(''),z.string().email().max(254)]).default(''),
  honeypotEnabled:z.boolean().default(true),
  retentionDays:z.number().int().min(1).max(3650).default(90),
 }).default({}),
 advanced:z.object({customHeadCode:z.string().max(20000).default(''),customFooterCode:z.string().max(20000).default('')}).default({}),
}).passthrough();
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500),
  defaultTitle: z.string().max(120),
  faviconUrl: z.union([z.literal(''),z.string().url().max(2000)]),
  globalDesign: globalDesignSchema,
  siteConfig:siteConfigSchema.optional(),
});
type Context = { params: Promise<{ siteId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true, slug: true, description: true, defaultTitle: true, faviconUrl: true, globalDesign: true, siteConfig:true } });
  if (!site) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  return NextResponse.json(site);
}
export async function PATCH(request: Request, { params }: Context) {
  const { siteId } = await params;
  const parsed = schema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const redirects=parsed.data.siteConfig?.seo.redirects||[];
  const destinations=new Map<string,string>();
  for(const rule of redirects){
    if(destinations.has(rule.from))return NextResponse.json({error:'Duplicate redirect source: '+rule.from},{status:400});
    destinations.set(rule.from,rule.to);
  }
  for(const start of destinations.keys()){
    const visited=new Set<string>();
    let current=start;
    while(destinations.has(current)){
      if(visited.has(current))return NextResponse.json({error:'Redirect loop detected starting at '+start},{status:400});
      visited.add(current);
      current=destinations.get(current)!;
    }
  }
  const exists = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, globalDesign: true } });
  if (!exists) return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  return NextResponse.json(await prisma.site.update({ where: { id: siteId }, data: { ...parsed.data, siteConfig:parsed.data.siteConfig as Prisma.InputJsonValue || undefined, globalDesign: { ...(exists.globalDesign && typeof exists.globalDesign==='object' && !Array.isArray(exists.globalDesign) ? exists.globalDesign as Record<string,unknown> : {}), ...parsed.data.globalDesign } as Prisma.InputJsonValue } }));
}
