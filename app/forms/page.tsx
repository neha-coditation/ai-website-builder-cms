'use client';
import {Suspense,useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
type Submission={id:string;formId:string;pageSlug:string;status:string;createdAt:string;data:Record<string,unknown>};
function Inbox(){
 const params=useSearchParams();const siteId=params.get('siteId')||'';
 const [items,setItems]=useState<Submission[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!siteId){setLoading(false);return;}let active=true;fetch('/api/projects/'+encodeURIComponent(siteId)+'/submissions',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Unable to load submissions');return r.json()}).then(v=>{if(active)setItems(v.submissions||[])}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setLoading(false)});return ()=>{active=false}},[siteId]);
 function exportCsv(){const keys=['createdAt','pageSlug','formId','name','email','message'];const esc=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=[keys.join(','),...items.map(i=>[i.createdAt,i.pageSlug,i.formId,i.data.name,i.data.email,i.data.message].map(esc).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='form-submissions.csv';a.click();URL.revokeObjectURL(url)}
 return <main className="forms-inbox"><nav><Link href="/">Dashboard</Link> / <Link href={'/settings?siteId='+encodeURIComponent(siteId)}>Site settings</Link></nav><header><div><p>FORMS</p><h1>Submissions</h1><span>Latest 500 submissions across this website</span></div><button onClick={exportCsv} disabled={!items.length}>Export CSV</button></header>{error&&<p role="alert">{error}</p>}{loading?<p>Loading submissions…</p>:!items.length?<p>No submissions yet. Add a Form element to a page and submit it in the site preview.</p>:<div className="forms-inbox-table"><table><thead><tr><th>Received</th><th>Page</th><th>Form</th><th>Name</th><th>Email</th><th>Message</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.pageSlug}</td><td>{item.formId}</td><td>{String(item.data.name||'')}</td><td>{String(item.data.email||'')}</td><td>{String(item.data.message||'')}</td></tr>)}</tbody></table></div>}</main>;
}
export default function FormsPage(){return <Suspense fallback={<p>Loading forms…</p>}><Inbox/></Suspense>}
