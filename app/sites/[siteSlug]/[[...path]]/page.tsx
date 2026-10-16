import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import type { CSSProperties } from 'react';

type Params={params:Promise<{siteSlug:string;path?:string[]}>};
type Block={id:string;type:string;text?:string;parentId?:string;collectionId?:string;displayField?:string;htmlId?:string;classNames?:string;alt?:string;href?:string;layout?:'row'|'column'|'grid';gap?:number;columns?:number;style?:{color?:string;background?:string;fontSize?:number;padding?:number;radius?:number;align?:'left'|'center'|'right';width?:'auto'|'full'|'half';maxWidth?:number;marginTop?:number;marginBottom?:number}};
type Content={blocks?:Block[];seo?:{title?:string;description?:string;noindex?:boolean;ogImage?:string}};
type ClassRule={color?:string;background?:string;fontSize?:number;padding?:number;radius?:number};
type Design={classes?:Record<string,ClassRule>;logoText?:string;headerBackground?:string;headerTextColor?:string;footerText?:string;footerBackground?:string;footerTextColor?:string;primaryColor?:string;bodyTextColor?:string;pageBackground?:string;fontFamily?:string};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function getContent(v:unknown):Content {return obj(v) as Content;}
function getDesign(v:unknown):Design {return obj(v) as Design;}
async function load({siteSlug,path}: {siteSlug:string;path?:string[]}) {
  if(path && (path.length!==1 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path[0])))return null;
  const slug=path?.[0]||'home';
  const site=await prisma.site.findUnique({where:{slug:siteSlug},select:{id:true,name:true,slug:true,description:true,defaultTitle:true,globalDesign:true,pages:{select:{id:true,title:true,slug:true,content:true},orderBy:{createdAt:'asc'}}}});
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
  return {title:seo.title||page.title||site.defaultTitle||site.name,description:seo.description||site.description||undefined,robots:{index:false,follow:false},openGraph:{title:seo.title||page.title,description:seo.description||site.description||undefined,images:seo.ogImage?[seo.ogImage]:undefined}};
}
function blockStyle(b:Block,design:Design):CSSProperties{
  const s=b.style||{};
  const fromClass:CSSProperties={};
  for(const name of (b.classNames||'').split(/\s+/).filter(Boolean)){
    const rule=design.classes?.[name];if(!rule)continue;
    if(rule.color)fromClass.color=rule.color;
    if(rule.background)fromClass.backgroundColor=rule.background;
    if(rule.fontSize!==undefined)fromClass.fontSize=rule.fontSize+'px';
    if(rule.padding!==undefined)fromClass.padding=rule.padding+'px';
    if(rule.radius!==undefined)fromClass.borderRadius=rule.radius+'px';
  }
  return {...fromClass,...Object.fromEntries(Object.entries({color:s.color||design.bodyTextColor,backgroundColor:s.background||(b.type==='button'?design.primaryColor:undefined),fontSize:s.fontSize? s.fontSize+'px':undefined,padding:s.padding===undefined?undefined:s.padding+'px',borderRadius:s.radius===undefined?undefined:s.radius+'px',textAlign:s.align,maxWidth:s.maxWidth?s.maxWidth+'px':undefined,marginTop:s.marginTop===undefined?undefined:s.marginTop+'px',marginBottom:s.marginBottom===undefined?undefined:s.marginBottom+'px',width:s.width==='full'?'100%':s.width==='half'?'50%':undefined}).filter(([,value])=>value!==undefined))};
}
function Element({block,blocks,design,depth=0}: {block:Block;blocks:Block[];design:Design;depth?:number}){
  const style=blockStyle(block,design);
  const attrs={id:block.htmlId||undefined,className:block.classNames||undefined};
  if(block.type==='heading')return <h2 {...attrs} style={style}>{block.text}</h2>;
  if(block.type==='paragraph')return <p {...attrs} style={style}>{block.text}</p>;
  if(block.type==='button'){const href=block.href||'';const safe=href.startsWith('/')&&!href.startsWith('//')||/^https:\/\//.test(href);return safe?<a {...attrs} href={href} rel={href.startsWith('https://')?'noopener noreferrer':undefined} className={['published-button',block.classNames].filter(Boolean).join(' ')} style={style}>{block.text}</a>:<span {...attrs} className={['published-button',block.classNames].filter(Boolean).join(' ')} style={style}>{block.text}</span>;}
  if(block.type==='image')return block.text&&(/^(https:\/\/|\/uploads\/)/.test(block.text))?<img {...attrs} src={block.text} alt={block.alt||''} style={{...style,maxWidth:'100%',height:'auto'}}/>:null;
  if(block.type==='form')return <form {...attrs} style={style} action="#" onSubmit={undefined}><strong>{block.text||'Contact'}</strong><label>Name<input name="name" required/></label><label>Email<input name="email" type="email" required/></label><label>Message<textarea name="message"/></label><button type="submit">Submit</button><p>Form delivery is not configured.</p></form>;
  if(block.type==='search')return <form {...attrs} style={style} role="search" action="#" method="get"><input type="search" name="q" placeholder={block.text||'Search'}/><button type="submit">Search</button></form>;
  if(block.type==='dropdown')return <details {...attrs} style={style}><summary>{block.text||'Menu'}</summary><div>Dropdown content</div></details>;
  if(block.type==='tabs'){const tabs=(block.text||'Overview|Details').split('|').map(t=>t.trim()).filter(Boolean);return <div {...attrs} style={style}><nav aria-label="Tabs">{tabs.map((tab,i)=><a key={i} href={'#tab-'+block.id+'-'+i}>{tab}</a>)}</nav>{tabs.map((tab,i)=><section key={i} id={'tab-'+block.id+'-'+i}><h3>{tab}</h3></section>)}</div>;}
  if(block.type==='input')return <input {...attrs} style={style} placeholder={block.text||'Enter text'}/>;
  if(block.type==='textarea')return <textarea {...attrs} style={style} placeholder={block.text||'Enter text'}/>;
  if(block.type==='checkbox')return <label {...attrs} style={style}><input type="checkbox"/> {block.text}</label>;
  if(block.type==='select')return <select {...attrs} style={style}>{(block.text||'Option 1|Option 2').split('|').map((value,i)=><option key={i}>{value.trim()}</option>)}</select>;
  if(block.type==='divider')return <hr {...attrs} style={style}/>;
  if(block.type==='spacer')return <div {...attrs} style={{height:40,...style}} aria-hidden="true"/>;
  if(block.type==='video'||block.type==='embed')return <div {...attrs} style={style}>{block.type==='video'?'Video source not configured':'Embed content not configured'}</div>;
  if(block.type==='container'&&depth<4){
    const children=blocks.filter(b=>b.parentId===block.id);
    return <div {...attrs} className={['published-container',block.classNames].filter(Boolean).join(' ')} style={{...style,display:block.layout==='grid'?'grid':'flex',flexDirection:block.layout==='row'?'row':'column',gridTemplateColumns:block.layout==='grid'?`repeat(${Math.min(6,Math.max(1,block.columns||2))},minmax(0,1fr))`:undefined,gap:(block.gap??16)+'px'}}>{children.map(child=><Element key={child.id} block={child} blocks={blocks} design={design} depth={depth+1}/>)}</div>;
  }
  return null;
}
export default async function PublicPage({params}:Params){
  const values=await params;
  const data=await load(values);
  if(!data)notFound();
  const {site,page,content,design}=data;
  const blocks=Array.isArray(content.blocks)?content.blocks:[];
  const ids=new Set(blocks.filter(b=>b.type==='container').map(b=>b.id));
  return <div className="published-site" style={{background:design.pageBackground||'#fff',color:design.bodyTextColor||'#18202f',fontFamily:design.fontFamily||'system-ui'}}>
    <header className="published-header" style={{background:design.headerBackground||undefined,color:design.headerTextColor||undefined}}><strong>{design.logoText||site.name}</strong><nav aria-label="Site pages">{site.pages.map(p=><Link key={p.id} href={p.slug==='home'?'/sites/'+site.slug:'/sites/'+site.slug+'/'+p.slug} aria-current={p.id===page.id?'page':undefined}>{p.title}</Link>)}</nav></header>
    <main className="published-main">{blocks.filter(b=>!b.parentId||!ids.has(b.parentId)).map(b=><Element key={b.id} block={b} blocks={blocks} design={design}/>)}</main>
    <footer className="published-footer" style={{background:design.footerBackground||undefined,color:design.footerTextColor||undefined}}>{design.footerText||'© '+new Date().getFullYear()+' '+site.name}</footer>
  </div>;
}
