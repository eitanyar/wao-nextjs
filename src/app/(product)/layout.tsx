import type { Viewport } from "next";
import { Rubik, Assistant } from "next/font/google";
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

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${assistant.variable}`}>
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
