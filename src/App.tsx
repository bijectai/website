import { useEffect } from "react";
import { About } from "./components/About";
import { AizawaAttractor } from "./components/AizawaAttractor";
import { Careers } from "./components/Careers";
import { Demo } from "./components/Demo";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { NotFound } from "./components/NotFound";
import { Problem } from "./components/Problem";
import { Solution } from "./components/Solution";
import { TopBar } from "./components/TopBar";

export default function App() {
  // Arriving at e.g. /#demo from another page is a full navigation: the
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

  // No router: switch on the pathname. The root renders the site, /about the
  // About page, and anything else falls back to the default 404 page.
  const path = window.location.pathname;
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
      <AizawaAttractor />
      <Hero />
      {/* Pushes the bar down to the bottom of the first screen; from there
          the sticky TopBar rides up on scroll and locks to the top. */}
      <div className="hero-spacer" aria-hidden="true" />
      <TopBar />
      <main id="app">
        <Problem />
        <Solution />
        <Demo />
      </main>
      <Footer />
    </>
  );
}
