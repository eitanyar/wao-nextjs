import type { Viewport } from "next";
import "../offline-fonts.css";
import { preload } from "react-dom";
import Script from "next/script";
import "../globals.css";

// Product/authenticated route group — GEO Bot & GMB Bot action pages,
// dashboards, login/signup flows, account/subscription management, checkout,
// admin, and coaching session rooms. Deliberately has NO marketing chrome
// (Header/Footer/CookieBanner/ExitSurveyPopup) — these are in-product,
// tokenized or auth-gated surfaces, not landing pages, per Maya's mobile UX
// audit. Each page builds its own minimal shell (see e.g. ActionHeader,
// StatusBar) instead of inheriting site nav/footer meant for marketing pages.
// Mirrors the existing (standalone)/layout.tsx pattern — a second root
// layout via route groups; see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md.

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  preload("/offline-fonts/1a072933b891bea6-s.p.0ag2x0_84lov2.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/offline-fonts/4c42083b9bffcb01-s.p.01zus3.tz2k99.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/offline-fonts/87c7f5b5afcd23bd-s.p.06avho5za9mi..woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/offline-fonts/c9f6ebf08ddd616b-s.p.08ydm43xlmlw2.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="he" dir="rtl">
      <body>
        {/* Google Tag Manager (noscript) — tracking still applies in-product per Dror's direction */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PQP3PVB"
            height="0" width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Script
          id="gtm-product"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQP3PVB');`,
          }}
        />
      </body>
    </html>
  );
}
