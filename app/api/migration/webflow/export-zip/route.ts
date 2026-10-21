import {NextResponse} from 'next/server';
import JSZip from 'jszip';
import {decryptWebflowToken} from '../../../../../lib/webflow-credential';

export const runtime='nodejs';
export const maxDuration=300;
type Obj=Record<string,unknown>;
const object=(v:unknown):Obj=>v&&typeof v==='object'&&!Array.isArray(v)?v as Obj:{};
const rows=(v:unknown):Obj[]=>Array.isArray(v)?v.map(object):[];
const idOk=(s:string)=>/^[a-f0-9]{24}$/i.test(s);
const base='https://api.webflow.com/v2';
async function api(path:string,token:string){
 const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw new Error('Webflow '+response.status+' for '+path);
 return object(await response.json());
}
async function paged(path:string,key:string,token:string,max=1000){
 const result:Obj[]=[];let total=0;
 for(let offset=0;offset<max;offset+=100){
  const sep=path.includes('?')?'&':'?';
  const data=await api(path+sep+'limit=100&offset='+offset,token);
  const batch=rows(data[key]);result.push(...batch);
  const pagination=object(data.pagination);
  total=typeof pagination.total==='number'?pagination.total:result.length;
  if(batch.length<100||result.length>=total)break;
 }
 return {items:result,total,complete:result.length>=total};
}
async function bytes(url:string,max:number){
 const res=await fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw new Error('HTTP '+res.status);
 if(Number(res.headers.get('content-length')||0)>max)throw new Error('Resource too large');
 const data=new Uint8Array(await res.arrayBuffer());if(data.length>max)throw new Error('Resource too large');
 return {data,type:res.headers.get('content-type')||''};
}
function safePath(path:string){
 const segments=path.split('/').filter(Boolean).map(x=>encodeURIComponent(decodeURIComponent(x)).replace(/%20/g,'-'));
 return segments.length?segments.join('/')+'/index.html':'index.html';
}
function refs(html:string,baseUrl:string){
 const urls=new Set<string>();
 for(const match of html.matchAll(/(?:src|href|poster)=["']([^"'#]+)["']/gi)){
  try{const u=new URL(match[1].replace(/&amp;/g,'&'),baseUrl);if(u.protocol==='https:'&&/\.(css|js|png|jpe?g|webp|avif|svg|gif|woff2?|ttf|otf)(?:$|\?)/i.test(u.href))urls.add(u.href);}catch{/* invalid reference */}
 }
 return [...urls];
}
export async function GET(request:Request){
 const siteId=new URL(request.url).searchParams.get('siteId')||'';
 if(!idOk(siteId))return NextResponse.json({error:'Invalid site ID'},{status:400});
 const token=await decryptWebflowToken().catch(()=>null)||process.env.WEBFLOW_API_TOKEN;
 if(!token)return NextResponse.json({error:'Connect Webflow first'},{status:503});
 try{
  const site=await api('/sites/'+siteId,token);
  const domains=rows(site.customDomains);
  const domain=domains.map(d=>String(d.url||'')).find(d=>{try{return ['www.coditation.com','coditation.com'].includes(new URL(d.startsWith('http')?d:'https://'+d).hostname);}catch{return false;}});
  if(!domain)return NextResponse.json({error:'This first export supports the verified Coditation custom domain only.'},{status:422});
  const origin='https://www.coditation.com';
  const [pages,collections]=await Promise.all([paged('/sites/'+siteId+'/pages','pages',token,200),paged('/sites/'+siteId+'/collections','collections',token,100)]);
  const zip=new JSZip(),warnings:string[]=[],manifest:{source:string;pages:Array<{path:string;url:string;title:string}>;assets:number;cmsCollections:number;warnings:string[];limitations:string[]}={source:origin,pages:[],assets:0,cmsCollections:collections.items.length,warnings,limitations:['Published-only pages are available as HTML; drafts, protected pages and template-only pages may be absent.','CMS records are exported as JSON, not automatically bound to page templates.','Forms, search, ecommerce and runtime integrations require rebuilding.','Third-party assets may remain remote when they cannot be safely downloaded.']};
  zip.file('data/site.json',JSON.stringify(site,null,2));zip.file('data/pages.json',JSON.stringify(pages,null,2));zip.file('data/collections.json',JSON.stringify(collections,null,2));
  for(const collection of collections.items.slice(0,40)){
   const id=String(collection.id||'');if(!idOk(id))continue;
   try{
    const schema=await api('/collections/'+id,token);
    const items=await paged('/collections/'+id+'/items','items',token,1000);
    zip.file('data/cms/'+id+'.json',JSON.stringify({schema,items},null,2));
    if(!items.complete)warnings.push('CMS collection '+id+' exceeded item cap');
   }catch(e){warnings.push('CMS '+id+': '+String(e instanceof Error?e.message:e));}
  }
  try{zip.file('data/redirects.json',JSON.stringify(await paged('/sites/'+siteId+'/redirects','redirects',token),null,2));}catch{warnings.push('Redirect API unavailable');}
  try{zip.file('data/assets.json',JSON.stringify(await paged('/sites/'+siteId+'/assets','assets',token),null,2));}catch{warnings.push('Asset inventory API unavailable');}
  const assets=new Map<string,string>();let assetBytes=0;
  const allowAsset=(u:URL)=>u.protocol==='https:'&&['www.coditation.com','coditation.com','cdn.prod.website-files.com','assets.website-files.com','uploads-ssl.webflow.com'].includes(u.hostname);
  for(const page of pages.items.slice(0,100)){
   if(page.draft===true||page.archived===true)continue;
   const path=typeof page.publishedPath==='string'?page.publishedPath:(page.isHomepage===true||page.title==='Home'?'/':'/'+String(page.slug||'').replace(/^\/+|\/+$/g,'')+'/');
   if(!path.startsWith('/')||path.includes('..')||path.startsWith('//'))continue;
   const url=new URL(path,origin);
   if(url.hostname!=='www.coditation.com')continue;
   try{
    const response=await bytes(url.href,2_500_000);
    if(!/text\/html/i.test(response.type))throw new Error('Not HTML');
    let html=new TextDecoder().decode(response.data);
    for(const ref of refs(html,url.href).slice(0,150)){
     let resource:URL;try{resource=new URL(ref);}catch{continue;}
     if(!allowAsset(resource))continue;
     let local=assets.get(ref);
     if(!local&&assets.size<350&&assetBytes<60_000_000){
      try{
       const file=await bytes(ref,2_500_000);
       if(assetBytes+file.data.length>60_000_000)continue;
       local='assets/'+assets.size+'-'+(resource.pathname.split('/').pop()||'asset').replace(/[^a-zA-Z0-9._-]/g,'_');
       zip.file(local,file.data);assets.set(ref,local);assetBytes+=file.data.length;
      }catch{warnings.push('Asset not mirrored: '+ref);}
     }
     if(local){
      const relative='/'+local;
      html=html.split(ref.replace(/&/g,'&amp;')).join(relative).split(ref).join(relative);
     }
    }
    const filename=safePath(url.pathname);
    zip.file(filename,html);
    manifest.pages.push({path:filename,url:url.href,title:String(page.title||'')});
   }catch(e){warnings.push('Page '+url.href+': '+String(e instanceof Error?e.message:e));}
  }
  if(!manifest.pages.length)return NextResponse.json({error:'No published HTML could be downloaded. ZIP not generated.',warnings},{status:422});
  manifest.assets=assets.size;
  zip.file('migration-manifest.json',JSON.stringify(manifest,null,2));
  zip.file('README.txt','Coditation combined API + published HTML export. Run: python3 -m http.server 8000 from this folder. CMS JSON is in data/cms. This is a static test mirror, not a complete functional migration.\n');
  const buffer=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:5}});
  return new Response(buffer as BodyInit,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="coditation-combined-export.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Export failed'},{status:502});}
}
