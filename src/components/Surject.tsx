import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

// Surject's page: a full-bleed landscape run through a watercolor filter
// (#sj-watercolor), the headline over its clearing sky, and how it works.
// Deliberately nothing of biject's dark glass beyond the link home.

// ---------------------------------------------------------------------------
// Headline: "Start <word>" — the word decodes through Lean glyphs into the
// next one, and the wash beneath it changes pigment with it. It ends its
// line, so its changing width never moves anything else.
// ---------------------------------------------------------------------------
const WORDS = [
  { text: "proving", wash: "var(--sj-cerulean)" },
  { text: "verifying", wash: "var(--sj-rose)" },
  { text: "enforcing", wash: "var(--sj-ochre)" },
  { text: "trusting", wash: "var(--sj-sap)" },
];
const SCRAMBLE_GLYPHS = "∀∃λΣΠ⊢⊨≡∧∨¬∈∂∫";
const WORD_HOLD_MS = 2800;
const WORD_DECODE_MS = 720;

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(WORDS[0].text);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = 0;
    let raf = 0;
    let timer = 0;

    const next = () => {
      const from = WORDS[current].text;
      current = (current + 1) % WORDS.length;
      const to = WORDS[current].text;
      setIndex(current);
      if (reduceMotion) {
        setText(to);
        timer = window.setTimeout(next, WORD_HOLD_MS);
        return;
      }
      const start = performance.now();
      let lastTick = -1;
      const frame = (now: number) => {
        const p = Math.min((now - start) / WORD_DECODE_MS, 1);
        // Re-roll the unsettled glyphs ~20×/s rather than every frame, so
        // they read as symbols instead of flicker.
        const tick = Math.floor((now - start) / 50);
        if (tick !== lastTick || p === 1) {
          lastTick = tick;
          const length = Math.round(from.length + (to.length - from.length) * p);
          const settled = Math.floor(p * to.length);
          let out = "";
          for (let i = 0; i < length; i += 1) {
            out +=
              i < settled
                ? to[i]
                : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
          }
          setText(out);
        }
        if (p < 1) raf = requestAnimationFrame(frame);
        else timer = window.setTimeout(next, WORD_HOLD_MS);
      };
      raf = requestAnimationFrame(frame);
    };

    timer = window.setTimeout(next, WORD_HOLD_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span
      className="sj-word"
      aria-hidden="true"
      style={{ "--wash": WORDS[index].wash } as CSSProperties}
    >
      <span className="sj-word-wash" />
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Install: one command with copy, and the docs beside it.
// ---------------------------------------------------------------------------
const INSTALL_COMMAND = "pip install biject-surject";
// Docs aren't published yet; this route falls through to the 404 page.
const DOCS_HREF = "/surject/docs";

function Install() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="sj-install">
      <div className="sj-install-cmd sj-glass">
        <code>
          <span className="sj-install-prompt" aria-hidden="true">$</span>
          {INSTALL_COMMAND}
        </code>
        <button
          type="button"
          className="sj-install-copy"
          onClick={() =>
            navigator.clipboard?.writeText(INSTALL_COMMAND).then(() => setCopied(true))
          }
          aria-label={copied ? "Copied" : "Copy install command"}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a className="sj-docs sj-glass-light" href={DOCS_HREF}>
        Documentation <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The hero's background: the painting, watercolored, drifting slowly and
// leaning away from the pointer, with loose blooms of pigment moving over it.
// ---------------------------------------------------------------------------
function HeroBackground({ imgRef }: { imgRef: RefObject<HTMLImageElement | null> }) {
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [imgRef]);

  return (
    <div className={`sj-bg${loaded ? " is-loaded" : ""}`} aria-hidden="true">
      <div className="sj-bg-parallax">
        <div className="sj-bg-drift">
          <img
            ref={imgRef}
            className="sj-bg-img"
            src="/surject/oxbow.jpg"
            alt=""
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
      <div className="sj-bg-blooms">
        <span className="sj-bloom sj-bloom-a" />
        <span className="sj-bloom sj-bloom-b" />
        <span className="sj-bloom sj-bloom-c" />
      </div>
      <div className="sj-bg-veil" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The glyph lens: wherever the pointer moves, the painting under it breaks
// into Lean / LaTeX symbols — each one taking the painting's own pigment at
// that spot, denser where the paint is darker — and they flicker, then
// settle back into paint once the pointer rests.
// ---------------------------------------------------------------------------
const LENS_GLYPHS =
  "·∘∶∴∵¬∼≈≃≅≠≤≥≺≻→←↔↦⇒⇔⟹⟨⟩∧∨⋀⋁∩∪∈∉∋⊂⊃⊆⊇∖∅∞∝√∣∥⊥⊤⊢⊣⊨≡∀∃∄" +
  "λαβγδεθμπστφψωΓΔΘΛΞΣΠΦΨΩ∑∏∫∮∂∇ℕℤℚℝℂ⊕⊗⊙⋆†‡⌊⌋⌈⌉";
const LENS_RADIUS = 92; // css px
const LENS_LIFE_MS = 1100; // how long a fully lit cell takes to fade
const LENS_CELL_W = 10;
const LENS_CELL_H = 16;
const LENS_FONT = 14;
const LENS_SAMPLE_W = 640; // the painting is sampled from a copy this wide

// How much darker than the paint beneath it a symbol is drawn.
const LENS_DEEPEN = 0.8;
const PAPER = [246, 240, 228];

// A raw painting pixel → the color the page actually shows at hero-local
// (x, y): the tail of #sj-watercolor (saturate 1.35, then the lift toward
// paper), then .sj-bg-veil's two layers — the foot fading into paper and the
// clear air behind the copy. Keep in step with those two if either changes.
function onScreen(
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  width: number,
  height: number,
  narrow: boolean,
): [number, number, number] {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const lift = [0.28, 0.27, 0.25];
  let rgb = [r, g, b].map((channel, k) => {
    const saturated = Math.min(255, Math.max(0, lum + (channel - lum) * 1.35));
    return saturated * 0.72 + lift[k] * 255;
  });
  const wash = (alpha: number) => {
    rgb = rgb.map((channel, k) => channel * (1 - alpha) + PAPER[k] * alpha);
  };
  // Bottom layer first: the foot of the frame.
  wash(Math.min(Math.max((y / height - 0.72) / 0.28, 0), 1));
  // Then the clear air: an ellipse fading from its peak to nothing.
  const [cx, cy, rx, ry, peak, reach] = narrow
    ? [0.5, 0.3, 0.9, 0.48, 0.8, 0.75]
    : [0.76, 0.44, 0.52, 0.62, 0.78, 0.72];
  const d = Math.hypot((x - cx * width) / (rx * width), (y - cy * height) / (ry * height));
  wash(peak * Math.max(0, 1 - d / reach));
  return [rgb[0], rgb[1], rgb[2]];
}

// Lightest to densest, measured in whichever font ends up drawing them.
function sortByInk(glyphs: string[], family: string): number[] {
  const size = 40;
  const probe = document.createElement("canvas");
  probe.width = size;
  probe.height = size;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return glyphs.map((_, i) => i);
  pctx.font = `${size * 0.8}px ${family}`;
  pctx.textAlign = "center";
  pctx.textBaseline = "middle";
  pctx.fillStyle = "#000";
  const ink = glyphs.map((glyph) => {
    pctx.clearRect(0, 0, size, size);
    pctx.fillText(glyph, size / 2, size / 2);
    const data = pctx.getImageData(0, 0, size, size).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return sum;
  });
  return glyphs.map((_, i) => i).sort((a, b) => ink[a] - ink[b]);
}

function GlyphLens({ imgRef }: { imgRef: RefObject<HTMLImageElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imgRef.current;
    const hero = canvas?.parentElement;
    if (!canvas || !ctx || !img || !hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const family = getComputedStyle(canvas).fontFamily;
    const glyphs = [...LENS_GLYPHS];
    let order = glyphs.map((_, i) => i);
    document.fonts?.ready.then(() => {
      order = sortByInk(glyphs, family);
    });

    // The painting's pixels, read once from a downsized copy.
    let pixels: Uint8ClampedArray | null = null;
    let pw = 0;
    let ph = 0;
    const readPixels = () => {
      if (!img.naturalWidth) return;
      pw = LENS_SAMPLE_W;
      ph = Math.round((LENS_SAMPLE_W * img.naturalHeight) / img.naturalWidth);
      const copy = document.createElement("canvas");
      copy.width = pw;
      copy.height = ph;
      const cctx = copy.getContext("2d", { willReadFrequently: true });
      if (!cctx) return;
      cctx.drawImage(img, 0, 0, pw, ph);
      pixels = cctx.getImageData(0, 0, pw, ph).data;
    };
    if (img.complete) readPixels();
    else img.addEventListener("load", readPixels, { once: true });

    let cols = 0;
    let rows = 0;
    let life = new Float32Array(0);
    let glyph = new Uint8Array(0);
    let rank = new Float32Array(0); // 0 (light paint) … 1 (dark paint)
    let ink: string[] = [];
    let rolledAt = new Float32Array(0);
    const alive = new Set<number>();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / LENS_CELL_W);
      rows = Math.ceil(h / LENS_CELL_H);
      life = new Float32Array(cols * rows);
      glyph = new Uint8Array(cols * rows);
      rank = new Float32Array(cols * rows);
      ink = new Array(cols * rows);
      rolledAt = new Float32Array(cols * rows);
      alive.clear();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(hero);

    const pick = (i: number) => {
      // Density from the paint's darkness, scattered across a wide band of
      // the ramp so neighbors rarely repeat.
      const k = Math.round(rank[i] * (glyphs.length - 1) + (Math.random() - 0.5) * glyphs.length * 0.4);
      glyph[i] = order[Math.min(Math.max(k, 0), glyphs.length - 1)];
    };

    // Light up every cell within the radius of (x, y), hero-local px. The
    // painting is read through its live box — it drifts and leans — and
    // through object-fit: cover, so each glyph takes the pigment that is
    // actually under it.
    const light = (
      x: number,
      y: number,
      box: DOMRect,
      heroBox: DOMRect,
      posX: number,
      posY: number,
    ) => {
      if (!pixels) return;
      const narrow = window.matchMedia("(max-width: 760px)").matches;
      const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const ox = box.left - heroBox.left + (box.width - dw) * posX;
      const oy = box.top - heroBox.top + (box.height - dh) * posY;
      const now = performance.now();
      const c0 = Math.max(0, Math.floor((x - LENS_RADIUS) / LENS_CELL_W));
      const c1 = Math.min(cols - 1, Math.ceil((x + LENS_RADIUS) / LENS_CELL_W));
      const r0 = Math.max(0, Math.floor((y - LENS_RADIUS) / LENS_CELL_H));
      const r1 = Math.min(rows - 1, Math.ceil((y + LENS_RADIUS) / LENS_CELL_H));
      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          const cx = (c + 0.5) * LENS_CELL_W;
          const cy = (r + 0.5) * LENS_CELL_H;
          const d = Math.hypot(cx - x, cy - y) / LENS_RADIUS;
          // A ragged rim, so the lens edge reads as glitch, not a circle.
          if (d > 1 - Math.random() * 0.25) continue;
          const strength = 1 - d * d;
          const i = r * cols + c;
          if (strength <= life[i]) continue;
          const u = Math.floor(((cx - ox) / dw) * pw);
          const v = Math.floor(((cy - oy) / dh) * ph);
          if (u < 0 || v < 0 || u >= pw || v >= ph) continue;
          const p = (v * pw + u) * 4;
          const red = pixels[p];
          const green = pixels[p + 1];
          const blue = pixels[p + 2];
          const lum = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          // The color actually on screen here (watercolor + fog), then a
          // touch deeper so the symbol is legible but still the same paint.
          const [sr, sg, sb] = onScreen(red, green, blue, cx, cy, heroBox.width, heroBox.height, narrow);
          const seen = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
          const tone = (channel: number) =>
            Math.round(Math.min(255, Math.max(0, (seen + (channel - seen) * 1.25) * LENS_DEEPEN)));
          ink[i] = `rgb(${tone(sr)},${tone(sg)},${tone(sb)})`;
          rank[i] = 1 - lum / 255;
          if (life[i] === 0) pick(i);
          life[i] = strength;
          rolledAt[i] = now;
          alive.add(i);
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(now - last, 64);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${LENS_FONT}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const i of alive) {
        life[i] -= dt / LENS_LIFE_MS;
        if (life[i] <= 0) {
          life[i] = 0;
          alive.delete(i);
          continue;
        }
        // Freshly lit cells glitch between glyphs; fading ones hold still.
        if (life[i] > 0.4 && now - rolledAt[i] > 70) {
          pick(i);
          rolledAt[i] = now;
        }
        const t = life[i];
        const a = t * t * (3 - 2 * t);
        const x = (i % cols) * LENS_CELL_W;
        const y = Math.floor(i / cols) * LENS_CELL_H;
        // Just the symbol, straight onto the paint.
        ctx.globalAlpha = a;
        ctx.fillStyle = ink[i];
        ctx.fillText(glyphs[glyph[i]], x + LENS_CELL_W / 2, y + LENS_CELL_H / 2 + 0.5);
      }
      ctx.globalAlpha = 1;
      if (alive.size) raf = requestAnimationFrame(frame);
    };

    // Fill in between pointer events, so a fast sweep leaves an unbroken
    // trail instead of a row of separate circles.
    let lastX = NaN;
    let lastY = NaN;
    const onMove = (e: PointerEvent) => {
      const heroBox = hero.getBoundingClientRect();
      const x = e.clientX - heroBox.left;
      const y = e.clientY - heroBox.top;
      if (y < -LENS_RADIUS || y > heroBox.height + LENS_RADIUS) {
        lastX = NaN;
        return;
      }
      const box = img.getBoundingClientRect();
      const [posX = 0.5, posY = 0.5] = getComputedStyle(img)
        .objectPosition.split(" ")
        .map((part) => (part.endsWith("%") ? parseFloat(part) / 100 : 0.5));
      const steps = Number.isNaN(lastX)
        ? 1
        : Math.max(1, Math.ceil(Math.hypot(x - lastX, y - lastY) / (LENS_RADIUS * 0.4)));
      for (let s = 1; s <= steps; s += 1) {
        const f = s / steps;
        const px = Number.isNaN(lastX) ? x : lastX + (x - lastX) * f;
        const py = Number.isNaN(lastY) ? y : lastY + (y - lastY) * f;
        light(px, py, box, heroBox, posX, posY);
      }
      lastX = x;
      lastY = y;
      if (!raf && alive.size) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      img.removeEventListener("load", readPixels);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [imgRef]);

  return <canvas className="sj-lens" ref={canvasRef} aria-hidden="true" />;
}

const STEPS = [
  {
    name: "Extract",
    body: "Surject reads your repository for the rules you've already written: AGENTS.md, CLAUDE.md, READMEs, contributing guides.",
  },
  {
    name: "Formalize",
    body: "Each rule is compiled into Lean, a language built for mathematical proof. A rule has exactly one meaning, and every check against it is a proof verified by a small, trusted kernel.",
  },
  {
    name: "Review",
    body: "You read each rule in plain English and approve exactly what will be enforced. The guardrails you define are the only ones that apply.",
  },
  {
    name: "Enforce",
    body: "Approved rules hold on every action your agent takes. It can't edit them, skip them, or talk its way around them.",
  },
];

export function Surject() {
  const heroRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // The site's body is black; this page is paper. Paint the canvas behind it
  // too, so overscroll never flashes dark.
  useEffect(() => {
    document.documentElement.classList.add("sj-paper");
    return () => document.documentElement.classList.remove("sj-paper");
  }, []);

  // Parallax: the pointer's offset from center, -1…1 on each axis, as CSS
  // variables the background layers read at their own depths.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      hero.style.setProperty("--px", x.toFixed(3));
      hero.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="sj">
      <svg className="sj-defs" aria-hidden="true" focusable="false">
        {/* Photo → watercolor: soften detail into washes, bleed their edges,
            pool pigment where washes meet (an unsharp mask against a wider
            blur darkens edges the way drying paint does), grain it with
            paper tooth, then lift it toward white. */}
        <filter id="sj-watercolor" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="warp" />
          <feDisplacementMap in="soft" in2="warp" scale="26" xChannelSelector="R" yChannelSelector="G" result="bled" />
          <feGaussianBlur in="bled" stdDeviation="7" result="spread" />
          <feComposite in="bled" in2="spread" operator="arithmetic" k1="0" k2="2.1" k3="-1.1" k4="0" result="pooled" />
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="9" result="grain" />
          <feColorMatrix in="grain" type="saturate" values="0" result="tooth" />
          <feComposite in="pooled" in2="tooth" operator="arithmetic" k1="0.3" k2="0.86" k3="0" k4="-0.02" result="grained" />
          {/* Backruns: irregular pale blooms where the wash dried unevenly. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.0055" numOctaves="3" seed="2" result="damp" />
          <feColorMatrix in="damp" type="matrix" values="0 0 0 0 1  0 0 0 0 0.99  0 0 0 0 0.96  5 0 0 0 -3.2" result="backrun" />
          <feComposite in="backrun" in2="grained" operator="arithmetic" k1="0" k2="0.16" k3="1" k4="0" result="bloomed" />
          <feColorMatrix in="bloomed" type="saturate" values="1.35" result="vivid" />
          <feComponentTransfer in="vivid">
            <feFuncR type="linear" slope="0.72" intercept="0.28" />
            <feFuncG type="linear" slope="0.72" intercept="0.27" />
            <feFuncB type="linear" slope="0.72" intercept="0.25" />
          </feComponentTransfer>
        </filter>

        {/* Small washes (the swash under the headline word): warp the edges
            and eat into the pigment with grain. */}
        <filter id="sj-wash" x="-20%" y="-30%" width="140%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="16" xChannelSelector="R" yChannelSelector="G" result="bled" />
          <feGaussianBlur in="bled" stdDeviation="0.8" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.85 1.25" result="tooth" />
          <feComposite in="soft" in2="tooth" operator="in" />
        </filter>
      </svg>

      <section className="sj-hero" ref={heroRef}>
        <HeroBackground imgRef={imgRef} />
        <GlyphLens imgRef={imgRef} />

        <a className="sj-home sj-glass" href="/">
          From biject <span aria-hidden="true">↗</span>
        </a>

        <div className="sj-hero-copy">
          <h1 className="sj-title">
            <span className="sj-title-line">Stop suggesting.</span>
            <span className="sj-title-line">
              Start <RotatingWord />
              <span className="sj-sr">proving</span>
            </span>
            <span className="sj-title-line">
              with <span className="sj-name">Surject.</span>
            </span>
          </h1>
          <p className="sj-sub">Provable guardrails for AI coding agents.</p>
          <Install />
        </div>

        <a
          className="sj-credit"
          href="https://www.metmuseum.org/art/collection/search/10497"
          target="_blank"
          rel="noreferrer"
        >
          Thomas Cole, <em>The Oxbow</em>, 1836
        </a>
      </section>

      <section className="sj-method" id="how-it-works" aria-labelledby="sj-method-title">
        <h2 className="sj-section-title" id="sj-method-title">
          How it works
        </h2>
        <ol className="sj-steps">
          {STEPS.map((step) => (
            <li key={step.name} className="sj-step">
              <h3 className="sj-step-name">{step.name}</h3>
              <p className="sj-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The main site's footer, set in this page's type. */}
      <footer className="sj-footer">
        <span>© 2026 Biject. All rights reserved.</span>
        <a href="mailto:dev@bijectai.com">dev@bijectai.com</a>
      </footer>
    </div>
  );
}
