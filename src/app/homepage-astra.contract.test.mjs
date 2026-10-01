import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TextDecoder } from "node:util";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFileSync(path.join(root, relativePath));
const text = (relativePath) => read(relativePath).toString("utf8");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const sourcePath = "docs/copy/astra-homepage-copy.json";
const contentPath = "src/content/astra-homepage-copy.json";
const pagePath = "src/app/(app)/page.tsx";
const componentPath = "src/components/home/AstraHome.tsx";
const headerPath = "src/components/Header.tsx";
const footerPath = "src/components/Footer.tsx";
const cssPath = "src/app/globals.css";
const expectedHash = "2c859866cc013bbdc2fe5e8187fb1e24cf603bb183ae177d1ae71112979a2ef2";
const finalSourcePath = "docs/copy/astra-authority-first-homepage-copy.qwen38-v3-2026-09-30.json";
const finalContentPath = "src/content/astra-authority-first-homepage-copy.json";
const finalHash = "6d33903daf80329a6cef0e6dc3475aa75d752b0c8299c40cc11332945b6b37d2";
const finalBytes = read(finalSourcePath);
const finalCopy = JSON.parse(finalBytes.toString("utf8"));

const sourceBytes = read(sourcePath);
const contentBytes = read(contentPath);
const copy = JSON.parse(sourceBytes.toString("utf8"));
const activeCopy = JSON.parse(contentBytes.toString("utf8"));
const page = text(pagePath);
const component = text(componentPath);
const header = text(headerPath);
const footer = text(footerPath);
const css = text(cssPath);

test("approved base copy changes only in navigation links; final copy is byte-for-byte", () => {
  assert.equal(sha256(sourceBytes), expectedHash);
  assert.deepEqual(activeCopy.navigation.links.map(({ href }) => href), ["/google-ads", "/site-bot", "/about"]);
  assert.deepEqual({ ...activeCopy, navigation: { ...activeCopy.navigation, links: copy.navigation.links } }, { ...copy, faq: { ...copy.faq, items: copy.faq.items.filter((_, index) => index !== 4) } });
  assert.equal(sha256(finalBytes), finalHash);
  assert.equal(sha256(read(finalContentPath)), finalHash);
  assert.deepEqual(read(finalContentPath), finalBytes);
});

