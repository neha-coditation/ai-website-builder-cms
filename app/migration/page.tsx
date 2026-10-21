'use client';
import {readJsonResponse} from '../../lib/read-json-response';
import {useState} from 'react';
type Inventory={sourceUrl:string;title:string;description:string;canonical:string;webflow:boolean;headings:number;forms:number;links:string[];images:string[];stylesheets:string[];scripts:string[];notes:string[]};
export default function MigrationPage(){
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
