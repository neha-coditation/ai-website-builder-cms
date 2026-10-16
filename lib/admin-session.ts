const encoder=new TextEncoder();
export const SESSION_COOKIE='studio_admin_session';
const TTL_SECONDS=60*60*8;
function toBase64Url(bytes:Uint8Array){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function signature(payload:string,secret:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));
}
export async function createAdminSession(secret:string){
 const payload=toBase64Url(encoder.encode(JSON.stringify({role:'admin',expires:Math.floor(Date.now()/1000)+TTL_SECONDS})));
 return payload+'.'+await signature(payload,secret);
}
export async function verifyAdminSession(token:string|undefined,secret:string|undefined){
 if(!token||!secret||secret.length<32)return false;
 const parts=token.split('.');if(parts.length!==2||parts[0].length>1000||parts[1].length!==43)return false;
 const expected=await signature(parts[0],secret);
 // Compare each character without early exit.
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^parts[1].charCodeAt(i);
 if(mismatch!==0)return false;
 try{
  const raw=parts[0].replace(/-/g,'+').replace(/_/g,'/');
  const payload=JSON.parse(atob(raw)) as {role?:string;expires?:number};
  return payload.role==='admin'&&typeof payload.expires==='number'&&payload.expires>Math.floor(Date.now()/1000);
 }catch{return false;}
}
export const sessionDuration=TTL_SECONDS;