test("the homepage renders the Astra component without legacy sales modules", () => {
  assert.match(page, /AstraHome/);
  for (const forbidden of ["Hero", "Services", "Process", "WhyWao", "Testimonials", "BlogPreview", "CtaBanner"]) {
    assert.doesNotMatch(page, new RegExp(`components/${forbidden}`));
  }
  assert.equal((component.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /title: \{ absolute: copy\.metadata\.seo\.homepage_title_tag_current \}/);
  assert.match(page, /description: finalCopy\.hero\.body/);
  for (const field of ["eyebrow", "h1_line1", "h1_line2"]) assert.match(component, new RegExp(`copy\\.hero\\.${field}`));
  assert.deepEqual(finalCopy.metadata.seo_anchors_preserved_by_reference, {
    title: `${sourcePath}#/metadata/seo/homepage_title_tag_current`,
    h1_line1: `${sourcePath}#/hero/h1_line1`,
    h1_line2: `${sourcePath}#/hero/h1_line2`,
    hero_eyebrow: `${sourcePath}#/hero/eyebrow`,
  });
});

test("the approved story sections and CTA destinations are wired", () => {
  const retired = ["low_price", "lead_handling", "ai_search"];
  for (const id of copy.metadata.section_order.filter((id) => !retired.includes(id))) {
    assert.match(component, new RegExp(`id=[{]?['\"]${id}['\"]`), `missing section ${id}`);
  }
  for (const id of retired) assert.doesNotMatch(component, new RegExp(`<section id="${id}"|copy\\.${id}\\.`), `retired section ${id} must not render`);
  assert.deepEqual(activeCopy.navigation.links.map(({ href }) => href), ["/google-ads", "/site-bot", "/about"]);

  const hrefs = new Set([
    activeCopy.navigation.primary_cta.href,
    activeCopy.navigation.help_link.href,
    copy.hero.primary_cta.href,
    finalCopy.paths.google_ads.supporting_link.href,
    finalCopy.paths.business_website.primary_cta.href,
    finalCopy.paths.business_website.supporting_link.href,
    finalCopy.paths.choosing_help.link.href,
    finalCopy.founder_authority.about_link.href,
    finalCopy.final_cta.primary_cta.href,
    ...activeCopy.navigation.links.map((item) => item.href),
  ]);

  const shellAndPage = `${component}\n${header}\n${footer}`;
  for (const href of hrefs) {
    assert.ok(JSON.stringify(activeCopy).includes(href) || JSON.stringify(finalCopy).includes(href), `copy key missing for ${href}`);
    assert.match(shellAndPage, /copy\.|finalCopy\./, `copy data is not consumed for ${href}`);
  }
});

test("the homepage contract excludes unsupported proof and placeholders", () => {
  for (const forbidden of [
    "Testimonials",
    "testimonial-card",
    "BlogPreview",
    "Services",
    "TODO",
    "TBD",
    "placeholder",
    "lorem ipsum",
  ]) {
    assert.doesNotMatch(`${page}\n${component}`, new RegExp(forbidden, "i"));
  }
});

test("copied content contains no unexpected script ranges", () => {
  for (const copied of [contentBytes.toString("utf8"), finalBytes.toString("utf8")]) {
    assert.doesNotMatch(copied, /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u);
    assert.doesNotMatch(copied, /[\u0400-\u052f]/u);
    assert.doesNotMatch(copied, /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u);
  }
  for (const file of [page, component, video]) assert.doesNotMatch(file, /[\u0590-\u05ff]/u);
});

test("focus, responsive, and reduced-motion seams remain explicit", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.astra-home/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(header, /aria-expanded/);
  assert.match(header, /onClick=\{\(\) => setOpen\(false\)\}/);
});

const proofBytes = read("docs/copy/astra-real-proof-eeat-copy.json");
const proof = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(proofBytes));
const video = text("src/components/home/AstraProofVideo.tsx");
const accessibility = text("src/components/AccessibilityControl.tsx");
const layout = text("src/app/(app)/layout.tsx");
const about = text("src/app/(app)/about/page.tsx");
const cookie = text("src/components/CookieBanner.tsx");
const manifest = JSON.parse(text("docs/research/astra-real-proof-source-manifest.json"));
const directory = "https://partnersdirectory.withgoogle.com/partners/7030100386";

test("corrected proof bytes and reviewed fields are exact", () => {
  assert.equal(sha256(proofBytes), "0019a495a39570bc8c81b32fd516731865fcfea263b92187a65679ae7a744d09");
  assert.deepEqual(read("src/content/astra-real-proof-eeat-copy.json"), proofBytes);
  assert.equal(proofBytes.at(-1), 10);
  assert.deepEqual(Object.keys(proof), ["metadata", "hero_owner", "video_proof", "decision_guide", "partner_proof", "accountable_review", "accessibility"]);
  assert.doesNotMatch(proofBytes.toString("utf8"), /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0400-\u052f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u);
  const labels = proof.accessibility.basic_toolbar;
  for (const value of [labels.floating_control_label, labels.open_panel_label, labels.close_panel_label, labels.increase_text_label, labels.high_contrast_label, labels.underline_links_label, labels.reset_label, labels.honest_link.label]) assert.ok(typeof value === "string" && value.trim());
  assert.equal(labels.honest_link.href, "/accessibility");
});

