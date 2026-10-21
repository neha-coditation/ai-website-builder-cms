import {NextResponse} from 'next/server';

export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const allowedHost='www.coditation.com';
const maxPages=8;
const maxBytes=2_500_000;
function validUrl(value:string):URL{
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname.toLowerCase()!==allowedHost||url.username||url.password||url.port||url.search.length>500)throw new Error('Only public HTTPS pages on www.coditation.com are supported.');
 return url;
}
function absolute(value:string,base:string):string|null{
 try{const url=new URL(value.replace(/&amp;/g,'&'),base);if(url.protocol!=='https:')return null;url.hash='';return url.toString();}catch{return null;}
}
function matches(html:string,re:RegExp):string[]{return [...html.matchAll(re)].map(x=>x[1]).filter(Boolean);}
async function fetchText(url:string,limit=maxBytes):Promise<string>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url,{redirect:'manual',cache:'no-store',headers:{'User-Agent':'CoditationMigrationReadOnly/1.0','Accept':'text/html,text/css,application/javascript,text/javascript,*/*'},signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status+' for '+url);
  const type=response.headers.get('content-type')||'';
  if(!/(text\/html|text\/css|javascript|text\/plain|application\/xml|text\/xml)/i.test(type))throw new Error('Unsupported content type for '+url);
  if(Number(response.headers.get('content-length')||0)>limit)throw new Error('Resource too large: '+url);
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty response');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Resource exceeds '+limit+' bytes: '+url);}chunks.push(value);}
  const result=new Uint8Array(size);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}
  return new TextDecoder().decode(result);
 }finally{clearTimeout(timer);}
}
function pageInfo(html:string,url:string){
 const links=matches(html,/<a\b[^>]*href=["']([^"']+)["']/gi).map(v=>absolute(v,url)).filter((v):v is string=>!!v);
 const images=matches(html,/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)["']/gi).map(v=>absolute(v.split(',')[0].trim().split(' ')[0],url)).filter((v):v is string=>!!v);
 const stylesheets=matches(html,/<link\b(?=[^>]*rel=["'][^"']*stylesheet)[^>]*href=["']([^"']+)["']/gi).map(v=>absolute(v,url)).filter((v):v is string=>!!v);
 const scripts=matches(html,/<script\b[^>]*src=["']([^"']+)["']/gi).map(v=>absolute(v,url)).filter((v):v is string=>!!v);
 const title=html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]||'';
 const classes=[...new Set(matches(html,/\bclass=["']([^"']+)["']/gi).flatMap(x=>x.split(/\s+/)))].slice(0,600);
 return {url,title,html,links:[...new Set(links)].slice(0,500),images:[...new Set(images)].slice(0,500),stylesheets:[...new Set(stylesheets)].slice(0,60),scripts:[...new Set(scripts)].slice(0,60),classes,webflowInteractions:(html.match(/data-w-id=/g)||[]).length,forms:(html.match(/<form\b/gi)||[]).length};
}
export async function POST(request:Request){
 try{
  const body=await request.json() as {url?:unknown};
  if(typeof body.url!=='string')return NextResponse.json({error:'Provide a published URL.'},{status:400,headers});
  const root=validUrl(body.url);
  const queue=[root.toString()];const visited=new Set<string>();const pages:ReturnType<typeof pageInfo>[]=[];const warnings:string[]=[];
  while(queue.length&&pages.length<maxPages){
   const url=queue.shift()!;if(visited.has(url))continue;visited.add(url);
   try{
    const html=await fetchText(url);const page=pageInfo(html,url);pages.push(page);
    for(const link of page.links){try{const u=validUrl(link);if(!visited.has(u.toString())&&!queue.includes(u.toString())&&queue.length<60&&!/\.(?:pdf|zip|png|jpe?g|svg|webp|css|js)$/i.test(u.pathname))queue.push(u.toString());}catch{/* external link */}}
   }catch(e){warnings.push(e instanceof Error?e.message:'Page unavailable');}
  }
  if(!pages.length)return NextResponse.json({error:'No accessible published HTML pages found.',warnings},{status:422,headers});
  const cssUrls=[...new Set(pages.flatMap(p=>p.stylesheets))].slice(0,12);
  const jsUrls=[...new Set(pages.flatMap(p=>p.scripts))].slice(0,5);
  const assets:{url:string;kind:string;content:string}[]=[];
  for(const [kind,urls] of [['css',cssUrls],['javascript',jsUrls]] as const){
   for(const url of urls){
    try{
     const u=new URL(url);
     if(u.protocol!=='https:'||!([allowedHost,'cdn.prod.website-files.com','assets.website-files.com'].includes(u.hostname))) {warnings.push('Skipped external script/style: '+url);continue;}
     assets.push({url,kind,content:await fetchText(url,kind==='css'?2_500_000:220_000)});
    }catch(e){warnings.push(e instanceof Error?e.message:'Asset unavailable');}
   }
  }
  const missingStylesheets=cssUrls.filter(url=>!assets.some(asset=>asset.kind==='css'&&asset.url===url));
  const signatures=[
   {name:'GSAP',pattern:/\bgsap\b|greensock|TweenMax|ScrollTrigger/i},
   {name:'Three.js',pattern:/three(?:\.min)?\.js|threejs|THREE\.Scene|WebGLRenderer/i},
   {name:'globe.gl',pattern:/globe\.gl|Globe\(/i},
   {name:'Lenis',pattern:/\blenis\b/i},
   {name:'Lottie',pattern:/lottie(?:-web)?|bodymovin/i},
   {name:'Swiper',pattern:/\bswiper\b/i},
   {name:'Splide',pattern:/\bsplide\b/i},
   {name:'AOS',pattern:/aos(?:\.js|\.css|\.init)/i},
   {name:'Webflow IX2',pattern:/webflow\.js|data-w-id|ix2\.init/i},
   {name:'jQuery',pattern:/jquery|jQuery\(/i}
  ];
  const animationLibraries=signatures.map(({name,pattern})=>{
   const sources=[...pages.filter(page=>pattern.test(page.html)).map(page=>page.url),
    ...assets.filter(asset=>pattern.test(asset.url)||pattern.test(asset.content.slice(0,120000))).map(asset=>asset.url)];
   return {name,detected:sources.length>0,evidence:[...new Set(sources)].slice(0,8)};
  }).filter(result=>result.detected);
  const breakpoints=[...new Set(assets.filter(a=>a.kind==='css').flatMap(a=>matches(a.content,/@media\s*([^{}]+)\{/gi)))].slice(0,80);
  return NextResponse.json({readOnly:true,source:root.toString(),pageCount:pages.length,pages,assets,breakpoints,animationLibraries,missingStylesheets,warnings,limitations:['Crawl limited to 8 HTML pages, 12 CSS and 5 JavaScript files; oversized resources are skipped.','Only publicly accessible HTML and permitted styles/scripts are read. This does not reconstruct native Webflow CMS bindings, components, or interaction editor settings.','Scripts are returned as text and never executed by this endpoint.','Pages linked only via JavaScript may not be discovered.']},{headers});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Crawl failed'},{status:400,headers});}
}
