const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const JSZip=require('jszip');
function load(file,mocks={}) {
  const m=new Module(file,module); m.filename=file; m.paths=module.paths;
  m.require=name=>name in mocks?mocks[name]:require(name);
  m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
  return m.exports;
}
const request=body=>new Request('https://app.example/api/import/download',{method:'POST',body:JSON.stringify(body)});
test('merged export crawls pages, rewrites CSS dependencies, and keeps credentials out',async()=>{
 const sources={
  'https://example.com/':'<link href="/style.css"><a href="/about">About</a><a href="https://other.example/">Other</a>',
  'https://example.com/about':'<img src="/hero.png"><a href="/">Home</a>',
  'https://example.com/style.css':'body{background:url(/hero.png)}',
  'https://example.com/hero.png':'image'
 };
 const calls=[];let apiCalls=0;
 const {POST}=load('app/api/import/download/route.ts',{
  '../../../lib/safe-fetch':{fetchSafe:async url=>{calls.push(url);assert.ok(url in sources);return {url,contentType:url.endsWith('.css')?'text/css':url.endsWith('.png')?'image/png':'text/html',data:new TextEncoder().encode(sources[url])}}},
  '../../../lib/webflow-export':{webflowExport:async(id,token)=>{apiCalls++;assert.equal(token,'secret-token');return {site:{id},pages:[{seo:{title:'SEO'}}],cms:[{items:[{name:'Post'}]}],notes:[]}}}
 });
 const r=await POST(request({url:'https://example.com/',siteId:'12345678',token:'secret-token'}));assert.equal(r.status,200);
 const zip=await JSZip.loadAsync(await r.arrayBuffer());
 assert.equal(apiCalls,1);assert.equal(calls.length,4);
 assert.match(await zip.file('index.html').async('string'),/pages\/page-2.html/);
 assert.match(await zip.file('assets/file-1.css').async('string'),/\.\.\/assets\/file-2.png/);
 assert.match(await zip.file('webflow/data.json').async('string'),/SEO/);
 const manifest=JSON.parse(await zip.file('manifest.json').async('string'));assert.equal(manifest.pages,2);assert.equal(manifest.apiIncluded,true);
 for(const f of Object.values(zip.files))if(!f.dir)assert.ok(!(await f.async('string')).includes('secret-token'));
});
test('incomplete API credentials are rejected without fetching',async()=>{
 const {POST}=load('app/api/import/download/route.ts',{'../../../lib/safe-fetch':{fetchSafe:()=>{throw Error('should not fetch')}},'../../../lib/webflow-export':{}});
 const r=await POST(request({url:'https://example.com/',token:'secret-token'}));assert.equal(r.status,400);assert.ok(!(await r.text()).includes('secret-token'));
});
test('Webflow pagination, partial scopes and fixed-origin credential handling',async()=>{
 const original=global.fetch;const calls=[];
 global.fetch=async(url,options)=>{calls.push(url);assert.ok(url.startsWith('https://api.webflow.com/v2/'));assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer secret-token');
 if(url.endsWith('/sites/12345678'))return Response.json({displayName:'Demo'});
 if(url.includes('/pages?')&&url.includes('offset=0'))return Response.json({pages:Array.from({length:100},(_,id)=>({id})),pagination:{total:101}});
 if(url.includes('/pages?'))return Response.json({pages:[{id:100}],pagination:{total:101}});
 return new Response('',{status:403});};
 try {const {webflowExport}=load('app/lib/webflow-export.ts');const result=await webflowExport('12345678','secret-token',Date.now()+10000);assert.equal(result.pages.length,101);assert.match(result.notes.join(' '),/403/);assert.equal(calls.length,4);} finally{global.fetch=original;}
});
test('crawl stops at 20 pages and reports omitted candidates',async()=>{
 const {POST}=load('app/api/import/download/route.ts',{
 '../../../lib/safe-fetch':{fetchSafe:async url=>({url,contentType:'text/html',data:new TextEncoder().encode(Array.from({length:30},(_,i)=>`<a href="/p${i}">Page</a>`).join(''))})},'../../../lib/webflow-export':{}});
 const r=await POST(request({url:'https://example.com/'}));assert.equal(r.status,200);
 const zip=await JSZip.loadAsync(await r.arrayBuffer());const m=JSON.parse(await zip.file('manifest.json').async('string'));assert.equal(m.pages,20);assert.ok(m.omittedCandidates.length>0);
});
