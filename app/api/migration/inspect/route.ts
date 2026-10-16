import {NextResponse} from 'next/server';
import {z} from 'zod';

const schema=z.object({
  sourceUrl:z.string().url().max(2048),
  html:z.string().min(1).max(2_000_000),
});
function unique(values:string[]){return [...new Set(values)].slice(0,500);}
function attributes(html:string,tag:string,attr:string){
  const matches:string[]=[];
  const re=new RegExp('<'+tag+'\\b[^>]*?\\b'+attr+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')','gi');
  for(const match of html.matchAll(re))matches.push(match[1]??match[2]??'');
  return unique(matches);
}
export async function POST(request:Request){
  const contentType=request.headers.get('content-type')||'';
  if(!contentType.toLowerCase().startsWith('application/json'))return NextResponse.json({error:'Expected application/json'},{status:415});
  const size=Number(request.headers.get('content-length')||0);
  if(size>2_200_000)return NextResponse.json({error:'HTML exceeds 2 MB limit'},{status:413});
  const raw=await request.text().catch(()=>null);
  if(raw===null)return NextResponse.json({error:'Unable to read request'},{status:400});
  if(new TextEncoder().encode(raw).length>2_200_000)return NextResponse.json({error:'Request exceeds 2.2 MB limit'},{status:413});
  let input:unknown;
  try{input=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
  const parsed=schema.safeParse(input);
  if(!parsed.success)return NextResponse.json({error:'Provide a valid HTTPS Webflow URL and exported HTML (up to 2 MB).'},{status:400});
  const {sourceUrl,html}=parsed.data;
  const url=new URL(sourceUrl);
  if(url.protocol!=='https:')return NextResponse.json({error:'Source URL must use HTTPS.'},{status:400});
  const title=html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()||'';
  const description=html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i)?.[1]||'';
  const canonical=html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)/i)?.[1]||'';
  const links=attributes(html,'a','href');
  const images=attributes(html,'img','src');
  const stylesheets=attributes(html,'link','href').filter(v=>/\.css(?:[?#]|$)/i.test(v));
  const scripts=attributes(html,'script','src');
  const forms=(html.match(/<form\b/gi)||[]).length;
  const headings=(html.match(/<h1\b/gi)||[]).length;
  const webflow=/webflow(?:\.js|\.css|\.io|\.com)|data-wf-page|data-wf-site/i.test(html);
  return NextResponse.json({sourceUrl,title,description,canonical,webflow,headings,forms,links,images,stylesheets,scripts,notes:[
    'Inventory only: no website was fetched, imported, published or modified.',
    'Dynamic interactions, CMS records, fonts and responsive fidelity require additional migration stages.',
    'Review third-party scripts and asset ownership before migration.'
  ]},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
