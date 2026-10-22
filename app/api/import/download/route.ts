import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { fetchSafe } from '../../../lib/safe-fetch';
import { webflowExport } from '../../../lib/webflow-export';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
const limits = { pages: 500, depth: 8, assets: 500, htmlBytes: 1_500_000, assetBytes: 2_000_000, totalBytes: 150_000_000, milliseconds: 120_000 };
function resolve(raw: string, base: string) { try { const u = new URL(raw.replace(/&amp;/g, '&'), base); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null; u.hash=''; return u; } catch { return null; } }
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (text.length > 10000) throw Error('Request too large.');
    const body = JSON.parse(text);
    if (typeof body.url !== 'string' || body.url.length > 2048) throw Error('Enter a public website URL.');
    const token = typeof body.token === 'string' ? body.token : '';
    const siteId = typeof body.siteId === 'string' ? body.siteId : '';
    if (!!token !== !!siteId) throw Error('Provide both Webflow site ID and token, or leave both empty.');
    const deadline = Date.now() + limits.milliseconds;
    const zip = new JSZip();
    const limitations = ['Only accessible server-returned HTML is captured; JavaScript is not executed.', 'Scripts and animation resources are best-effort; forms, search, authentication, backend integrations and Designer editability are not recreated.', 'API data retains its original structure, including CMS fields and available page SEO. Missing scopes, pagination caps and crawl omissions are recorded.', 'Only same-origin links without query strings are crawled. No sitemap-only or unlinked pages are guaranteed.'];
    const entries: {url: string; path?: string; status: string; reason?: string}[] = [];
    const api = token ? await webflowExport(siteId, token, deadline) : null;
    if (api) { zip.file('webflow/data.json', JSON.stringify(api, null, 2)); limitations.push(...api.notes); }
    const first = await fetchSafe(body.url, limits.htmlBytes);
    const origin = new URL(first.url).origin;
    const queue = [{url: first.url, depth: 0}];
    const seen = new Set<string>();
    const files = new Map<string, {path: string; data: Uint8Array; text?: string}>();
    let total = 0, pages = 0, assets = 0;
    const assetQueue: string[] = [];
    function discover(html: string, base: string) {
      for (const m of html.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)) {
        const u = resolve(m[1], base);
        if (u && /\.(css|js|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp4|webm)(?:$|\?)/i.test(u.href) && assetQueue.length < 2000) assetQueue.push(u.href);
      }
      for (const m of html.matchAll(/(?:url\(\s*["']?|@import\s+["'])([^\s"')]+)|\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
        for (const raw of m[2] ? m[2].split(',').map(v=>v.trim().split(/\s+/)[0]) : [m[1]]) { const u=resolve(raw,base); if(u && assetQueue.length<400) assetQueue.push(u.href); }
      }
    }
    while (queue.length && pages < limits.pages && Date.now() < deadline && total < limits.totalBytes) {
      const item = queue.shift()!;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      try {
        const r = item.url===first.url ? first : await fetchSafe(item.url, limits.htmlBytes);
        if (new URL(r.url).origin !== origin || !r.contentType.includes('text/html')) throw Error('Outside origin or not HTML.');
        if (total+r.data.length>limits.totalBytes) throw Error('Total byte limit.');
        const html=new TextDecoder().decode(r.data);
        const path=pages++===0?'index.html':`pages/page-${pages}.html`;
        files.set(item.url,{path,data:r.data,text:html}); total+=r.data.length;
        entries.push({url:item.url,path,status:'downloaded'});
        discover(html,r.url);
        for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
          const u=resolve(m[1],r.url);
          if(u && u.origin===origin && !u.search && !seen.has(u.href) && queue.length<5000) {
            if(item.depth<limits.depth) queue.push({url:u.href,depth:item.depth+1});
            else entries.push({url:u.href,status:'skipped',reason:'Depth limit'});
          }
        }
      } catch { entries.push({url:item.url,status:'skipped',reason:'Unavailable, blocked, timed out or resource limit'}); }
    }
    for (const url of assetQueue) {
      if(files.has(url)) continue;
      if(assets>=limits.assets || Date.now()>=deadline || total>=limits.totalBytes) break;
      // Count attempts too, so failures cannot create an unbounded export.
      assets++;
      try {
        const r=await fetchSafe(url,limits.assetBytes);
        if(total+r.data.length>limits.totalBytes) throw Error();
        const ext=new URL(url).pathname.match(/\.([a-z0-9]{1,5})$/i)?.[1]||'bin';
        const path=`assets/file-${assets}.${ext}`;
        const css=r.contentType.includes('text/css')||ext==='css';
        const content=css?new TextDecoder().decode(r.data):undefined;
        files.set(url,{path,data:r.data,text:content}); total+=r.data.length;
        entries.push({url,path,status:'downloaded'});
        if(content) discover(content,r.url);
      } catch { entries.push({url,status:'skipped',reason:'Unavailable, blocked, timed out or resource limit'}); }
    }
    if(!pages) throw Error('No accessible HTML pages were exported.');
    for (const [base,file] of files) {
      let content=file.text;
      if(content!==undefined) {
        // Resolve each reference relative to its original document, preserving anchors.
        const rewrite=(raw:string)=>{ const u=resolve(raw,base); const target=u?files.get(u.href):undefined; if(!u)return raw; const hash=raw.includes('#')?raw.slice(raw.indexOf('#')):''; return target?(file.path.includes('/')?'../':'')+target.path+hash:u.href+hash; };
        content=content.replace(/(\b(?:src|href|poster)\s*=\s*["'])([^"']+)(["'])/gi,(_,a,b,c)=>a+rewrite(b)+c)
          .replace(/(url\(\s*["']?)([^\s"')]+)(["']?\s*\))/gi,(_,a,b,c)=>a+rewrite(b)+c)
          .replace(/(@import\s+["'])([^"']+)(["'])/gi,(_,a,b,c)=>a+rewrite(b)+c)
          .replace(/(\bsrcset\s*=\s*["'])([^"']+)(["'])/gi,(_,a,b,c)=>a+b.split(',').map((v:string)=>v.trim().replace(/^\S+/,rewrite)).join(', ')+c)
          .replace(/<base\b[^>]*>/gi,'');
      }
      zip.file(file.path,content??file.data);
    }
    const remaining=[...queue.map(i=>i.url),...assetQueue.filter(u=>!files.has(u))];
    zip.file('manifest.json',JSON.stringify({source:first.url,exportedAt:new Date().toISOString(),limits,pages,assetAttempts:assets,resourceBytes:total,apiIncluded:!!api,entries,omittedCandidates:[...new Set(remaining)],limitations},null,2));
    zip.file('README.txt',limitations.join('\n')+'\nServe this folder through a local HTTP server. Review manifest.json before reuse. API credentials are not included.');
    const result=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
    return new NextResponse(Buffer.from(result),{headers:{'content-type':'application/zip','content-disposition':`attachment; filename="${new URL(first.url).hostname}-combined.zip"`,'cache-control':'no-store'}});
  } catch { return NextResponse.json({error:'Export failed. Check the public URL, Webflow site ID/read permissions, and retry. Credentials are never returned.'},{status:400,headers:{'cache-control':'no-store'}}); }
}
