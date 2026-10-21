// Integration smoke test: exercises database persistence and rolls back every test record.
// Requires DATABASE_URL and an already migrated PostgreSQL database.
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  const marker = randomUUID();
  let rolledBack = false;
  try {
    await prisma.$transaction(async tx => {
      const site = await tx.site.create({data:{name:'QA temporary site',slug:'qa-'+marker}});
      const page = await tx.page.create({data:{siteId:site.id,title:'Home',slug:'home',content:{name:'Home',blocks:[]}}});
      const changed = {name:'Home',blocks:[{id:'qa-heading',type:'heading',text:'Persistence check'}]};
      await tx.page.update({where:{id:page.id},data:{content:changed}});
      const reloaded = await tx.page.findUniqueOrThrow({where:{id:page.id}});
      assert.deepEqual(reloaded.content, changed, 'Designer page content did not persist');

      const submission = await tx.formSubmission.create({data:{siteId:site.id,formId:'qa-form',pageSlug:'home',data:{name:'QA',email:'qa@example.invalid'}}});
      const reloadedSubmission = await tx.formSubmission.findUniqueOrThrow({where:{id:submission.id}});
      assert.equal(reloadedSubmission.data.email, 'qa@example.invalid', 'Form submission did not persist');
      console.log('PASS: page save/reload and form submission database persistence');
      throw new Error('__ROLLBACK_QA__');
    });
  } catch (error) {
    if (error instanceof Error && error.message === '__ROLLBACK_QA__') rolledBack = true;
    else throw error;
  }
  assert.ok(rolledBack, 'Expected QA transaction rollback');
  const leftovers = await prisma.site.count({where:{slug:'qa-'+marker}});
  assert.equal(leftovers, 0, 'QA test records were not rolled back');
  console.log('PASS: QA test data rolled back; existing websites untouched');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
