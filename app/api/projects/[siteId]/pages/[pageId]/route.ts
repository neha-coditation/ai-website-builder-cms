import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getPrisma } from '../../../../../../lib/prisma';

const style = z.object({ color: z.string().optional(), background: z.string().optional(), fontSize: z.number().finite().min(0).max(500).optional(), padding: z.number().finite().min(0).max(1000).optional(), radius: z.number().finite().min(0).max(1000).optional(), align: z.enum(['left','center','right']).optional(), width: z.enum(['auto','full','half']).optional(), maxWidth: z.number().finite().min(100).max(2000).optional(), marginTop: z.number().finite().min(0).max(500).optional(), marginBottom: z.number().finite().min(0).max(500).optional() }).optional();
const breakpointOverrides=z.object({tablet:style,mobile:style}).optional();
const block = z.object({ id: z.string().min(1).max(120), type: z.enum(['heading','paragraph','button','image','cms-list','container','form','search','dropdown','tabs','input','textarea','checkbox','select','divider','spacer','video','embed','form','search','dropdown','tabs','input','textarea','checkbox','select','divider','spacer','video','embed']), text: z.string().max(100000), tabContents: z.array(z.string().max(100000)).max(100).optional(), dropdownOpen: z.boolean().optional(), breakpointOverrides, collectionId: z.string().max(120).optional(), displayField: z.string().max(120).optional(), htmlId: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]*$/).max(120).optional(), classNames: z.string().regex(/^[A-Za-z0-9_\- ]*$/).max(500).optional(), alt: z.string().max(500).optional(), href: z.union([z.literal(''),z.string().max(2000)]).optional(), parentId: z.string().max(120).optional(), componentId: z.string().max(120).optional(), componentInstanceId: z.string().max(120).optional(), componentSourceId: z.string().max(120).optional(), layout: z.enum(['column','row','grid']).optional(), gap: z.number().finite().min(0).max(200).optional(), columns: z.number().int().min(1).max(6).optional(), style });
const seoSchema = z.object({
  title: z.string().max(70).default(''),
  description: z.string().max(320).default(''),
  noindex: z.boolean().default(false),
  ogImage: z.union([z.literal(''), z.string().url().max(2000)]).default(''),
});
const schema = z.object({ content: z.object({ name: z.string().trim().min(1).max(120), blocks: z.array(block).max(1000), seo: seoSchema.optional() }) });
type Context = { params: Promise<{ siteId: string; pageId: string }> };
const metadataSchema=z.object({title:z.string().trim().min(1).max(120),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)});
export async function PATCH(request:Request,{params}:Context){
  const {siteId,pageId}=await params;
  const parsed=metadataSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Enter a page name and a URL using lowercase letters, numbers and hyphens.'},{status:400});
  const prisma=getPrisma();
  const page=await prisma.page.findFirst({where:{id:pageId,siteId},select:{slug:true}});
  if(!page)return NextResponse.json({error:'Page not found'},{status:404});
  if(page.slug==='home'&&parsed.data.slug!=='home')return NextResponse.json({error:'The homepage URL cannot be changed.'},{status:400});
  try{
    const saved=await prisma.page.update({where:{id:pageId},data:parsed.data});
    return NextResponse.json(saved);
  }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return NextResponse.json({error:'This page URL is already in use.'},{status:409});
    throw error;
  }
}
export async function POST(_request:Request,{params}:Context){
  const {siteId,pageId}=await params;
  const prisma=getPrisma();
  const page=await prisma.page.findFirst({where:{id:pageId,siteId}});
  if(!page)return NextResponse.json({error:'Page not found'},{status:404});
  // A random suffix avoids races between simultaneous duplicate requests.
  const slug=page.slug.slice(0,82)+'-copy-'+crypto.randomUUID().slice(0,8);
  const copy=await prisma.page.create({data:{siteId,title:(page.title+' copy').slice(0,120),slug,content:page.content as Prisma.InputJsonValue}});
  return NextResponse.json(copy,{status:201});
}
export async function PUT(request: Request, { params }: Context) {
  const prisma = getPrisma();
  const { siteId, pageId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const page = await prisma.page.findFirst({ where: { id: pageId, siteId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  const saved = await prisma.page.update({ where: { id: pageId }, data: { content: parsed.data.content as Prisma.InputJsonValue }, select: { id: true, updatedAt: true } });
  return NextResponse.json({ page: saved });
}
export async function DELETE(_request: Request, { params }: Context) {
  const prisma = getPrisma();
  const { siteId, pageId } = await params;
  const page = await prisma.page.findFirst({ where: { id: pageId, siteId }, select: { id: true, slug: true } });
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  if (page.slug === 'home') return NextResponse.json({ error: 'The home page cannot be deleted' }, { status: 400 });
  await prisma.page.delete({ where: { id: pageId } });
  return NextResponse.json({ deleted: true });
}
