CREATE TABLE "SiteComponent" (
 "id" TEXT NOT NULL,
 "siteId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "blocks" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SiteComponent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteComponent_siteId_createdAt_idx" ON "SiteComponent"("siteId","createdAt");
ALTER TABLE "SiteComponent" ADD CONSTRAINT "SiteComponent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
