import {NextResponse} from 'next/server';
import {prisma} from '../../../../../lib/prisma';

type Context={params:Promise<{siteId:string}>};
type Issue={severity:'blocker'|'warning';code:string;page?:string;message:string};
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function GET(_request:Request,{params}:Context){
 const {siteId}=await params;
 const site=await prisma.site.findUnique({where:{id:siteId},select:{id:true,name:true,slug:true,defaultTitle:true,siteConfig:true,pages:{select:{slug:true,title:true,content:true}},assets:{select:{id:true,url:true,alt:true}}}});
 if(!site)return NextResponse.json({error:'Website not found'},{status:404});
 const issues:Issue[]=[];
 if(site.pages.length===0)issues.push({severity:'blocker',code:'no-pages',message:'Create at least one page before publishing.'});
 if(!site.pages.some(p=>p.slug==='home'))issues.push({severity:'blocker',code:'missing-home',message:'A home page is required.'});
 const slugs=new Set(site.pages.map(p=>p.slug));
 const redirectsSeen=new Map<string,string>();
 const config=record(site.siteConfig),seo=record(config.seo);
 if(!seo.canonicalBaseUrl)issues.push({severity:'warning',code:'missing-canonical',message:'Canonical base URL is not configured.'});
 for(const page of site.pages){
  const content=record(page.content),pageSeo=record(content.seo);
  if(!Array.isArray(content.blocks)||content.blocks.length===0)issues.push({severity:'warning',code:'empty-page',page:page.slug,message:'Page has no content blocks.'});
  if(!String(pageSeo.title||page.title||site.defaultTitle||'').trim())issues.push({severity:'warning',code:'missing-title',page:page.slug,message:'SEO title is missing.'});
  if(!String(pageSeo.description||seo.defaultDescription||'').trim())issues.push({severity:'warning',code:'missing-description',page:page.slug,message:'Meta description is missing.'});
 }
 for(const asset of site.assets)if(!asset.url.trim())issues.push({severity:'warning',code:'empty-asset-url',message:'An asset is missing its URL.'});
 const redirects=Array.isArray(seo.redirects)?seo.redirects:[],sources=new Set<string>();
 for(const item of redirects){const rule=record(item),from=String(rule.from||''),to=String(rule.to||'');
  if(sources.has(from))issues.push({severity:'blocker',code:'duplicate-redirect',message:'Duplicate redirect: '+from});
  sources.add(from);
  if(from.startsWith('/')&&to.startsWith('/'))redirectsSeen.set(from,to);
  if(from===to)issues.push({severity:'blocker',code:'self-redirect',message:'Redirect points to itself: '+from});
  if(to!=='/'&&to.startsWith('/')&&!slugs.has(to.slice(1))&&!redirects.some(r=>record(r).from===to))issues.push({severity:'warning',code:'redirect-target',message:'Redirect destination has no matching page: '+to});
 }
 for(const start of redirectsSeen.keys()){
  const visited=new Set<string>();let current=start;
  while(redirectsSeen.has(current)){
   if(visited.has(current)){issues.push({severity:'blocker',code:'redirect-loop',message:'Redirect loop detected from '+start});break;}
   visited.add(current);current=redirectsSeen.get(current)!;
  }
 }
 return NextResponse.json({siteId:site.id,siteName:site.name,summary:{pages:site.pages.length,assets:site.assets.length,blockers:issues.filter(i=>i.severity==='blocker').length,warnings:issues.filter(i=>i.severity==='warning').length},readyForPreview:!issues.some(i=>i.severity==='blocker'),readyForProduction:false,issues,note:'Preflight only. Production publishing, domains, versioning and rollback are not implemented.'},{headers:{'Cache-Control':'private, no-store'}});
}
