// The real screens of the Site Bot intro storyboard
// (docs/missions/video-intro-site-bot-2026-11-12.md, "Real screens S1-S4").
// A shot is a script of steps; each check that fails stops the shot, so a
// recording never shows something the product does not do.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes.

import { FLICK_MAX_PX_PER_S } from "./motion.mjs";

const count = (page, selector) => page.evaluate((s) => document.querySelectorAll(s).length, selector);
const onScreen = (page, selector) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return false;
  const b = el.getBoundingClientRect();
  return b.top >= 0 && b.bottom <= innerHeight && b.width > 0;
}, selector);

export const SHOTS = {
  S1: {
    beat: "B05",
    title: "Demo site: home page, services, into one service page",
    source: "site",
    async run(ctx, env) {
      const link = `a[href="${env.demo.servicePath}"]`;
      await ctx.goto(`${env.siteUrl}/`);
      ctx.check("home lists at least two services", (await count(ctx.page, "#services h3")) >= 2);
      ctx.check("every service has its own page", env.servicePaths.length >= 2 && env.servicePaths.every((p) => env.sitePaths.includes(p)), env.servicePaths.join(" "));
      await ctx.hold(1);
      await ctx.scrollTo("#services");
      ctx.mark("services-grid");
      await ctx.hold(1.2);
      const cardsAreLinks = (await count(ctx.page, `#services ${link}`)) > 0;
      const target = cardsAreLinks ? `#services ${link}` : `[data-section="related-links"] ${link}`;
      if (!cardsAreLinks) ctx.note("service-cards", "the service cards on the home page are not links; the tap uses the service link list lower on the page");
      ctx.check("a link to the service page exists on the home page", (await count(ctx.page, target)) > 0, target);
      if (!(await onScreen(ctx.page, target))) {
        await ctx.scrollTo(target, { align: "center" });
        ctx.mark("service-links");
        await ctx.hold(0.5);
      }
      await ctx.tap(target, { navigates: true });
      ctx.mark("service-page");
      ctx.check("landed on the service page", new URL(ctx.page.url()).pathname === env.demo.servicePath, ctx.page.url());
      await ctx.hold(1.6);
    },
  },

  S2: {
    beat: "B06",
    title: "Demo site: service page, call button, opening hours",
    source: "site",
    async run(ctx, env) {
      const call = 'a[data-hero-call][href^="tel:"]';
      await ctx.goto(`${env.siteUrl}${env.demo.servicePath}`);
      ctx.check("call button on the service page", (await count(ctx.page, call)) === 1);
      ctx.check("call link on every page of the site", env.pagesWithoutCall.length === 0, env.pagesWithoutCall.join(" "));
      ctx.check("the business has opening hours to show", Boolean(env.hoursText));
      await ctx.hold(0.8);
      await ctx.pulse(call); // ring only: never a click, so no dialler and no ringing
      await ctx.hold(0.8);
      let hours = await ctx.findText(env.hoursText, "hours");
      if (!hours) {
        ctx.note("hours-placement", "opening hours are not shown on the service page (only on the contact page and in the page's structured data); the hours part is recorded on the contact page after a cut");
        ctx.mark("cut-to-contact");
        await ctx.goto(`${env.siteUrl}/contact`);
        hours = await ctx.findText(env.hoursText, "hours");
        ctx.check("opening hours visible on the contact page", Boolean(hours));
        await ctx.hold(0.5);
      }
      await ctx.scrollTo(hours, { align: "center" });
      ctx.mark("hours");
      await ctx.hold(1.6);
    },
  },

  S3: {
    beat: "B10",
    title: "Intake chat /site-bot/start",
    source: "app",
    blocked: "gate G4 has not passed (/site-bot/start is 404 in production); the chat replies come from a live model, so a stable recording needs a seeded reply script; the demo owner's answers are Hebrew that must come from the copy pipeline",
  },

  S4: {
    beat: "B12",
    title: "Free check /site-bot/audit: type the name, cut to the six-item result",
    source: "app",
    async run(ctx, env) {
      const input = "#audit-business-name";
      const submit = 'form:has(#audit-business-name) button[type="submit"]';
      const confirm = '.wao-section button.btn-primary[type="button"]';
      await ctx.goto(`${env.baseUrl}/site-bot/audit`);
      await ctx.page.waitForSelector(input, { timeout: 60000 });
      await ctx.hold(0.8);
      await ctx.tap(input);
      await ctx.type(input, env.audit.typedName);
      await ctx.hold(0.5);
      if (!(await onScreen(ctx.page, submit))) await ctx.scrollTo(submit, { align: "center" });
      await ctx.tap(submit);
      ctx.mark("cut-to-result");
      await ctx.offRecord(async (page) => {
        // Not shown: the spinner and the "is this your business?" step.
        await page.waitForSelector(confirm, { timeout: 30000 });
        await page.click(confirm);
        await page.waitForSelector("[data-audit-id]", { timeout: 30000 });
        await page.evaluate(() => scrollTo(0, 0));
      });
      const seen = await ctx.page.evaluate(() => ({
        auditId: document.querySelector("[data-audit-id]")?.getAttribute("data-audit-id"),
        dims: [...document.querySelectorAll("[data-dimension]")].map((d) => `${d.getAttribute("data-dimension")}:${d.getAttribute("data-status")}`),
        buy: document.querySelectorAll("[data-paid-buy-cta]").length,
      }));
      const want = env.audit.result.score.dimensions.map((d) => `${d.key}:${d.status}`);
      ctx.check("result is the seeded audit", seen.auditId === env.demo.audit.auditId, String(seen.auditId));
      ctx.check("six scorecard items, as scored by the product", seen.dims.length === 6 && seen.dims.join() === want.join(), seen.dims.join(" "));
      ctx.check("buy button is off (production flags)", seen.buy === 0);
      await ctx.hold(1);
      await ctx.scrollTo("[data-dimension]:last-of-type", { align: "bottom" });
      ctx.mark("scorecard-end");
      await ctx.hold(1.2);
    },
  },
};

