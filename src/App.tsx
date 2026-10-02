import { useEffect } from "react";
import { About } from "./components/About";
import { AizawaAttractor } from "./components/AizawaAttractor";
import { Careers } from "./components/Careers";
import { EarlyAccess } from "./components/EarlyAccess";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { News } from "./components/News";
import { NewsPost } from "./components/NewsPost";
import { NotFound } from "./components/NotFound";
import { ProofField } from "./components/ProofField";
import { SdkPreview } from "./components/SdkPreview";
import { TopBar } from "./components/TopBar";
import { UseCases } from "./components/UseCases";
import { WhyNotJudge } from "./components/WhyNotJudge";
import { findPost } from "./news";
import { applySeo, routeKey } from "./seo";

export default function App() {
  // Arriving at e.g. /#research from another page is a full navigation: the
  // browser's native anchor jump fires before React has rendered the target
  // section, so it finds nothing and never scrolls. Scroll there ourselves
  // once mounted — and again after web fonts load, since they shift layout
  // enough to throw the landing position off. No-op when there's no hash.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const jump = () =>
      document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
    jump();
    document.fonts?.ready.then(jump);
  }, []);

  // Title, description, canonical and social tags for the current route.
  // Each route is already served static HTML carrying these (see the `seo`
  // plugin in vite.config.ts); this keeps them right for crawlers that run
  // JavaScript, and is the only source for the 404 route.
  useEffect(() => {
    applySeo(window.location.pathname);
  }, []);

  // No router: switch on the pathname. The root renders the site, /about the
  // About page, /news the news list and /news/<slug> a post; anything else
  // falls back to the default 404 page.
  const path = window.location.pathname;
  const key = routeKey(path);
  if (key === "/news") {
    return <News />;
  }
  if (key.startsWith("/news/")) {
    const post = findPost(key.slice("/news/".length));
    return post ? <NewsPost item={post} /> : <NotFound />;
  }
  if (path === "/about" || path === "/about/") {
    return <About />;
  }
  if (path === "/careers" || path === "/careers/") {
    return <Careers />;
  }
  if (path !== "/") {
    return <NotFound />;
  }

  return (
    <>
      {/* Back to front: background type, attractor, headline. */}
      <ProofField hero />
      <AizawaAttractor />
      <Hero />
      {/* Pushes the bar down to the bottom of the first screen; from there
          the sticky TopBar rides up on scroll and locks to the top. */}
      <div className="hero-spacer" aria-hidden="true" />
      <TopBar />
      <main id="app">
        <SdkPreview />
        <HowItWorks />
        <WhyNotJudge />
        <UseCases />
        <EarlyAccess />
      </main>
      <Footer />
    </>
  );
}
