// The real screens of the Site Bot intro storyboard
// (docs/missions/video-intro-site-bot-2026-11-12.md, "Real screens S1-S4").
// A shot is a script of steps; each check that fails stops the shot, so a
// recording never shows something the product does not do.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes.

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

export const SHOT_IDS = Object.keys(SHOTS);
