import type { Metadata } from "next";
import AstraHome from "@/components/home/AstraHome";
import copy from "@/content/astra-homepage-copy.json";
import finalCopy from "@/content/astra-authority-first-homepage-copy.json";

export const metadata: Metadata = {
  title: { absolute: copy.metadata.seo.homepage_title_tag_current },
  description: finalCopy.hero.body,
};

export default function HomePage() {
  return <AstraHome />;
}