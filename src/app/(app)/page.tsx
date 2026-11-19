import type { Metadata } from "next";
import AstraHome from "@/components/home/AstraHome";
import copy from "@/content/astra-homepage-copy.json";

export const metadata: Metadata = {
  title: { absolute: copy.metadata.seo.homepage_title_tag_current },
  description: copy.metadata.seo.homepage_meta_description,
};

export default function HomePage() {
  return <AstraHome />;
}