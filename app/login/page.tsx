'use client';
import { readJsonResponse } from '../../lib/read-json-response';
import {FormEvent,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense} from 'react';
function Login(){
 const router=useRouter();const params=useSearchParams();const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');
  try{const response=await fetch('/api/admin-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data=await readJsonResponse(response);if(!response.ok)throw Error(data.error||'Login failed');const next=params.get('next')||'/';router.replace(next.startsWith('/')&&!next.startsWith('//')?next:'/');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Login failed')}finally{setBusy(false)}
 }
 return <main className="studio-login-page"><form onSubmit={submit} className="studio-login-card"><div className="studio-login-logo">✦ Studio CMS</div><p>PRIVATE WORKSPACE</p><h1>Welcome back</h1><span>Sign in to manage websites, content and submissions.</span><label htmlFor="admin-password">Admin password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your admin password"/>{error&&<div role="alert" className="studio-login-error">{error}</div>}<button type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button><small>Single-admin development access · team roles coming later</small></form></main>;
}
export default function LoginPage(){return <Suspense fallback={<p>Loading sign-in…</p>}><Login/></Suspense>}
