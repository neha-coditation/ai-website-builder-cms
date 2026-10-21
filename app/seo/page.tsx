'use client';
import { readJsonResponse } from '../../lib/read-json-response';
import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
type Issue={severity:'error'|'warning';page:string;code:string;message:string};
type Report={slug:string;pages:{id:string;path:string;title:string;description:string}[];issues:Issue[];summary:{pages:number;errors:number;warnings:number};previewOnly:boolean};
function SeoPageContent(){
 const params=useSearchParams();const siteId=params.get('siteId')||'';
 const [report,setReport]=useState<Report|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 async function run(){if(!siteId)return;setLoading(true);setError('');try{const response=await fetch('/api/projects/'+encodeURIComponent(siteId)+'/seo-audit',{cache:'no-store'});if(!response.ok)throw new Error('Audit request failed: '+response.status);setReport(await readJsonResponse(response));}catch(e){setError(e instanceof Error?e.message:'Unable to run audit')}finally{setLoading(false)}}
 useEffect(()=>{void run()},[siteId]);
 return <main style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px',fontFamily:'Inter,system-ui,sans-serif'}}>
  <a href={'/project?siteId='+encodeURIComponent(siteId)}>← Website workspace</a>
  <h1>SEO Manager</h1><p>Review metadata and basic content checks before publishing. Preview websites remain noindex.</p>
  <button onClick={()=>void run()} disabled={loading||!siteId}>{loading?'Checking…':'Run audit again'}</button> <a href={'/settings?siteId='+encodeURIComponent(siteId)}>Edit SEO settings</a>
  {error&&<p role="alert">{error}</p>}
  {report&&<><section style={{display:'flex',gap:24,margin:'24px 0'}}><strong>Pages: {report.summary.pages}</strong><strong>Errors: {report.summary.errors}</strong><strong>Warnings: {report.summary.warnings}</strong></section>
  <h2>Issues</h2>{report.issues.length===0?<p>No issues detected by these basic checks.</p>:<ul>{report.issues.map((issue,i)=><li key={i}><strong>{issue.severity.toUpperCase()}</strong> · {issue.page} · {issue.message}</li>)}</ul>}
  <h2>Pages</h2><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}><thead><tr><th>Path</th><th>SEO title</th><th>Description</th></tr></thead><tbody>{report.pages.map(page=><tr key={page.id}><td>{page.path}</td><td>{page.title||'Missing'}</td><td>{page.description||'Missing'}</td></tr>)}</tbody></table></>}
 </main>
}

export default function SeoPage(){return <Suspense fallback={<main style={{padding:40}}>Loading SEO Manager…</main>}><SeoPageContent/></Suspense>}
