import type { Viewport } from "next";
import "../offline-fonts.css";
import { preload } from "react-dom";
import Script from "next/script";
import "../globals.css";

// viewport-fit=cover required for iOS safe-area-inset-bottom on the sticky CTA bar
export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function StandaloneLayout({
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
        {children}
        <Script
          id="gtm-lp"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQP3PVB');`,
          }}
        />
      </body>
    </html>
  );
}
