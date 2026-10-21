import {NextResponse} from 'next/server';
import {decryptWebflowToken} from '../../../../../lib/webflow-credential';

const base='https://api.webflow.com/v2';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
type Data=Record<string,unknown>;
async function get(path:string,token:string):Promise<Data>{
 const res=await fetch(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('Webflow API HTTP '+res.status+' for '+path);
 return await res.json() as Data;
}
function urlFor(page:Data,site:Data):string|null{
 const domains=Array.isArray(site.customDomains)?site.customDomains as Data[]:[];
 const domain=domains.find(d=>typeof d.url==='string')?.url;
 const short=typeof site.shortName==='string'?site.shortName:null;
 const baseUrl=typeof domain==='string'?domain:(short?'https://'+short+'.webflow.io':null);
 if(!baseUrl)return null;
 try{
  const host=new URL(baseUrl.startsWith('http')?baseUrl:'https://'+baseUrl);
  if(host.protocol!=='https:'||!['www.coditation.com','coditation.com'].includes(host.hostname))return null;
  const slug=typeof page.slug==='string'?page.slug:'';
  const isHome=page.isHomepage===true||page.title==='Home';
  host.pathname=isHome?'/':'/'+slug.replace(/^\/+|\/+$/g,'')+'/';
  return host.toString();
 }catch{return null;}
}
async function published(url:string):Promise<Data>{
 const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!res.ok)throw new Error('Published URL HTTP '+res.status);
 const size=Number(res.headers.get('content-length')||0);
 if(size>1_500_000)throw new Error('Published HTML exceeds size limit');
 if(!/text\/html/i.test(res.headers.get('content-type')||''))throw new Error('Not HTML');
 const html=await res.text();if(html.length>1_500_000)throw new Error('Published HTML exceeds size limit');
 const values=(re:RegExp)=>[...html.matchAll(re)].map(m=>m[1]).slice(0,250);
 return {html,stylesheets:values(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi),scripts:values(/<script\b[^>]*src=["']([^"']+)["']/gi),images:values(/<img\b[^>]*src=["']([^"']+)["']/gi),webflowMarkers:(html.match(/data-w-id=/g)||[]).length};
}
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;
 const siteId=query.get('siteId'),pageId=query.get('pageId');
 if(!siteId||!/^[a-f0-9]{24}$/i.test(siteId)||!pageId||!/^[a-f0-9]{24}$/i.test(pageId))return NextResponse.json({error:'Valid siteId and pageId are required.'},{status:400,headers});
 const token=await decryptWebflowToken().catch(()=>null)||process.env.WEBFLOW_API_TOKEN;
 if(!token)return NextResponse.json({error:'Connect Webflow first.'},{status:503,headers});
 try{
  const [site,page]=await Promise.all([get('/sites/'+siteId,token),get('/pages/'+pageId,token)]);
  const warnings:string[]=[];
  const url=urlFor(page,site);
  let visual:Data|null=null;
  if(url){try{visual=await published(url);}catch(e){warnings.push(e instanceof Error?e.message:'Published page unavailable');}}
  else warnings.push('No verified Coditation public URL could be derived for this page.');
  return NextResponse.json({readOnly:true,siteId,pageId,page,url,visual,warnings,limitations:['API page data does not contain native Designer element trees or breakpoint rules.','Published HTML may not be available for CMS templates, drafts, or unpublished pages.','External CSS/JS references are inventory only; third-party scripts are not executed.']},{headers});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Page extraction failed'},{status:502,headers});}
}
