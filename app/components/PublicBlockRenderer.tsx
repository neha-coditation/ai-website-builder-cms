import SiteTabs from './SiteTabs';
import SiteForm from './SiteForm';
import type { CSSProperties } from 'react';

export type Block={id:string;type:string;text?:string;tabContents?:string[];parentId?:string;collectionId?:string;displayField?:string;htmlId?:string;classNames?:string;alt?:string;href?:string;layout?:'row'|'column'|'grid';gap?:number;columns?:number;style?:{color?:string;background?:string;fontSize?:number;padding?:number;radius?:number;align?:'left'|'center'|'right';width?:'auto'|'full'|'half';maxWidth?:number;marginTop?:number;marginBottom?:number}};
export type ClassRule={color?:string;background?:string;fontSize?:number;padding?:number;radius?:number};
export type Design={classes?:Record<string,ClassRule>;logoText?:string;headerBackground?:string;headerTextColor?:string;footerText?:string;footerBackground?:string;footerTextColor?:string;primaryColor?:string;bodyTextColor?:string;pageBackground?:string;fontFamily?:string};

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
export function Element({block,blocks,design,siteId,pageSlug,successMessage,ancestors=[],cmsEntries={}}: {block:Block;blocks:Block[];design:Design;siteId:string;pageSlug:string;successMessage:string;ancestors?:string[];cmsEntries?:Record<string,{id:string;slug:string;data:Record<string,unknown>}[]>}){
  if(ancestors.includes(block.id))return null;
  const nextAncestors=[...ancestors,block.id];
  const style=blockStyle(block,design);
  const attrs={id:block.htmlId||undefined,className:block.classNames||undefined};
  if(block.type==='cms-list'){const entries=block.collectionId?cmsEntries[block.collectionId]||[]:[];const field=block.displayField||'name';return <div {...attrs} style={style} data-cms-collection={block.collectionId||undefined}>{entries.map(entry=><div key={entry.id}>{String(entry.data[field]??entry.slug)}</div>)}</div>;}
  if(block.type==='heading')return <h2 {...attrs} style={style}>{block.text}</h2>;
  if(block.type==='paragraph')return <p {...attrs} style={style}>{block.text}</p>;
  if(block.type==='button'){const href=block.href||'';const safe=href.startsWith('/')&&!href.startsWith('//')||/^https:\/\//.test(href);return safe?<a {...attrs} href={href} rel={href.startsWith('https://')?'noopener noreferrer':undefined} className={['published-button',block.classNames].filter(Boolean).join(' ')} style={style}>{block.text}</a>:<span {...attrs} className={['published-button',block.classNames].filter(Boolean).join(' ')} style={style}>{block.text}</span>;}
  if(block.type==='image')return block.text&&(/^(https:\/\/|\/uploads\/)/.test(block.text))?<img {...attrs} src={block.text} alt={block.alt||''} style={{...style,maxWidth:'100%',height:'auto'}}/>:null;
  if(block.type==='form')return <SiteForm siteId={siteId} formId={block.id} pageSlug={pageSlug} title={block.text||'Contact'} successMessage={successMessage} className={attrs.className} style={style}/>;
    if(block.type==='search')return <form {...attrs} style={style} role="search" action="#" method="get"><input type="search" name="q" placeholder={block.text||'Search'}/><button type="submit">Search</button></form>;
  if(block.type==='dropdown'){const children=blocks.filter(b=>b.parentId===block.id);return <details {...attrs} style={style}><summary>{block.text||'Menu'}</summary><div>{children.map(child=><Element key={child.id} block={child} blocks={blocks} design={design} siteId={siteId} pageSlug={pageSlug} successMessage={successMessage} ancestors={nextAncestors} cmsEntries={cmsEntries}/>)}</div></details>;}
  if(block.type==='tabs'){const labels=(block.text||'Overview|Details').split('|').map(t=>t.trim()).filter(Boolean);return <SiteTabs id={'site-tabs-'+block.id} labels={labels} contents={block.tabContents} className={attrs.className} style={style}/>;}
  if(block.type==='input')return <input {...attrs} style={style} placeholder={block.text||'Enter text'}/>;
  if(block.type==='textarea')return <textarea {...attrs} style={style} placeholder={block.text||'Enter text'}/>;
  if(block.type==='checkbox')return <label {...attrs} style={style}><input type="checkbox"/> {block.text}</label>;
  if(block.type==='select')return <select {...attrs} style={style}>{(block.text||'Option 1|Option 2').split('|').map((value,i)=><option key={i}>{value.trim()}</option>)}</select>;
  if(block.type==='divider')return <hr {...attrs} style={style}/>;
  if(block.type==='spacer')return <div {...attrs} style={{height:40,...style}} aria-hidden="true"/>;
  if(block.type==='video')return /^(https:\/\/|\/uploads\/)/.test(block.text ?? '')?<video {...attrs} src={block.text} controls preload="metadata" style={{...style,maxWidth:'100%'}}/>:<div {...attrs}>Video source not configured</div>;
  if(block.type==='embed')return <pre {...attrs} style={{...style,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{block.text}</pre>;
  if(block.type==='container'){
    const children=blocks.filter(b=>b.parentId===block.id);
    return <div {...attrs} className={['published-container',block.classNames].filter(Boolean).join(' ')} style={{...style,display:block.layout==='grid'?'grid':'flex',flexDirection:block.layout==='row'?'row':'column',gridTemplateColumns:block.layout==='grid'?`repeat(${Math.min(6,Math.max(1,block.columns||2))},minmax(0,1fr))`:undefined,gap:(block.gap??16)+'px'}}>{children.map(child=><Element key={child.id} block={child} blocks={blocks} design={design} siteId={siteId} pageSlug={pageSlug} successMessage={successMessage} ancestors={nextAncestors} cmsEntries={cmsEntries}/>)}</div>;
  }
  return null;
}
