import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "../../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { verifyAdminSession, SESSION_COOKIE } from "../../../../lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const credentials = z.object({
  token: z.string().min(10).max(2048),
  siteId: z.string().regex(/^[0-9a-f]{24}$/),
});
const selection = credentials.extend({
  name: z.string().trim().min(1).max(120),
  importPages: z.boolean().default(true),
  importCms: z.boolean().default(true),
  confirm: z.literal(true),
});
type RecordData = Record<string, unknown>;
const asRecord = (value: unknown): RecordData =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {};
const list = (data: unknown, key: string): RecordData[] =>
  Array.isArray(asRecord(data)[key]) ? (asRecord(data)[key] as unknown[]).map(asRecord) : [];
const str = (value: unknown) => typeof value === "string" ? value : "";
const slugify = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "import";
const origin = "https://api.webflow.com";

async function authorize(request: Request) {
  const secret = process.env.STUDIO_SESSION_SECRET;
  if (!secret) return false;
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return false;
  return verifyAdminSession(session, secret);
}
function originAllowed(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;
  try { return new URL(originHeader).host === new URL(request.url).host; }
  catch { return false; }
}
async function webflow(path: string, token: string): Promise<RecordData> {
  const response = await fetch(origin + path, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    // Never expose the upstream response, which can contain account details.
    throw new Error(`Webflow returned HTTP ${response.status} for ${path.split("?")[0]}`);
  }
  return asRecord(await response.json());
}
async function getAll(path: string, key: string, token: string, max = 2000) {
  const results: RecordData[] = [];
  for (let offset = 0; offset < max; offset += 100) {
    const separator = path.includes("?") ? "&" : "?";
    const data = await webflow(`${path}${separator}limit=100&offset=${offset}`, token);
    const batch = list(data, key);
    results.push(...batch);
    const total = Number(asRecord(data.pagination).total);
    if (!batch.length || batch.length < 100 || (Number.isFinite(total) && total > 0 && results.length >= total)) break;
  }
  return results;
}
async function source(token: string, siteId: string) {
  const sites = list(await webflow("/v2/sites", token), "sites");
  const site = sites.find(s => s.id === siteId);
  if (!site) throw new Error("This token does not have access to the selected Webflow site.");
  return site;
}
function fieldsFromWebflow(collection: RecordData) {
  return (Array.isArray(collection.fields) ? collection.fields : []).map(item => {
    const field = asRecord(item);
    const type = str(field.type);
    const converted = type === "RichText" ? "richText" : type === "Number" ? "number" :
      type === "Switch" ? "boolean" : type === "DateTime" ? "date" :
      ["Image", "MultiImage", "File"].includes(type) ? "image" :
      ["Reference", "MultiReference"].includes(type) ? "reference" : "text";
    return { name: str(field.displayName) || str(field.slug), slug: str(field.slug), type: converted, webflowType: type };
  }).filter(f => f.name);
}
function draftPage(page: RecordData) {
  const title = (str(page.title) || "Untitled").slice(0, 120);
  const seo = asRecord(page.seo);
  const graph = asRecord(page.openGraph);
  return {
    name: title,
    blocks: [],
    seo: {
      title: str(seo.title).slice(0, 70),
      description: str(seo.description).slice(0, 320),
      noindex: !!page.draft,
      ogImage: str(graph.imageUrl),
    },
    migration: {
      source: "webflow",
      pageId: str(page.id),
      publishedPath: str(page.publishedPath),
      draft: !!page.draft,
      note: "Metadata imported. Page design and static body elements are not included in the Data API response.",
    },
  };
}
function responseError(error: unknown) {
  console.error("[webflow-import]", error instanceof Error ? error.message : "Unexpected failure");
  return NextResponse.json({error: error instanceof Error ? error.message : "Webflow import failed."}, {status: 502});
}
export async function POST(request: Request) {
  if (!await authorize(request)) return NextResponse.json({error: "Administrator session required."}, {status: 401});
  if (!originAllowed(request)) return NextResponse.json({error: "Invalid request origin."}, {status: 403});
  if (Number(request.headers.get("content-length") || 0) > 10000)
    return NextResponse.json({error: "Request too large."}, {status: 413});
  const data = await request.json().catch(() => null);
  const mode = asRecord(data).mode;
  if (mode === "inspect") {
    const parsed = credentials.safeParse(data);
    if (!parsed.success) return NextResponse.json({error:"Enter a valid Webflow site ID and API token."}, {status:400});
    try {
      const {token, siteId} = parsed.data;
      const site = await source(token, siteId);
      const [pages, collections] = await Promise.all([
        getAll(`/v2/sites/${siteId}/pages`, "pages", token),
        webflow(`/v2/sites/${siteId}/collections`, token).then(x => list(x, "collections")),
      ]);
      return NextResponse.json({
        site: {id: str(site.id), name: str(site.displayName), shortName: str(site.shortName)},
        pages: pages.map(page => ({id: str(page.id), title: str(page.title), path: str(page.publishedPath), draft: !!page.draft})),
        collections: collections.map(c => ({id: str(c.id), name: str(c.displayName), slug: str(c.slug)})),
        limitations: ["Webflow's Data API doesn't supply complete Designer HTML/CSS or interactions.", "CMS fields and entries can be copied; relationships and visuals need review."],
      }, {headers:{"Cache-Control":"no-store"}});
    } catch (error) { return responseError(error); }
  }
  if (mode !== "import") return NextResponse.json({error:"Invalid mode."}, {status:400});
  const parsed = selection.safeParse(data);
  if (!parsed.success || (!parsed.success ? false : !parsed.data.importPages && !parsed.data.importCms))
    return NextResponse.json({error:"Select pages or CMS collections, and confirm the import."}, {status:400});
  const {siteId, token, name, importPages, importCms} = parsed.data;
  try {
    await source(token, siteId);
    const prisma = getPrisma();
    // Create a new site: never overwrite an existing project or mutate Webflow.
    const site = await prisma.site.create({
      data: {name, slug: `${slugify(name).slice(0, 55)}-${crypto.randomUUID().slice(0, 8)}`,
        siteConfig: {migration: {provider:"webflow", sourceSiteId:siteId, importedAt:new Date().toISOString(), status:"in-progress"}}},
    });
    let pagesImported = 0, collectionsImported = 0, itemsImported = 0;
    const warnings: string[] = [];
    try {
      if (importPages) {
        const pages = await getAll(`/v2/sites/${siteId}/pages`, "pages", token);
        for (const page of pages) {
          const publishedPath = str(page.publishedPath);
          const segments = publishedPath.split("/").filter(Boolean);
          const wanted = segments.length ? slugify(segments.join("-")) : "home";
          const slug = wanted.slice(0, 75) + (pagesImported && wanted === "home" ? "-" + pagesImported : "");
          await prisma.page.create({
            data: {siteId:site.id, title:(str(page.title) || "Untitled").slice(0,120),
              slug:slug.slice(0,90), content:draftPage(page) as Prisma.InputJsonValue},
          }).catch(async err => {
            if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
            await prisma.page.create({data:{siteId:site.id,title:(str(page.title)||"Untitled").slice(0,120),
              slug:`${slug.slice(0,70)}-${str(page.id).slice(-8)}`,
              content:draftPage(page) as Prisma.InputJsonValue}});
          });
          pagesImported++;
        }
      }
      if (importCms) {
        const collections = list(await webflow(`/v2/sites/${siteId}/collections`, token), "collections");
        for (const collection of collections) {
          try {
            const id = str(collection.id);
            const detail = await webflow(`/v2/collections/${id}`, token);
            const local = await prisma.cmsCollection.create({data:{
              siteId:site.id, name:str(collection.displayName) || "Untitled",
              slug:`${slugify(str(collection.slug) || str(collection.displayName)).slice(0,75)}-${id.slice(-6)}`,
              fields:fieldsFromWebflow(detail) as Prisma.InputJsonValue,
            }});
            collectionsImported++;
            const items = await getAll(`/v2/collections/${id}/items`, "items", token, 10000);
            for (const item of items) {
              const fieldData = asRecord(item.fieldData);
              const rawSlug = str(fieldData.slug) || str(item.id);
              const entrySlug = `${slugify(rawSlug).slice(0,75)}-${str(item.id).slice(-7)}`;
              await prisma.cmsEntry.create({data:{
                collectionId:local.id, slug:entrySlug,
                data:{...fieldData, _webflowId:str(item.id), _sourceCollectionId:id} as Prisma.InputJsonValue,
                status:"draft",
              }});
              itemsImported++;
            }
          } catch (error) {
            warnings.push(`Collection ${str(collection.displayName) || str(collection.id)}: ${error instanceof Error ? error.message : "failed"}`);
          }
        }
      }
      await prisma.site.update({where:{id:site.id}, data:{siteConfig:{
        migration:{provider:"webflow",sourceSiteId:siteId,importedAt:new Date().toISOString(),status:warnings.length?"partial":"complete",
          pagesImported,collectionsImported,itemsImported,warnings}} as Prisma.InputJsonValue}});
    } catch (error) {
      await prisma.site.update({where:{id:site.id},data:{siteConfig:{migration:{provider:"webflow",sourceSiteId:siteId,status:"partial",warnings:[error instanceof Error?error.message:"Import interrupted"]}} as Prisma.InputJsonValue}});
      return NextResponse.json({error:"Import interrupted; partial project retained for review.",siteId:site.id,pagesImported,collectionsImported,itemsImported}, {status:502});
    }
    return NextResponse.json({siteId:site.id,pagesImported,collectionsImported,itemsImported,warnings,
      message:"Imported into a new draft project. Webflow site unchanged; nothing published."},
      {headers:{"Cache-Control":"no-store"}});
  } catch(error) {return responseError(error);}
}
