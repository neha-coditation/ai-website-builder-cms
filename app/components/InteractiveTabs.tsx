'use client';
import { useEffect, useId, useState } from 'react';
type Props={labels:string[];contents?:string[];className?:string};
export default function InteractiveTabs({labels,contents=[],className}:Props){
 const [active,setActive]=useState(0);
 const base=useId().replace(/:/g,'');
 useEffect(()=>{if(active>=labels.length)setActive(0);},[active,labels.length]);
 if(!labels.length)return <p>Add tab labels in the Content inspector.</p>;
 function select(index:number){setActive(index);}
 function onKeyDown(event:React.KeyboardEvent<HTMLButtonElement>,index:number){
  const next=event.key==='ArrowRight'? (index+1)%labels.length:event.key==='ArrowLeft'?(index-1+labels.length)%labels.length:event.key==='Home'?0:event.key==='End'?labels.length-1:-1;
  if(next>=0){event.preventDefault();select(next);const list=event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');list?.[next]?.focus();}
 }
 return <div className={className||'interactive-tabs'} onClick={e=>e.stopPropagation()}>
  <div role="tablist" aria-label="Content tabs" className="interactive-tabs-list">
   {labels.map((label,index)=><button key={index} id={base+'-tab-'+index} role="tab" type="button" aria-selected={index===active} aria-controls={base+'-panel-'+index} tabIndex={index===active?0:-1} className={index===active?'active':''} onClick={()=>select(index)} onKeyDown={e=>onKeyDown(e,index)}>{label}</button>)}
  </div>
  {labels.map((label,index)=><div key={index} id={base+'-panel-'+index} role="tabpanel" aria-labelledby={base+'-tab-'+index} hidden={index!==active} tabIndex={0} className="interactive-tabs-panel"><p>{contents[index]||'Add content for '+label+' in the Content inspector.'}</p></div>)}
 </div>;
}
