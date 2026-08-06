import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WAO | שיווק דיגיטלי שמביא תוצאות",
    short_name: "WAO",
    description:
      "סוכנות שיווק דיגיטלי מובילה בישראל עם 20+ שנות ניסיון. קידום אתרים, פרסום בגוגל, שיווק תוכן ויעוץ אסטרטגי.",
    start_url: "/",
    display: "standalone",
    background_color: "#060709",
    theme_color: "#060709",
    lang: "he",
    dir: "rtl",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
