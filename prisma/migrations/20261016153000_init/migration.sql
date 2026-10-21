-- Initial baseline matching prisma/schema.prisma (Prisma 6, PostgreSQL).
-- Tested on Neon isolated branch br-crimson-brook-b5zmsy3k.
CREATE TABLE "Site" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT '', "faviconUrl" TEXT NOT NULL DEFAULT '', "defaultTitle" TEXT NOT NULL DEFAULT '', "globalDesign" JSONB NOT NULL DEFAULT '{}', "siteConfig" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Site_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Page" ("id" TEXT NOT NULL, "siteId" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL, "content" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Page_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CmsCollection" ("id" TEXT NOT NULL, "siteId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "fields" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CmsCollection_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CmsEntry" ("id" TEXT NOT NULL, "collectionId" TEXT NOT NULL, "slug" TEXT NOT NULL, "data" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'draft', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CmsEntry_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SiteAsset" ("id" TEXT NOT NULL, "siteId" TEXT NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "alt" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SiteComponent" ("id" TEXT NOT NULL, "siteId" TEXT NOT NULL, "name" TEXT NOT NULL, "blocks" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SiteComponent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "FormSubmission" ("id" TEXT NOT NULL, "siteId" TEXT NOT NULL, "formId" TEXT NOT NULL, "pageSlug" TEXT NOT NULL, "data" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'new', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");
CREATE UNIQUE INDEX "Page_siteId_slug_key" ON "Page"("siteId", "slug");
CREATE UNIQUE INDEX "CmsCollection_siteId_slug_key" ON "CmsCollection"("siteId", "slug");
CREATE UNIQUE INDEX "CmsEntry_collectionId_slug_key" ON "CmsEntry"("collectionId", "slug");
CREATE INDEX "SiteAsset_siteId_createdAt_idx" ON "SiteAsset"("siteId", "createdAt");
CREATE INDEX "SiteComponent_siteId_createdAt_idx" ON "SiteComponent"("siteId", "createdAt");
CREATE INDEX "FormSubmission_siteId_createdAt_idx" ON "FormSubmission"("siteId", "createdAt");
CREATE INDEX "FormSubmission_siteId_formId_createdAt_idx" ON "FormSubmission"("siteId", "formId", "createdAt");
ALTER TABLE "Page" ADD CONSTRAINT "Page_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsCollection" ADD CONSTRAINT "CmsCollection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CmsCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteAsset" ADD CONSTRAINT "SiteAsset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteComponent" ADD CONSTRAINT "SiteComponent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
