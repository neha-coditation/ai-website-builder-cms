import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createAdminSession,SESSION_COOKIE,sessionDuration} from '../../../lib/admin-session';
const fail=()=>NextResponse.json({error:'Invalid credentials'},{status:401});
export async function POST(request:Request){
 const password=process.env.STUDIO_ADMIN_PASSWORD;
 const secret=process.env.STUDIO_SESSION_SECRET;
 if(!password||!secret||secret.length<32)return NextResponse.json({error:'Admin access is not configured. Set STUDIO_ADMIN_PASSWORD and STUDIO_SESSION_SECRET.'},{status:503});
 const origin=request.headers.get('origin');const host=request.headers.get('host');
 if(origin&&(!host||new URL(origin).host!==host))return NextResponse.json({error:'Origin not allowed'},{status:403});
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.password!=='string'||body.password.length>1000)return fail();
 const supplied=new TextEncoder().encode(body.password),expected=new TextEncoder().encode(password);
 let diff=supplied.length^expected.length;
 for(let i=0;i<Math.max(supplied.length,expected.length);i++)diff|=(supplied[i]||0)^(expected[i]||0);
 if(diff!==0)return fail();
 const session=await createAdminSession(secret);
 (await cookies()).set(SESSION_COOKIE,session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:sessionDuration});
 return NextResponse.json({ok:true});
}
export async function DELETE(){
 (await cookies()).delete(SESSION_COOKIE);
 return NextResponse.json({ok:true});
}
