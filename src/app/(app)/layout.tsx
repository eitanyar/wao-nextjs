import type { Metadata } from "next";
import { Rubik, Assistant } from "next/font/google";
import Script from "next/script";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import ExitSurveyPopup from "@/components/ExitSurveyPopup";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wao.co.il"),
  title: {
    default: "WAO | שיווק דיגיטלי שמביא תוצאות",
    // RLM (‏) after %s anchors the title's end to RTL before the Latin brand, so a
    // title ending in a Latin token (…SEO/…URL) can't bidi-swap with "WAO" in RTL SERPs.
    template: "%s‏ | WAO",
  },
  description:
    "סוכנות שיווק דיגיטלי מובילה בישראל עם 20+ שנות ניסיון. קידום אתרים, פרסום בגוגל, שיווק תוכן ויעוץ אסטרטגי — ללא חוזה, עם תוצאות.",
  keywords: [
    "שיווק דיגיטלי",
    "קידום אתרים",
    "SEO",
    "פרסום בגוגל",
    "Google Ads",
    "יועץ שיווקי",
    "שיווק תוכן",
    "ישראל",
  ],
  authors: [{ name: "איתן יריב", url: "https://www.wao.co.il/about" }],
  creator: "WAO",
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://www.wao.co.il",
    siteName: "WAO",
    title: "WAO | שיווק דיגיטלי שמביא תוצאות",
    description:
      "סוכנות שיווק דיגיטלי מובילה בישראל עם 20+ שנות ניסיון.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "https://www.wao.co.il" },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://www.wao.co.il/#org",
  name: "WAO",
  alternateName: "וואו שיווק דיגיטלי",
  description:
    "סוכנות שיווק דיגיטלי מובילה בישראל. מתמחים בקידום אתרים, פרסום בגוגל ושיווק תוכן.",
  url: "https://www.wao.co.il",
  telephone: "+972526148860",
  foundingDate: "2006",
  address: {
    "@type": "PostalAddress",
    addressLocality: "ראשון לציון",
    addressCountry: "IL",
  },
  knowsAbout: [
    "SEO",
    "Google Ads",
    "Content Marketing",
    "Digital Marketing Strategy",
    "Social Media Marketing",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${assistant.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PQP3PVB"
            height="0" width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        <Header />
        <main id="main-content" style={{ flex: 1 }}>{children}</main>
        <Footer />
        <CookieBanner />
        <ExitSurveyPopup />
        {/* Google Tag Manager */}
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQP3PVB');`,
          }}
        />
      </body>
    </html>
  );
}
