const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const checker=path.join(__dirname,'check-cloudflare-env.cjs');
function run(values){
 const env={...process.env,DATABASE_URL:'',STUDIO_ADMIN_PASSWORD:'',STUDIO_SESSION_SECRET:'',...values};
 return spawnSync(process.execPath,[checker],{env,encoding:'utf8'});
}
test('fails when required settings are absent',()=>{
 const r=run({});
 assert.equal(r.status,1);
 assert.match(r.stderr,/DATABASE_URL is missing/);
 assert.match(r.stderr,/STUDIO_ADMIN_PASSWORD is missing/);
 assert.match(r.stderr,/STUDIO_SESSION_SECRET is missing/);
});
test('rejects localhost databases and weak secrets',()=>{
 const r=run({DATABASE_URL:'postgresql://u:p@localhost:5432/db',STUDIO_ADMIN_PASSWORD:'short',STUDIO_SESSION_SECRET:'short'});
 assert.equal(r.status,1);
 assert.match(r.stderr,/local database/);
 assert.match(r.stderr,/at least 12 characters/);
 assert.match(r.stderr,/at least 32 characters/);
});
test('accepts valid-looking settings without printing secrets',()=>{
 const password='unique-password-example-1234',secret='super-secret-example-value-1234567890';
 const r=run({DATABASE_URL:'postgresql://u:p@db.example.com:5432/studio',STUDIO_ADMIN_PASSWORD:password,STUDIO_SESSION_SECRET:secret});
 assert.equal(r.status,0);
 assert.match(r.stdout,/PASS/);
 assert.doesNotMatch(r.stdout+r.stderr,/unique-password-example|super-secret-example/);
});
test('rejects non-PostgreSQL URL',()=>{
 const r=run({DATABASE_URL:'mysql://user:pass@db.example.com/database',STUDIO_ADMIN_PASSWORD:'strong-password-123',STUDIO_SESSION_SECRET:'this-is-a-long-enough-test-secret'});
 assert.equal(r.status,1);
 assert.match(r.stderr,/must be PostgreSQL/);
});
