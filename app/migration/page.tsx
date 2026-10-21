'use client';
import {readJsonResponse} from '../../lib/read-json-response';
import {useState} from 'react';
type Inventory={sourceUrl:string;title:string;description:string;canonical:string;webflow:boolean;headings:number;forms:number;links:string[];images:string[];stylesheets:string[];scripts:string[];notes:string[]};
export default function MigrationPage(){
 const [sites,setSites]=useState<Array<{id:string;displayName?:string;shortName?:string}>>([]);const [siteId,setSiteId]=useState('');const [connected,setConnected]=useState<Record<string,unknown>|null>(null);const [connectionBusy,setConnectionBusy]=useState(false);const [connectionError,setConnectionError]=useState('');
 async function loadWebflow(id?:string){setConnectionBusy(true);setConnectionError('');try{const response=await fetch('/api/migration/webflow'+(id?'?siteId='+encodeURIComponent(id):''),{cache:'no-store'});const data=await readJsonResponse(response);if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Webflow connection failed');if(id){setConnected(data as Record<string,unknown>);}else{setSites(Array.isArray(data.sites)?data.sites:[]);setConnected(null);}}catch(error){setConnectionError(error instanceof Error?error.message:'Webflow connection failed');}finally{setConnectionBusy(false);}}
 const [url,setUrl]=useState('');const [html,setHtml]=useState('');const [report,setReport]=useState<Inventory|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function inspect(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');setReport(null);setBusy(true);
  try{
   const response=await fetch('/api/migration/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceUrl:url,html})});
   const data=await readJsonResponse(response);
   if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Unable to inspect HTML');
   setReport(data as Inventory);
  }catch(e){setError(e instanceof Error?e.message:'Inspection failed');}finally{setBusy(false);}
 }
 return <main style={{maxWidth:900,margin:'40px auto',padding:24,fontFamily:'system-ui'}}>
  <a href="/">← All websites</a><h1>Webflow migration readiness</h1>
  <p>Step 1 of 4: inspect an exported HTML page. This is a read-only inventory, not a site migration. Your Webflow website remains unchanged.</p>
  <section style={{border:'1px solid #cbd5e1',borderRadius:12,padding:20,marginBottom:28}}>
   <h2>Connect Webflow (read-only)</h2><p>Use a server-side Webflow API token to discover accessible sites, pages and CMS collections. No source content is changed.</p>
   <button type="button" disabled={connectionBusy} onClick={()=>void loadWebflow()}>{connectionBusy?'Connecting…':'Load Webflow sites'}</button>
   {sites.length>0&&<div style={{marginTop:12}}><label>Webflow site <select value={siteId} onChange={event=>setSiteId(event.target.value)}><option value="">Select site</option>{sites.map(site=><option key={site.id} value={site.id}>{site.displayName||site.shortName||site.id}</option>)}</select></label> <button type="button" disabled={!siteId||connectionBusy} onClick={()=>void loadWebflow(siteId)}>Inspect site</button></div>}
   {connectionError&&<p role="alert" style={{color:'#b91c1c'}}>{connectionError}</p>}
   {connected&&<div aria-live="polite"><h3>Webflow inventory</h3><p>Pages: {Array.isArray(connected.pages)?connected.pages.length:0} · CMS collections: {Array.isArray(connected.collections)?connected.collections.length:0}</p><ul>{(Array.isArray(connected.pages)?connected.pages:[]).slice(0,25).map((page:unknown,index:number)=>{const p=page as {id?:string;title?:string;slug?:string};return <li key={p.id||index}>{p.title||p.slug||p.id||'Untitled page'}</li>})}</ul><p>Read-only inventory. Import and visual reconstruction are not implemented yet.</p></div>}
  </section>
  <form onSubmit={inspect} style={{display:'grid',gap:16}}>
   <label>Published Webflow page URL<input required type="url" pattern="https://.*" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.webflow.io/" style={{display:'block',width:'100%',padding:12,marginTop:8}}/></label>
   <label>Exported HTML source<textarea required value={html} onChange={e=>setHtml(e.target.value)} rows={10} maxLength={2000000} placeholder="Paste the page HTML from your Webflow export here" style={{display:'block',width:'100%',padding:12,marginTop:8}}/></label>
   <button type="submit" disabled={busy||!url||!html} style={{padding:12,cursor:'pointer'}}>{busy?'Inspecting…':'Inspect HTML without importing'}</button>
  </form>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  {report&&<section aria-live="polite" style={{marginTop:32}}>
   <h2>Read-only inventory</h2><p><strong>Page title:</strong> {report.title||'Missing'}</p><p><strong>Meta description:</strong> {report.description||'Missing'}</p><p><strong>Canonical:</strong> {report.canonical||'Missing'}</p><p><strong>Webflow markers:</strong> {report.webflow?'Detected':'Not detected'}</p>
   <p>H1 tags: {report.headings} · Forms: {report.forms} · Links: {report.links.length} · Images: {report.images.length} · Stylesheets: {report.stylesheets.length} · Scripts: {report.scripts.length}</p>
   <h3>Detected assets</h3><ul>{report.images.slice(0,15).map((src,i)=><li key={i} style={{overflowWrap:'anywhere'}}>{src}</li>)}</ul>
   <h3>Limitations</h3><ul>{report.notes.map((note,i)=><li key={i}>{note}</li>)}</ul>
  </section>}
 </main>;
}
