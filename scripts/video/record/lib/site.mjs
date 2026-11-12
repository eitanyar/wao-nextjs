// Demo generated site: the site record goes through the product's own renderer
// (the compiled dist/lib modules that POST /api/site-bot/deploy uses) and is served
// from memory on 127.0.0.1. Nothing is deployed and nothing is written to data/.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes.

import { existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { htmlFictionProblems } from "./demo.mjs";

const DIST_MODULES = {
  researchToSite: ["dist/lib/site-bot/researchToSite.js", "src/lib/site-bot/researchToSite.ts"],
  researchedSite: ["dist/lib/lp/researchedSite.js", "src/lib/lp/researchedSite.ts"],
  businessHours: ["dist/lib/lp/businessHours.js", "src/lib/lp/businessHours.ts"],
  auditScore: ["dist/lib/gbp/auditScore.js", "src/lib/gbp/auditScore.ts"],
};
export const DIST_BUILD_COMMAND = "npx tsc -p tsconfig.test.json";

/** Compiled modules missing or older than their source. The recorder refuses to run on stale output. */
export function staleDist(root) {
  const out = [];
  for (const [js, ts] of Object.values(DIST_MODULES)) {
    const a = path.join(root, js);
    const b = path.join(root, ts);
    if (!existsSync(a)) out.push(`${js} is missing`);
    else if (existsSync(b) && statSync(a).mtimeMs < statSync(b).mtimeMs) out.push(`${js} is older than ${ts}`);
  }
  return out;
}

export async function loadProduct(root) {
  const stale = staleDist(root);
  if (stale.length) throw new Error(`compiled product modules are stale; run \`${DIST_BUILD_COMMAND}\`:\n- ${stale.join("\n- ")}`);
  const load = async (key) => {
    const m = await import(pathToFileURL(path.join(root, DIST_MODULES[key][0])).href);
    return m.default && typeof m.default === "object" ? { ...m.default, ...m } : m;
  };
  const [rts, rs, bh, as] = await Promise.all(["researchToSite", "researchedSite", "businessHours", "auditScore"].map(load));
  return {
    researchedRenderInputs: rts.researchedRenderInputs,
    renderResearchedSitePages: rs.renderResearchedSitePages,
    displayBusinessHours: bh.displayBusinessHours,
    scoreAudit: as.scoreAudit,
  };
}

/** Render the demo site exactly as a deploy would, on the demo's own (reserved) domain. */
export function renderDemoSite({ demo, record, product }) {
  const data = structuredClone(record.collectedData);
  const files = product.renderResearchedSitePages({
    ...product.researchedRenderInputs(data, demo.slug),
    siteUrl: demo.canonicalOrigin, // own domain from day one; .invalid so it can never resolve
    data,
    slug: demo.slug,
    pages: structuredClone(record.researchedPages),
    graphEdges: structuredClone(record.researchedGraphEdges ?? []),
  });
  const problems = htmlFictionProblems(files);
  if (problems.length) throw new Error(`rendered demo site is not demo-safe:\n- ${problems.join("\n- ")}`);
  return files;
}

/** Cloudflare-Pages-like lookup: `/x` serves x.html, `/a/` serves a/index.html. */
export function resolveSiteFile(files, pathname) {
  if (pathname.includes("..")) return null;
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  return [requested, `${requested}.html`, `${requested}index.html`].find((c) => c in files) ?? null;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };

export async function serveFiles(files) {
  const server = createServer((req, res) => {
    const file = req.method === "GET" ? resolveSiteFile(files, new URL(req.url, "http://127.0.0.1").pathname) : null;
    if (!file) {
      res.writeHead(404, { "Content-Type": TYPES[".html"], "Cache-Control": "no-store" }).end(files["404.html"] ?? "");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" }).end(files[file]);
  });
  await new Promise((ok, fail) => server.once("error", fail).listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((ok) => server.close(ok)) };
}
