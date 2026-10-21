import {NextResponse} from 'next/server';
import {decryptWebflowToken} from '../../../../../lib/webflow-credential';

const base='https://api.webflow.com/v2';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
type Obj=Record<string,unknown>;
const list=(value:unknown):Obj[]=>Array.isArray(value)?value.filter((v):v is Obj=>typeof v==='object'&&v!==null):[];
async function api(path:string,token:string):Promise<Obj>{
 const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Webflow HTTP '+response.status);
 return await response.json() as Obj;
}
async function collect(path:string,key:string,token:string,maxPages=10){
 const items:Obj[]=[];let total:number|null=null;
 for(let offset=0;offset<maxPages*100;offset+=100){
  const join=path.includes('?')?'&':'?';
  const result=await api(path+join+'limit=100&offset='+offset,token);
  const batch=list(result[key]);items.push(...batch);
  const pagination=result.pagination as Obj|undefined;
  if(typeof pagination?.total==='number')total=pagination.total;
  if(batch.length<100 || (total!==null&&items.length>=total))break;
 }
 return {items,total,complete:total!==null?items.length>=total:items.length<maxPages*100};
}
function pageSignals(html:string){
 const match=(pattern:RegExp)=>html.match(pattern)?.[1]??null;
 const urls=(pattern:RegExp)=>[...html.matchAll(pattern)].map(m=>m[1]).filter(Boolean).slice(0,250);
 return {
  title:match(/<title[^>]*>([^<]*)<\/title>/i),
  description:match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i),
  viewport:match(/<meta\s+[^>]*name=["']viewport["'][^>]*content=["']([^"']*)/i),
  htmlBytes:html.length,
  stylesheets:urls(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi),
  scripts:urls(/<script\b[^>]*src=["']([^"']+)["']/gi),
  images:urls(/<img\b[^>]*src=["']([^"']+)["']/gi),
  fonts:urls(/(?:href|src)=["']([^"']+\.(?:woff2?|ttf|otf)(?:\?[^"']*)?)["']/gi),
  forms:(html.match(/<form\b/gi)||[]).length,
  webflowInteractions:html.includes('data-w-id'),
  classes:[...new Set(urls(/\bclass=["']([^"']+)["']/gi).flatMap(s=>s.split(/\s+/)))].slice(0,250),
  responsiveStylesheetsDetected:/@media|\.css/i.test(html),
  note:'HTML signals only. Full DOM, computed CSS, breakpoints, animations and reusable components require browser-based rendering and analysis.'
 };
}
export async function GET(request:Request){
 const token=await decryptWebflowToken().catch(()=>null)||process.env.WEBFLOW_API_TOKEN;
 if(!token)return NextResponse.json({error:'Connect Webflow first.'},{status:503,headers});
 const siteId=new URL(request.url).searchParams.get('siteId');
 if(!siteId||!/^[a-f0-9]{24}$/i.test(siteId))return NextResponse.json({error:'Invalid site ID'},{status:400,headers});
 const errors:string[]=[];
 try{
  const site=await api('/sites/'+siteId,token);
  const pages=await collect('/sites/'+siteId+'/pages','pages',token);
  const collections=await collect('/sites/'+siteId+'/collections','collections',token);
  const entries:Obj[]=[];
  for(const collection of collections.items.slice(0,30)){
   const id=collection.id;
   if(typeof id!=='string'||!/^[a-f0-9]{24}$/i.test(id))continue;
   try{
    const result=await collect('/collections/'+id+'/items','items',token,5);
    entries.push({collectionId:id,collectionName:collection.displayName??collection.slug,items:result.items,total:result.total,complete:result.complete});
   }catch(e){errors.push('CMS items for '+String(collection.displayName??id)+': '+(e instanceof Error?e.message:'unavailable'));}
  }
  let redirects:Obj[]=[];let redirectCoverage:Obj|null=null;
  try{const result=await collect('/sites/'+siteId+'/301_redirects','redirects',token);redirects=result.items;redirectCoverage={total:result.total,complete:result.complete};}
  catch(e){errors.push('301 redirects not accessible through this API connection: '+(e instanceof Error?e.message:'unavailable'));}
  let assets:Obj[]=[];let assetCoverage:Obj|null=null;
  try{const result=await collect('/sites/'+siteId+'/assets','assets',token);assets=result.items;assetCoverage={total:result.total,complete:result.complete};}
  catch(e){errors.push('Assets: '+(e instanceof Error?e.message:'unavailable'));}
  // Unpublished Webflow projects are supported: never require a public URL.
  const published:null=null;
  const publicationStatus='not_checked_optional';
  const pageMetadata=pages.items.map(page=>({id:page.id??null,title:page.title??null,slug:page.slug??null,seo:page.seo??null,openGraph:page.openGraph??null,archived:page.archived??null,draft:page.draft??null}));
  const collectionSchemas=collections.items.map(collection=>({id:collection.id??null,name:collection.displayName??collection.singularName??null,slug:collection.slug??null,fields:collection.fields??[]}));
  return NextResponse.json({readOnly:true,siteId,pageCount:pages.items.length,pagesComplete:pages.complete,pageMetadata,collectionCount:collections.items.length,collectionsComplete:collections.complete,collectionSchemas,publicationStatus,cmsEntries:entries,redirects,redirectCoverage,assets,assetCoverage,published,errors,limitations:['CMS entries are capped at 500 per collection and 30 collections.','Publishing is not required. Rendered HTML/CSS requires a separate authorized Designer extraction or optional export.','CSS rules, computed responsive layouts, reusable components and interaction behavior are not reconstructed.']},{headers});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Extraction failed'},{status:502,headers});}
}
