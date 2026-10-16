CREATE TABLE "SiteAsset" (
 "id" TEXT NOT NULL,
 "siteId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "url" TEXT NOT NULL,
 "alt" TEXT NOT NULL DEFAULT '',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteAsset_siteId_createdAt_idx" ON "SiteAsset"("siteId", "createdAt");
ALTER TABLE "SiteAsset" ADD CONSTRAINT "SiteAsset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
