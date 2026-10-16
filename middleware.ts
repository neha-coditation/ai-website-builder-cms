import {NextRequest,NextResponse} from 'next/server';
import {SESSION_COOKIE,verifyAdminSession} from './lib/admin-session';
export async function middleware(request:NextRequest){
 const path=request.nextUrl.pathname;
 if(path==='/login'||path==='/api/admin-session'||path.startsWith('/_next/')||path==='/favicon.ico'||path.startsWith('/sites/')||path==='/api/form-submit')return NextResponse.next();
 const protectedRoute=path==='/'||path.startsWith('/api/')||['/designer','/project','/settings','/forms','/cms','/publishing'].some(p=>path===p||path.startsWith(p+'/'));
 if(!protectedRoute)return NextResponse.next();
 const secret=process.env.STUDIO_SESSION_SECRET;
 const password=process.env.STUDIO_ADMIN_PASSWORD;
 if(!secret||secret.length<32||!password)return new NextResponse('Studio admin access is not configured. Set STUDIO_ADMIN_PASSWORD and STUDIO_SESSION_SECRET.',{status:503});
 const valid=await verifyAdminSession(request.cookies.get(SESSION_COOKIE)?.value,secret);
 if(!valid){
  if(path.startsWith('/api/'))return NextResponse.json({error:'Unauthorized'},{status:401});
  const url=request.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path+request.nextUrl.search);return NextResponse.redirect(url);
 }
 if(path.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(request.method)){
  const origin=request.headers.get('origin');
  if(origin){try{if(new URL(origin).host!==request.headers.get('host'))return NextResponse.json({error:'Origin not allowed'},{status:403})}catch{return NextResponse.json({error:'Invalid origin'},{status:403})}}
 }
 return NextResponse.next();
}
export const config={matcher:['/','/api/:path*','/designer/:path*','/project/:path*','/settings/:path*','/forms/:path*','/cms/:path*','/publishing/:path*']};