// Full demo site (Eitan, 2026-11-14): home, the owner in the about section, a quick flick past the reviews (on screen at
// most MAX_REVIEWS_ON_SCREEN_S, enforced per clip by record.mjs), landing on the first work photo of the gallery.
// Records as S1_{set}_FULLSITE. Needs the seed's dressing (photos + reviews, lib/dressing.mjs).
const stickyHeader = (page) => page.evaluate(() => [...document.querySelectorAll("header,nav")].filter((h) => ["sticky", "fixed"].includes(getComputedStyle(h).position)).reduce((m, h) => Math.max(m, h.getBoundingClientRect().height), 0));
SHOTS.S1F = {
  beat: "B05",
  clip: "S1",
  variant: "FULLSITE",
  title: "Demo site, full: home, owner photo, work photos, a quick pass over the reviews",
  source: "site",
  async run(ctx, env) {
    await ctx.goto(`${env.siteUrl}/`);
    const seen = await ctx.page.evaluate(() => {
      const loaded = (el) => Boolean(el && el.complete && el.naturalWidth > 0);
      const cards = [...document.querySelectorAll("[data-demo-reviews] [data-review-card]")];
      return {
        owner: loaded(document.querySelector("#about [data-demo-owner]")),
        work: [...document.querySelectorAll("#gallery [data-demo-work]")].map(loaded),
        cards: cards.length,
        texts: cards.map((c) => c.querySelector("[data-review-text]")?.textContent.trim() ?? ""),
        filters: cards.map((c) => getComputedStyle(c.querySelector("[data-review-text]")).filter),
        order: ["#about", "[data-demo-reviews]", "#gallery"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1),
      };
    });
    const wantCards = env.reviews?.cards.length ?? 0;
    ctx.check("owner photo loaded in the about section", seen.owner);
    ctx.check("every work photo loaded in the gallery", seen.work.length === (env.demo.dressing?.photos?.work.length ?? -1) && seen.work.every(Boolean), seen.work.join(" "));
    ctx.check("one review card per approved review", wantCards > 0 && seen.cards === wantCards, `${seen.cards}/${wantCards}`);
    ctx.check("review text is the approved copy, never a placeholder", seen.texts.every((t, i) => t === env.reviews.cards[i].text.trim() && !/REVIEW_TEXT_PENDING/.test(t)));
    ctx.check("review text is plain (no blur or filter, Eitan 2026-11-14)", seen.filters.every((f) => f === "none"), seen.filters.join(" "));
    ctx.check("about, reviews, gallery in that order", seen.order.every((y, i) => y >= 0 && (i === 0 || y > seen.order[i - 1])), seen.order.join(" "));
    await ctx.hold(1);
    // The owner pause ends the about section at the bottom edge, so no review card shows while the frame is still.
    const aboutEnd = await ctx.page.evaluate(() => Math.floor(document.querySelector("#about").getBoundingClientRect().bottom + scrollY - innerHeight));
    await ctx.scrollTo(aboutEnd);
    ctx.check("the owner photo is fully on screen", await onScreen(ctx.page, "#about [data-demo-owner]"));
    ctx.mark("owner");
    await ctx.hold(1.6);
    // The flick lands with the gallery right under the header (1px tucked under it: section edges are sub-pixel), so the
    // last review card is fully off screen; the owner stop is floored for the same reason.
    ctx.mark("reviews-flick");
    await ctx.scrollTo("#gallery", { offset: Math.max(0, Math.floor(await stickyHeader(ctx.page)) - 1), maxSpeed: FLICK_MAX_PX_PER_S, minSeconds: 0.3 });
    ctx.mark("work-photo");
    ctx.check("the first work photo is fully on screen", await onScreen(ctx.page, '#gallery [data-demo-work="0"]'));
    await ctx.hold(1.6);
  },
};

