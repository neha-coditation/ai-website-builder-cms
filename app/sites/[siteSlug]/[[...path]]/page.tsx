import Link from 'next/link';
import { Element, type Block, type Design } from '../../../components/PublicBlockRenderer';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getPrisma } from '../../../../lib/prisma';

type Params={params:Promise<{siteSlug:string;path?:string[]}>};
type Content={blocks?:Block[];seo?:{title?:string;description?:string;noindex?:boolean;ogImage?:string}};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function getContent(v:unknown):Content {return obj(v) as Content;}
function getDesign(v:unknown):Design {return obj(v) as Design;}
async function load({siteSlug,path}: {siteSlug:string;path?:string[]}) {
  const prisma = getPrisma();
  if(path && (path.length!==1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path[0])))return null;
  const slug=path?.[0]||'home';
  const site=await prisma.site.findUnique({where:{slug:siteSlug},select:{id:true,name:true,slug:true,description:true,defaultTitle:true,globalDesign:true,siteConfig:true,pages:{select:{id:true,title:true,slug:true,content:true},orderBy:{createdAt:'asc'}}}});
  if(!site)return null;
  const page=site.pages.find(p=>p.slug===slug);
  if(!page)return null;
  return {site,page,content:getContent(page.content),design:getDesign(site.globalDesign)};
}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  const values=await params;
  const data=await load(values);
  if(!data)return {title:'Page not found',robots:{index:false,follow:false}};
  const {site,page,content}=data;
  const seo=content.seo||{};
  const config=obj(site.siteConfig);const seoConfig=obj(config.seo);
  const suffix=typeof seoConfig.titleSuffix==='string'?seoConfig.titleSuffix:'';
  const title=(seo.title||page.title||site.defaultTitle||site.name)+suffix;
  const description=seo.description||(typeof seoConfig.defaultDescription==='string'?seoConfig.defaultDescription:'')||site.description||undefined;
  const image=seo.ogImage||(typeof seoConfig.defaultOgImage==='string'?seoConfig.defaultOgImage:'');
  // Preview routes are intentionally noindex until an explicit production publishing flow exists.
  return {title,description,robots:{index:false,follow:false},openGraph:{title,description,images:image?[image]:undefined}};
}
export default async function PublicPage({params}:Params){
  const prisma = getPrisma();
  const values=await params;
  const data=await load(values);
  if(!data){
    // Redirect only within this site's preview namespace; never redirect across sites.
    const site=await prisma.site.findUnique({where:{slug:values.siteSlug},select:{siteConfig:true}});
    const config=obj(site?.siteConfig);const seo=obj(config.seo);
    const rules=Array.isArray(seo.redirects)?seo.redirects:[];
    const from='/'+(values.path?.join('/')||'');
    const rule=rules.find(r=>{const v=obj(r);return v.from===from && typeof v.to==='string' && v.to.startsWith('/') && !v.to.startsWith('//') && !v.to.includes('..') && v.to!==from;});
    if(rule){const item=obj(rule);const dest=String(item.to);const target='/sites/'+values.siteSlug+(dest==='/'?'':dest);if(item.permanent===false)redirect(target);permanentRedirect(target);}
    notFound();
  }
  const {site,page,content,design}=data;
  const blocks=Array.isArray(content.blocks)?content.blocks:[];
  const collectionIds=[...new Set(blocks.filter(b=>b.type==='cms-list'&&b.collectionId).map(b=>b.collectionId as string))];
  const collections=collectionIds.length?await prisma.cmsCollection.findMany({where:{siteId:site.id,id:{in:collectionIds}},select:{id:true}}):[];
  const cmsEntries:Record<string,{id:string;slug:string;data:Record<string,unknown>}[]>={};
  for(const collection of collections){
    const entries=await prisma.cmsEntry.findMany({where:{collectionId:collection.id,status:'published'},select:{id:true,slug:true,data:true},take:100,orderBy:{createdAt:'asc'}});
    cmsEntries[collection.id]=entries.map(entry=>({id:entry.id,slug:entry.slug,data:obj(entry.data)}));
  }
  const cfg=site.siteConfig&&typeof site.siteConfig==='object'&&!Array.isArray(site.siteConfig)?site.siteConfig as Record<string,unknown>:{};
  const forms=cfg.forms&&typeof cfg.forms==='object'&&!Array.isArray(cfg.forms)?cfg.forms as Record<string,unknown>:{};
  const successMessage=typeof forms.successMessage==='string'?forms.successMessage:'Thanks! Your submission has been received.';
  const ids=new Set(blocks.filter(b=>(b.type==='container'||b.type==='dropdown')).map(b=>b.id));
  return <div className="published-site" style={{background:design.pageBackground||'#fff',color:design.bodyTextColor||'#18202f',fontFamily:design.fontFamily||'system-ui'}}>
    <header className="published-header" style={{background:design.headerBackground||undefined,color:design.headerTextColor||undefined}}><strong>{design.logoText||site.name}</strong><nav aria-label="Site pages">{site.pages.map(p=><Link key={p.id} href={p.slug==='home'?'/sites/'+site.slug:'/sites/'+site.slug+'/'+p.slug} aria-current={p.id===page.id?'page':undefined}>{p.title}</Link>)}</nav></header>
    <main className="published-main">{blocks.filter(b=>!b.parentId||!ids.has(b.parentId)).map(b=><Element key={b.id} block={b} blocks={blocks} design={design} siteId={site.id} pageSlug={page.slug} successMessage={successMessage} cmsEntries={cmsEntries}/>)}</main>
    <footer className="published-footer" style={{background:design.footerBackground||undefined,color:design.footerTextColor||undefined}}>{design.footerText||'© '+new Date().getFullYear()+' '+site.name}</footer>
  </div>;
}
