import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Process from "@/components/Process";
import WhyWao from "@/components/WhyWao";
import Testimonials from "@/components/Testimonials";
import BlogPreview from "@/components/BlogPreview";
import CtaBanner from "@/components/CtaBanner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <Process />
      <WhyWao />
      <Testimonials />
      <BlogPreview />
      <CtaBanner />
    </>
  );
}