// Ads Bot leads screen (A2-15 PRD beat). Leads come from the sandbox (adsSandbox.mjs), never data/clients.
// Timing: `leadIn` seconds on the list before the tap, then the tap ring and the real click, then `tail`.
// The editor aligns the clip on the "tap" mark, so the shot's absolute length is not load-bearing.
const COLOR = { good: "rgb(74, 227, 181)", junk: "rgb(255, 94, 94)" }; // LeadsTable quality colours
SHOTS.AL1 = {
  beat: "A2-15 PRD",
  title: "Ads Bot leads /client/leads: the owner marks the one real enquiry",
  source: "app",
  needs: "adsSandbox",
  optIn: true,
  leadIn: 2.0,
  tail: 5.0,
  async run(ctx, env) {
    const sb = env.adsSandbox;
    await ctx.page.setCookie({ name: "wao-client", value: env.adsToken, url: env.baseUrl, httpOnly: true, sameSite: "Lax" });
    await ctx.goto(`${env.baseUrl}/client/leads`);
    ctx.check("landed on the leads screen (sandbox session accepted)", new URL(ctx.page.url()).pathname === "/client/leads", ctx.page.url());
    const rows = await ctx.page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((tr) => ({
      name: tr.children[2]?.textContent ?? "",
      italic: getComputedStyle(tr.children[2]?.firstElementChild ?? tr.children[2]).fontStyle === "italic",
      mark: getComputedStyle(tr.children[4]?.querySelector("button") ?? tr).color,
      dashed: getComputedStyle(tr.children[4]?.querySelector("button") ?? tr).borderStyle.includes("dashed"),
      deal: tr.children[5]?.querySelector("button") ? "button" : (tr.children[5]?.textContent ?? ""),
    })));
    ctx.check("every sandbox lead is a row, in order", rows.map((r) => r.name).join("|") === sb.leads.map((l) => l.name).join("|"), `${rows.length} rows`);
    ctx.check("no stub rows: every name shows", rows.every((r) => !r.italic));
    const tapIdx = sb.leads.findIndex((l) => l.id === sb.tapLeadId);
    ctx.check("the lead to tap shows the mark button (PENDING)", rows[tapIdx]?.dashed === true, rows[tapIdx]?.mark);
    ctx.check("every other lead is marked not real", rows.every((r, i) => i === tapIdx || r.mark === COLOR.junk), rows.map((r) => r.mark).join(" "));
    await ctx.offRecord((page) => page.evaluate((i) => {
      document.querySelectorAll("tbody tr")[i].children[4].querySelector("button").setAttribute("data-wao-rec", "mark");
    }, tapIdx));
    await ctx.hold(this.leadIn);
    ctx.mark("tap");
    await ctx.tap('[data-wao-rec="mark"]');
    ctx.mark("marked");
    await ctx.hold(this.tail);
    const after = await ctx.page.evaluate(() => getComputedStyle(document.querySelector('[data-wao-rec="mark"]')).color);
    ctx.check("the tapped lead is now marked real (the UI's own mark flow)", after === COLOR.good, after);
  },
};

export const SHOT_IDS = Object.keys(SHOTS);
