import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getPrisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65);
const strip = (s:string) => s.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi,'').replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\\s+/g,' ').trim();
function capture(html:string, re:RegExp){return html.match(re)?.[1] || '';}
export async function POST(req:Request){
  try{
    const form=await req.formData();const file=form.get('file');
    if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.zip'))return NextResponse.json({error:'Select a ZIP export.'},{status:400});
    if(file.size>45*1024*1024)return NextResponse.json({error:'Maximum ZIP size is 45 MB.'},{status:413});
    const zip=await JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:true});
    const htmlPaths=Object.keys(zip.files).filter(p=>!zip.files[p].dir&&(p==='index.html'||p.endsWith('/index.html'))&&!p.includes('..'));
    if(!htmlPaths.length||htmlPaths.length>300)return NextResponse.json({error:'ZIP must contain between 1 and 300 HTML pages.'},{status:422});
    const json=async(p:string)=>{try{return JSON.parse(await zip.file(p)!.async('string'))}catch{return null}};
    const siteMeta=await json('data/site.json');
    const pageMeta=await json('data/pages.json');
    const collectionMeta=await json('data/collections.json');
    const name=String(siteMeta?.displayName||file.name.replace(/\\.zip$/i,'')).slice(0,120);
    const prisma=getPrisma();
    const slug=slugify(name)||'imported-site';
    const uniqueSlug=slug+'-'+Date.now().toString(36);
    const pageDetails=Array.isArray(pageMeta?.items)?pageMeta.items:[];
    const cssPaths=Object.keys(zip.files).filter(p=>p.endsWith('.css'));
    const scriptPaths=Object.keys(zip.files).filter(p=>p.endsWith('.js'));
    const css=await Promise.all(cssPaths.slice(0,30).map(async p=>({path:p,content:(await zip.file(p)!.async('string')).slice(0,400000)})));
    const site=await prisma.site.create({data:{
      name,slug:uniqueSlug,siteConfig:{importSource:'zip',originalSite:siteMeta?.shortName||null,
        css,scriptFiles:scriptPaths,importWarnings:['Original JavaScript and custom integrations are preserved as references, not executed.','Some nested layouts and CSS animations need manual reconstruction in the native Designer.']},
    }});
    try{
      let count=0;
      for(const path of htmlPaths){
        const html=await zip.file(path)!.async('string');
        const urlPath=path==='index.html'?'/':'/'+path.replace(/\\/index\\.html$/,'');
        const meta=pageDetails.find((p:{publishedPath?:string})=>p.publishedPath===urlPath);
        const title=strip(capture(html,/<title[^>]*>([\\s\\S]*?)<\\/title>/i))||meta?.title||urlPath;
        const description=capture(html,/<meta\\s+name=["']description["']\\s+content=["']([^"']*)/i)||meta?.seo?.description||'';
        const headings=[...html.matchAll(/<h([1-6])\\b[^>]*>([\\s\\S]*?)<\\/h\\1>/gi)].slice(0,100);
        const blocks=headings.map((m,i)=>({id:'import-heading-'+i,type:'heading',text:strip(m[2]),htmlId:'',classNames:'',style:{fontSize:m[1]==='1'?48:32}}));
        if(!blocks.length)blocks.push({id:'import-title',type:'heading',text:title,htmlId:'',classNames:'',style:{fontSize:48}});
        const pageSlug=path==='index.html'?'home':slugify(urlPath.replace(/^\\//,'').replace(/\\//g,'-'))||'page';
        await prisma.page.create({data:{siteId:site.id,title:String(meta?.title||title).slice(0,200),slug:pageSlug,
          content:{name:title,blocks,seo:{title,description,noindex:/<meta[^>]*name=["']robots["'][^>]*noindex/i.test(html),ogImage:capture(html,/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i)},
            import:{sourcePath:path,originalHtml:html.slice(0,900000),cssPaths,scriptPaths,conversion:'partial-heading-blocks'}}}});
        count++;
      }
      let collections=0;
      for(const c of (Array.isArray(collectionMeta?.items)?collectionMeta.items:[])){
        const colSlug=slugify(String(c.slug||c.displayName||'collection'));
        if(!colSlug)continue;
        await prisma.cmsCollection.create({data:{siteId:site.id,name:String(c.displayName||colSlug),slug:colSlug,fields:[]}});
        collections++;
      }
      return NextResponse.json({siteId:site.id,pages:count,collections,cssFiles:cssPaths.length,scriptFiles:scriptPaths.length,warnings:['Pages are created with editable heading blocks; full HTML-to-native component conversion is not complete.','CSS is retained in site settings; imported JavaScript is not executed.','CMS schemas and item records require an additional data export.']});
    }catch(e){await prisma.site.delete({where:{id:site.id}});throw e}
  }catch(e){console.error('[zip-import]',e);return NextResponse.json({error:e instanceof Error?e.message:'Import failed'},{status:500})}
}
