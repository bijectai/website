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

// Whether the system can draw a real glyph for `char`, rather than the font's
// .notdef "tofu" box. We render the char and a guaranteed-unassigned codepoint
// (U+FFFF, which always falls back to .notdef) and compare the pixels: a match
// means `char` had no glyph either. Used to pick the tab-title separator, where
// no CSS font fallback is available. Assumes support if canvas is unavailable.
function glyphRenders(char: string): boolean {
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  ctx.font = `${size}px sans-serif`;
  ctx.textBaseline = "top";

  const paint = (c: string) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillText(c, 0, 0);
    return ctx.getImageData(0, 0, size, size).data.join(",");
  };

  return paint(char) !== paint("￿");
}

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

  // Tab title reflects the current page: "biject ↦ home / mission / join us".
  // The ↦ (mapsto) glyph nods to the brand, but a tab title can't be styled
  // or given a font fallback — so we probe whether the system can actually
  // render ↦ and degrade to a plain "|" separator when it can't.
  useEffect(() => {
    const sep = glyphRenders("↦") ? "↦" : "|";
    const pages: Record<string, string> = {
      "/": "home",
      "/about": "mission",
      "/careers": "join us",
    };
    const key = window.location.pathname.replace(/\/+$/, "") || "/";
    const page = pages[key];
    document.title = page ? `biject ${sep} ${page}` : "biject";
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
