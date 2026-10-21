'use client';
import {useState} from 'react';
import Link from 'next/link';

type Summary={site:{id:string;name:string;shortName:string};pages:{id:string;title:string;path:string;draft:boolean}[];collections:{id:string;name:string;slug:string}[];limitations:string[]};
type Imported={siteId:string;pagesImported:number;collectionsImported:number;itemsImported:number;warnings:string[];message:string};
export default function WebflowMigration(){
 const [siteId,setSiteId]=useState('69e5ad295c1d96ac846056f7');
 const [token,setToken]=useState('');
 const [name,setName]=useState('Coditation Webflow Import');
 const [pages,setPages]=useState(true),[cms,setCms]=useState(true);
 const [summary,setSummary]=useState<Summary|null>(null),[imported,setImported]=useState<Imported|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(mode:'inspect'|'import'){
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/migration/webflow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode,siteId,token,...(mode==='import'?{name,importPages:pages,importCms:cms,confirm:true}:{})})});
   const result=await response.json();
   if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Request failed');
   if(mode==='inspect'){setSummary(result as Summary);setImported(null)}
   else{setImported(result as Imported)}
  }catch(e){setError(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}
 }
 return <main style={{maxWidth:880,margin:'40px auto',padding:24,fontFamily:'system-ui'}}>
  <Link href="/">← All websites</Link><h1>Import from Webflow</h1>
  <p>Copy Webflow page metadata and CMS collections into a <strong>new draft project</strong>. This does not change or publish your Webflow website.</p>
  <div style={{padding:20,border:'1px solid #8885',borderRadius:12,display:'grid',gap:16}}>
   <label>Webflow Site ID<input style={{display:'block',width:'100%',padding:10}} value={siteId} onChange={e=>{setSiteId(e.target.value);setSummary(null)}} placeholder="24-character Webflow site ID" /></label>
   <label>Webflow API token (read-only site and CMS permissions)<input style={{display:'block',width:'100%',padding:10}} type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste a token; it will not be saved" /></label>
   <button type="button" onClick={()=>void submit('inspect')} disabled={busy||!token||!/^[a-f0-9]{24}$/.test(siteId)} style={{padding:12}}>{busy?'Working…':'Connect & inspect'}</button>
   <small>The token is transmitted only to this app's authenticated server. It is not written to the database. Use a least-privilege token and an HTTPS deployment.</small>
  </div>
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
  {summary&&<section style={{marginTop:24}}>
   <h2>{summary.site.name}</h2>
   <p>Found {summary.pages.length} page records and {summary.collections.length} CMS collections.</p>
   <details><summary>View pages</summary><ul>{summary.pages.map(x=><li key={x.id}>{x.title} — {x.path||'(template)'} {x.draft?'(draft)':''}</li>)}</ul></details>
   <details><summary>View collections</summary><ul>{summary.collections.map(x=><li key={x.id}>{x.name} ({x.slug})</li>)}</ul></details>
   <div style={{display:'grid',gap:12,marginTop:24}}>
    <label>New project name<input style={{display:'block',padding:10,width:'100%'}} value={name} maxLength={120} onChange={e=>setName(e.target.value)}/></label>
    <label><input type="checkbox" checked={pages} onChange={e=>setPages(e.target.checked)}/> Import page inventory and SEO metadata</label>
    <label><input type="checkbox" checked={cms} onChange={e=>setCms(e.target.checked)}/> Import CMS collection fields and draft entries</label>
    <p><strong>Important:</strong> This does not transfer Webflow Designer element trees, full CSS, visual styling, interactions, live forms, or working third-party scripts. Those need a separate visual migration workflow.</p>
    <button type="button" disabled={busy||!name.trim()||(!pages&&!cms)} onClick={()=>void submit('import')} style={{padding:12}}>{busy?'Importing…':'Import into new draft project'}</button>
   </div>
  </section>}
  {imported&&<section role="status" style={{marginTop:24}}>
   <h2>Draft project created</h2>
   <p>{imported.pagesImported} pages · {imported.collectionsImported} collections · {imported.itemsImported} CMS entries.</p>
   <p>{imported.message}</p>
   {imported.warnings.length>0&&<div><h3>Warnings</h3><ul>{imported.warnings.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
   <Link href={'/project?siteId='+encodeURIComponent(imported.siteId)}>Open imported project →</Link>
  </section>}
 </main>;
}
