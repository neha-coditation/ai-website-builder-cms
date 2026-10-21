import { NextResponse } from 'next/server';
import { getPrisma } from '../../../../../lib/prisma';
type Context={params:Promise<{siteId:string}>};
const obj=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function GET(_request:Request,{params}:Context){
  const prisma = getPrisma();
 const {siteId}=await params;
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true,slug:true,defaultTitle:true,siteConfig:true,pages:{select:{id:true,slug:true,title:true,content:true}}}});
 if(!site)return NextResponse.json({error:'Website not found'},{status:404});
 const seo=obj(obj(site.siteConfig).seo);
 const redirects=Array.isArray(seo.redirects)?seo.redirects.map(obj):[];
 const issues:{severity:'warning'|'error';page:string;code:string;message:string}[]=[];
 const pages=site.pages.map(page=>{
  const content=obj(page.content);
  const blocks=Array.isArray(content.blocks)?content.blocks.map(obj):[];
  const pageSeo=obj(content.seo);
  const title=String(pageSeo.title||page.title||site.defaultTitle||'').trim();
  const description=String(pageSeo.description||seo.defaultDescription||'').trim();
  const pagePath=page.slug==='home'?'/':'/'+page.slug;
  if(!title)issues.push({severity:'error',page:pagePath,code:'missing-title',message:'SEO title is missing'});
  else if(title.length>60)issues.push({severity:'warning',page:pagePath,code:'long-title',message:'SEO title exceeds 60 characters'});
  if(!description)issues.push({severity:'warning',page:pagePath,code:'missing-description',message:'Meta description is missing'});
  else if(description.length>160)issues.push({severity:'warning',page:pagePath,code:'long-description',message:'Meta description exceeds 160 characters'});
  if(!blocks.some(b=>b.type==='heading' && String(b.text||'').trim()))issues.push({severity:'warning',page:pagePath,code:'missing-heading',message:'No heading block found'});
  return {id:page.id,path:pagePath,title,description};
 });
 if(!seo.canonicalBaseUrl)issues.push({severity:'warning',page:'site',code:'missing-canonical-base',message:'Canonical base URL is not configured'});
 const sources=new Set<string>();
 for(const rule of redirects){const from=String(rule.from||'');if(sources.has(from))issues.push({severity:'error',page:from,code:'duplicate-redirect',message:'Duplicate redirect source'});sources.add(from);}
 return NextResponse.json({siteId,slug:site.slug,pages,issues,summary:{pages:pages.length,errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length},previewOnly:true},{headers:{'Cache-Control':'private, no-store'}});
}
