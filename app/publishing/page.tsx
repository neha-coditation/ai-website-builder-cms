'use client';
import { readJsonResponse } from '../../lib/read-json-response';
import {Suspense,useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
type Issue={severity:'blocker'|'warning';code:string;page?:string;message:string};
type Report={siteName:string;summary:{pages:number;assets:number;blockers:number;warnings:number};readyForPreview:boolean;readyForProduction:boolean;issues:Issue[];note:string};
function Workspace(){
 const params=useSearchParams(),siteId=params.get('siteId')||'';
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{if(!siteId){setError('Select a website first.');setLoading(false);return;}let live=true;
 fetch('/api/sites/'+encodeURIComponent(siteId)+'/publish-preflight',{cache:'no-store'}).then(async r=>{const data=await readJsonResponse(r);if(!r.ok)throw Error(data.error||'Unable to check publishing readiness');return data}).then(data=>{if(live)setReport(data)}).catch(e=>{if(live)setError(String(e))}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[siteId,revision]);
 return <main style={{maxWidth:920,margin:'48px auto',padding:24,fontFamily:'system-ui'}}>
  <Link href={siteId?'/project?siteId='+encodeURIComponent(siteId):'/'}>← Project overview</Link>
  <h1>Publishing readiness</h1><button type="button" onClick={()=>{setLoading(true);setError('');setRevision(value=>value+1)}} disabled={loading||!siteId}>Run checks again</button><p>This is a read-only preflight. Publishing, domains and rollback are not yet available.</p>
  {loading?<p role="status">Checking site…</p>:error?<p role="alert">{error}</p>:report&&<>
   <h2>{report.siteName}</h2>
   <p>Pages: {report.summary.pages} · Assets: {report.summary.assets} · Blockers: {report.summary.blockers} · Warnings: {report.summary.warnings}</p>
   <p><strong>Preview readiness:</strong> {report.readyForPreview?'Preflight passed':'Blocked'}</p>
   <p><strong>Production publishing:</strong> Not yet available</p>
   <button type="button" onClick={()=>{const blob=new Blob([JSON.stringify({siteId,checkedAt:new Date().toISOString(),report},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='publishing-preflight-'+siteId+'.json';a.click();URL.revokeObjectURL(url)}}>Export QA report</button>
   <h3>Checks</h3>
   {report.issues.length===0?<p>No content preflight issues detected. Additional browser and security QA is still required.</p>:<ul>{report.issues.map((issue,i)=><li key={i}><strong>{issue.severity.toUpperCase()}</strong> — {issue.page?issue.page+': ':''}{issue.message}</li>)}</ul>}
   <p>{report.note}</p>
  </>}
 </main>;
}
export default function PublishingPage(){return <Suspense fallback={<p>Loading publishing checks…</p>}><Workspace/></Suspense>}
