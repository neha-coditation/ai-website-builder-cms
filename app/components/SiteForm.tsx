'use client';
import {useState} from 'react';
type Props={siteId:string;formId:string;pageSlug:string;title:string;successMessage:string;className?:string;style?:React.CSSProperties};
export default function SiteForm({siteId,formId,pageSlug,title,successMessage,className,style}:Props){
 const [status,setStatus]=useState<'idle'|'sending'|'success'|'error'>('idle');
 const [error,setError]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(status==='sending')return;
  const form=event.currentTarget;const values=new FormData(form);
  const website=String(values.get('website')||'');
  const fields={name:String(values.get('name')||''),email:String(values.get('email')||''),message:String(values.get('message')||'')};
  setStatus('sending');setError('');
  try{
   const response=await fetch('/api/form-submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId,formId,pageSlug,fields,website})});
   if(!response.ok){const result=await response.json().catch(()=>({}));throw Error(result.error||'Submission failed');}
   form.reset();setStatus('success');
  }catch(e){setError(e instanceof Error?e.message:'Submission failed');setStatus('error');}
 }
 return <form className={className} style={style} onSubmit={submit}><strong>{title||'Contact'}</strong><label>Name<input name="name" required maxLength={200} autoComplete="name"/></label><label>Email<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label>Message<textarea name="message" maxLength={5000}/></label><div aria-hidden="true" style={{position:'absolute',left:'-9999px'}}><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><button type="submit" disabled={status==='sending'}>{status==='sending'?'Sending…':'Submit'}</button><p aria-live="polite" role={status==='error'?'alert':'status'}>{status==='success'?successMessage:status==='error'?error:''}</p></form>;
}
