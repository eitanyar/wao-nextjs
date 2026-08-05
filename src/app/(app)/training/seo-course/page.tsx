import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
export const metadata: Metadata = {
  title: "קורס קידום אתרים SEO",
  alternates: { canonical: "https://www.wao.co.il/training/seo-course" },
};
export default function Page() { return <ComingSoon title="קורס קידום אתרים" />; }
