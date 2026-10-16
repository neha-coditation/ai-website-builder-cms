/* Run before configuring or deploying a Cloudflare Worker.
 * Checks environment presence without printing secret values. */
const required=['DATABASE_URL','STUDIO_ADMIN_PASSWORD','STUDIO_SESSION_SECRET'];
const errors=[];
for(const name of required)if(!process.env[name])errors.push(name+' is missing');
if(process.env.STUDIO_SESSION_SECRET && process.env.STUDIO_SESSION_SECRET.length<32)errors.push('STUDIO_SESSION_SECRET must be at least 32 characters');
if(process.env.DATABASE_URL){
 try{
  const url=new URL(process.env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(url.protocol))errors.push('DATABASE_URL must be PostgreSQL');
  if(!url.hostname)errors.push('DATABASE_URL hostname is missing');
  if(['localhost','127.0.0.1','::1'].includes(url.hostname))errors.push('DATABASE_URL points to a local database inaccessible from Cloudflare Workers');
 }catch{errors.push('DATABASE_URL is not a valid URL')}
}
if(process.env.STUDIO_ADMIN_PASSWORD && process.env.STUDIO_ADMIN_PASSWORD.length<12)errors.push('STUDIO_ADMIN_PASSWORD must be at least 12 characters');
console.log('Cloudflare deployment preflight (secret values hidden)');
if(errors.length){for(const error of errors)console.error('FAIL:',error);process.exitCode=1;}
else console.log('PASS: required environment variables are present and basic formats look valid. Runtime/database connectivity is NOT verified.');
