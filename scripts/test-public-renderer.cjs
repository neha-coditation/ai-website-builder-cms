const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const renderer=read('app/components/PublicBlockRenderer.tsx');
const page=read('app/sites/[siteSlug]/[[...path]]/page.tsx');
const save=read('app/api/projects/[siteId]/pages/[pageId]/route.ts');
test('recursive renderer does not impose depth limit and guards cycles',()=>{
 assert.match(renderer,/ancestors\.includes\(block\.id\)/);
 assert.doesNotMatch(renderer,/depth\s*[<>=]/);
});
test('dropdown renders nested children and supports default open state',()=>{
 assert.match(renderer,/block\.type==='dropdown'/);
 assert.match(renderer,/children\.map\(child=><Element/);
 assert.match(renderer,/open=\{block\.dropdownOpen\|\|undefined\}/);
 assert.doesNotMatch(renderer,/Dropdown content/);
});
test('embed never executes stored HTML',()=>{
 assert.match(renderer,/block\.type==='embed'\)return <pre/);
 assert.doesNotMatch(renderer,/dangerouslySetInnerHTML/);
});
test('CMS entries are published and site scoped',()=>{
 assert.match(page,/siteId:site\.id/);
 assert.match(page,/status:'published'/);
 assert.match(page,/cmsEntries=\{cmsEntries\}/);
});
test('page save validates breakpoint overrides and dropdown state',()=>{
 assert.match(save,/breakpointOverrides/);
 assert.match(save,/dropdownOpen: z\.boolean\(\)\.optional\(\)/);
});
