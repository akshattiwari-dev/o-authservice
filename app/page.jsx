import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TableOfContents from "@/components/TableOfContents";
import FooterCTA from "@/components/FooterCTA";

export const metadata = {
  title: "o-auth 2.0 Simplified",
  description:
    "An illustrated, plain-language guide to the OAuth 2.0 authorization framework, written by Aaron Parecki.",
  openGraph: {
    title: "o-auth 2.0 Simplified",
    description:
      "An illustrated, plain-language guide to the OAuth 2.0 authorization framework, written by Aaron Parecki.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "o-auth 2.0 Simplified",
    description:
      "An illustrated, plain-language guide to the OAuth 2.0 authorization framework, written by Aaron Parecki.",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div style={{ paddingTop: "var(--header-height)" }}>
        <Hero />
        <TableOfContents />
        <FooterCTA />
      </div>
    </main>
  );
}
