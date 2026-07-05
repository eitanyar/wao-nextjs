/**
 * Test script: deploys a minimal HTML file to Cloudflare Pages via wrangler
 * and adds wao-test.wao.co.il as a custom domain.
 *
 * Run from the wao/ directory:
 *   node scripts/test-cf-deploy.mjs
 */

import { execSync }                    from "child_process";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir }                      from "os";
import { join, resolve, dirname }      from "path";
import { fileURLToPath }               from "url";
import { readFileSync }                from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
const envPath = resolve(__dirname, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const CF_BASE  = "https://api.cloudflare.com/client/v4";
const TOKEN    = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT  = process.env.CLOUDFLARE_ACCOUNT_ID;
const SLUG     = "wao-test";
const SUBDOMAIN = `${SLUG}.wao.co.il`;

if (!TOKEN || !ACCOUNT) {
  console.error("Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID in .env.local");
  process.exit(1);
}

console.log(`\n=== CF Pages Deploy Test ===`);
console.log(`Slug:      ${SLUG}`);
console.log(`Subdomain: ${SUBDOMAIN}\n`);

// ── 1. Write HTML to temp dir ─────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><title>WAO — בדיקת Cloudflare Pages</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px;">
  <h1>✅ Cloudflare Pages עובד!</h1>
  <p>הדף הזה הועלה אוטומטית על ידי WAO Bot.</p>
  <p style="color:#888;font-size:0.85rem;">slug: ${SLUG} | ${new Date().toISOString()}</p>
</body>
</html>`;

const tmpDir = join(tmpdir(), `wao-cf-test-${Date.now()}`);
mkdirSync(tmpDir, { recursive: true });
writeFileSync(join(tmpDir, "index.html"), html, "utf-8");
console.log(`Step 1: HTML written to ${tmpDir}`);

// ── 2. Deploy via wrangler ────────────────────────────────────────────────────
console.log("\nStep 2: wrangler pages deploy...");
try {
  execSync(
    `npx wrangler pages deploy "${tmpDir}" --project-name "${SLUG}" --branch main`,
    {
      env: { ...process.env, CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT },
      stdio: "inherit",
    }
  );
} catch (err) {
  console.error("❌ wrangler deploy failed");
  rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
}
rmSync(tmpDir, { recursive: true, force: true });

// ── 3. Add custom subdomain via REST API ──────────────────────────────────────
console.log(`\nStep 3: Add custom domain ${SUBDOMAIN}...`);
const domainRes = await fetch(
  `${CF_BASE}/accounts/${ACCOUNT}/pages/projects/${SLUG}/domains`,
  {
    method: "POST",
    headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: SUBDOMAIN }),
  }
);
const domainData = await domainRes.json();
if (!domainRes.ok) {
  const alreadyExists = JSON.stringify(domainData).includes("already");
  if (alreadyExists) {
    console.log("  → already attached (ok)");
  } else {
    console.warn("⚠️  Custom domain failed:", JSON.stringify(domainData?.errors ?? domainData, null, 2));
    console.log("  Add manually: CNAME  wao-test  →  wao-test.pages.dev");
  }
} else {
  console.log(`  → ${SUBDOMAIN} added ✓`);
}

console.log(`\n=== Done ===`);
console.log(`Visit: https://${SLUG}.pages.dev`);
console.log(`Or:    https://${SUBDOMAIN}  (DNS ~1 min)\n`);