test("final roles appear once at their assigned sections without old duplicate frames", () => {
  const sections = [...component.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sections, copy.metadata.section_order.filter((id) => !["low_price", "lead_handling", "ai_search"].includes(id)));
  assert.doesNotMatch(component, /choose_path|decision_guide|hero_owner|accountable_review|copy\.people|copy\.paths|copy\.proof|copy\.final_cta|copy\.hero\.(body|primary_cta|secondary_cta|supporting_line|mechanism_line)/);
  assert.doesNotMatch(component, /consent_label|boundary_line|figcaption|video-consent|video-boundary|privacy/i);
  assert.doesNotMatch(component, /admin\/astra-copy-review|astra-copy-review/);
  const section = (id) => component.split(`<section id="${id}"`)[1].split("</section>")[0];
  const fields = {
    hero: ["hero.body", "hero.primary_cta.label"],
    proof: ["video_proof.heading", "video_proof.context_line"],
    paths: ["paths.heading", "paths.intro", "paths.google_ads.heading", "paths.google_ads.description", "paths.google_ads.demo_status", "paths.google_ads.primary_cta.label", "paths.google_ads.supporting_link.label", "paths.business_website.heading", "paths.business_website.description", "paths.business_website.primary_cta.label", "paths.business_website.supporting_link.label", "paths.choosing_help.line", "paths.choosing_help.link.label"],
    people: ["founder_authority.name", "founder_authority.role", "founder_authority.accountability_line", "founder_authority.photo_alt", "founder_authority.about_link.label", "partner_proof.heading", "partner_proof.status_line", "partner_proof.badge_src", "partner_proof.badge_alt", "partner_proof.directory_link.label"],
    final_cta: ["final_cta.heading", "final_cta.body", "final_cta.primary_cta.label"],
  };
  for (const [id, paths] of Object.entries(fields)) for (const field of paths) {
    const reference = `finalCopy.${field}`;
    assert.ok(section(id).includes(reference), `${reference} absent from ${id}`);
    assert.equal(component.split(reference).length - 1, 1, `${reference} duplicated`);
  }
  assert.equal(finalCopy.metadata.exact_destinations.founder_photo, "/eitan-yariv.avif");
  assert.match(section("people"), /finalCopy\.metadata\.exact_destinations\.founder_photo/);
  assert.equal(finalCopy.partner_proof.directory_link.href, directory);
  assert.equal(finalCopy.partner_proof.badge_src, "/google-partner-badge.svg");
  assert.deepEqual(
    [finalCopy.paths.google_ads.primary_cta.href, finalCopy.paths.google_ads.supporting_link.href, finalCopy.paths.business_website.primary_cta.href, finalCopy.paths.business_website.supporting_link.href, finalCopy.paths.choosing_help.link.href, finalCopy.founder_authority.about_link.href],
    ["/google-ads/onboarding", "/google-ads", "/site-bot/start", "/site-bot", "/contact#contact-form", "/about"],
  );
  for (const reference of ["google_ads.primary_cta", "google_ads.supporting_link", "business_website.primary_cta", "business_website.supporting_link", "choosing_help.link"]) assert.match(section("paths"), new RegExp(`finalCopy\\.paths\\.${reference.replaceAll(".", "\\.")}\\.href`));
  assert.match(section("people"), /target="_blank" rel="noopener noreferrer"/);
});

test("video is immediately embedded with secure attributes and a direct fallback", () => {
  assert.equal(finalCopy.video_proof.embed_src, "https://www.youtube-nocookie.com/embed/zrgqx7OOtcc");
  assert.equal(finalCopy.video_proof.direct_link.href, "https://www.youtube.com/watch?v=zrgqx7OOtcc");
  for (const seam of [/src=\{copy\.embed_src\}/, /title=\{copy\.iframe_title\}/, /loading="lazy"/, /allowFullScreen/, /referrerPolicy="strict-origin-when-cross-origin"/, /href=\{copy\.direct_link\.href\}/, /target="_blank" rel="noopener noreferrer"/]) assert.match(video, seam);
  assert.doesNotMatch(`${video}\n${component}`, /autoPlay|autoplay|ytimg|preconnect|youtube\.com\/embed|figcaption|video-consent|video-boundary|consent_label|boundary_line/);
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
});

