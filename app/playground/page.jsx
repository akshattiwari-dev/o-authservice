import Header from "@/components/Header";
import FooterCTA from "@/components/FooterCTA";
import PlaygroundApp from "@/components/playground/PlaygroundApp";

export const metadata = {
  title: "o-auth 2.0 Playground — o-auth 2.0 Simplified",
  description:
    "Run a real OAuth 2.0 authorization code flow with PKCE against a live server, with every request and response streamed in real time.",
};

export default function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <div style={{ paddingTop: "var(--header-height)" }}>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-16">
          <div className="text-center">
            <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[2.5rem]">
              o-auth 2.0 Playground
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.75] text-muted">
              Run a real authorization code flow with PKCE against the live
              o-auth server. Every request and response streams into the log
              below in real time.
            </p>
          </div>

          <div className="mt-10">
            <PlaygroundApp />
          </div>

          <p className="mt-10 text-center text-sm text-muted">
            New to o-auth? Start with the{" "}
            <a href="/oauth2-servers/background/" className="text-accent hover:underline">
              Background chapter
            </a>{" "}
            before jumping into the playground, or read the{" "}
            <a href="/docs" className="text-accent hover:underline">
              full documentation
            </a>{" "}
            for a worked example with real requests.
          </p>
        </section>

        <FooterCTA />
      </div>
    </main>
  );
}
