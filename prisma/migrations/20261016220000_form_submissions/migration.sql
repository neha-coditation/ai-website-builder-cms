CREATE TABLE "FormSubmission" ("id" TEXT NOT NULL,"siteId" TEXT NOT NULL,"formId" TEXT NOT NULL,"pageSlug" TEXT NOT NULL,"data" JSONB NOT NULL,"status" TEXT NOT NULL DEFAULT 'new',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id"));
CREATE INDEX "FormSubmission_siteId_createdAt_idx" ON "FormSubmission"("siteId","createdAt");
CREATE INDEX "FormSubmission_siteId_formId_createdAt_idx" ON "FormSubmission"("siteId","formId","createdAt");
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