test("source manifest and exact locally stored official badge are bounded", () => {
  assert.equal(manifest.video.video_id, "zrgqx7OOtcc");
  assert.equal(manifest.video.privacy_embed_url, proof.video_proof.load_button.href);
  assert.equal(manifest.video.source_url, proof.video_proof.direct_link.href);
  for (const field of ["retrieval_date", "oembed_observed_title", "oembed_observed_channel", "channel_url", "provider", "thumbnail_url", "source_provider", "owner_authorization", "placement", "transcript_status", "quotation_boundary", "media_use_boundary", "thumbnail_review", "full_video_people_minors_review"]) assert.ok(manifest.video[field], field);
  assert.equal(manifest.video.transcript_status, "unavailable");
  assert.equal(manifest.partner.directory_url, directory);
  for (const field of ["observation_date", "observed_name", "observed_country", "observed_status", "observed_certification_coverage", "non_endorsement_boundary", "badge_retrieval_date", "badge_owner_authorization", "badge_placement_link", "badge_use_boundary"]) assert.ok(manifest.partner[field], field);
  assert.deepEqual(manifest.partner.observed_certification_coverage, ["Search", "Display"]);
  assert.equal(manifest.partner.official_badge_source_url, "https://partnersdirectory.withgoogle.com/assets/badges/google-partner-26.min.svg");
  assert.equal(manifest.partner.badge_local_public_path, "/google-partner-badge.svg");
  assert.equal(manifest.partner.badge_bytes_unmodified, true);
  assert.equal(sha256(read("public/google-partner-badge.svg")), manifest.partner.badge_sha256);
  assert.match(text("public/google-partner-badge.svg"), /<svg\b/);
  assert.equal(proof.metadata.destinations.partner_badge_local_asset, "/google-partner-badge.svg");
  assert.equal(finalCopy.partner_proof.badge_src, proof.metadata.destinations.partner_badge_local_asset);
  assert.doesNotMatch(component, /<Image[^>]*src=\{?['"]https?:\/\/(?:partnersdirectory|i\.ytimg)/);
  assert.doesNotMatch(component, /directory.screenshot|endcap|i\.ytimg/);
});

test("Organization-level sameAs is exact and founder identity unchanged", () => {
  const organization = about.match(/"@type": "Organization",[\s\S]*?founder: \{/);
  assert.ok(organization);
  assert.match(organization[0], /sameAs: \["https:\/\/partnersdirectory\.withgoogle\.com\/partners\/7030100386"\]/);
  assert.equal((organization[0].match(/partners\/7030100386/g) ?? []).length, 1);
  assert.match(about, /sameAs: \["https:\/\/www\.linkedin\.com\/in\/eitanyariv\/"\]/);
  assert.doesNotMatch(organization[0], /GooglePartner|award:|rating:|review:|endorsement:|credential:/i);
});

test("local accessibility control mounts once with storage, focus and cookie coexistence", () => {
  assert.equal((layout.match(/<AccessibilityControl\b/g) ?? []).length, 1);
  assert.match(layout, /labels=\{proof\.accessibility\.basic_toolbar\}/);
  assert.doesNotMatch(accessibility, /[\u0590-\u05ff]/u);
  assert.doesNotMatch(accessibility, /\bfetch\s*\(|<script|https?:\/\/|dangerouslySetInnerHTML/);
  for (const name of ["wao-a11y-text-large", "wao-a11y-high-contrast", "wao-a11y-underline-links", "wao-basic-accessibility-preferences-v1"]) assert.match(accessibility + css, new RegExp(name));
  for (const seam of [/aria-expanded=\{open\}/, /aria-controls="wao-a11y-panel"/, /aria-pressed=\{preferences\[key\]\}/, /event\.key === "Escape"/, /\.focus\(\)/, /localStorage\.removeItem\(STORAGE_KEY\)/, /classList\.toggle/, /ResizeObserver/, /MutationObserver/, /href=\{labels\.honest_link\.href\}/]) assert.match(accessibility, seam);
  assert.match(cookie, /className="wao-cookie-banner"/);
  assert.doesNotMatch(cookie, /SUPPRESS_ON = \[[^\]]*"\/"/);
  assert.match(accessibility, /\.wao-cookie-banner/);
  assert.match(css, /\.wao-a11y-control :focus-visible/);
});
