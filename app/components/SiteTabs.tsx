'use client';
import { useState } from 'react';
type Props={id:string;labels:string[];contents?:string[];className?:string;style?:React.CSSProperties};
export default function SiteTabs({id,labels,contents=[],className,style}:Props){
 const [active,setActive]=useState(0);
 const items=labels.length?labels:['Tab 1','Tab 2'];
 return <div className={className} style={style}>
  <div role="tablist" aria-label="Content tabs" style={{display:'flex',gap:8,borderBottom:'1px solid #cbd5e1',flexWrap:'wrap'}}>
   {items.map((label,index)=><button key={index} type="button" role="tab" id={id+'-tab-'+index} aria-controls={id+'-panel-'+index} aria-selected={active===index} tabIndex={active===index?0:-1} onClick={()=>setActive(index)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const next=(active+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;setActive(next);document.getElementById(id+'-tab-'+next)?.focus();}else if(event.key==='Home'||event.key==='End'){event.preventDefault();const next=event.key==='Home'?0:items.length-1;setActive(next);document.getElementById(id+'-tab-'+next)?.focus();}}} style={{padding:'10px 14px',border:'none',borderBottom:active===index?'2px solid #3064fe':'2px solid transparent',background:'transparent',color:'inherit',cursor:'pointer'}}>{label}</button>)}
  </div>
  {items.map((label,index)=><div key={index} id={id+'-panel-'+index} role="tabpanel" aria-labelledby={id+'-tab-'+index} hidden={active!==index} tabIndex={0} style={{padding:'16px 4px',whiteSpace:'pre-wrap'}}>{contents[index]||label+' content'}</div>)}
 </div>;
}
