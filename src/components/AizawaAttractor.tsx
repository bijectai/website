import { useEffect, useRef } from "react";

/* ============================================================
   Strange-attractor particle field with homotopy morphing.

   A field of particles ride a 3D strange attractor, leaving fading
   geometric trails. The cloud is a true 3D object resting at a
   hardcoded base angle, with the mouse adding a subtle sway.

   Every few seconds the attractor the particles follow cycles on a
   timer: Aizawa -> Rössler -> Lorenz -> Sprott B -> (repeat).
   Rather than snapping, the switch is a *homotopy*: a continuous
   straight-line deformation between the two normalized vector
   fields, H(u, t) = (1 - t)·f_from(u) + t·f_to(u). The particles
   keep their positions and smoothly flow from one manifold onto
   the next as t eases 0 -> 1.

   Each attractor lives at a wildly different native scale, so every
   field is normalized into a shared O(1) coordinate space (subtract
   the native center, divide by a native length). That keeps the
   homotopy well-behaved and every attractor framed the same size.

   Every 20 to 30 seconds one ink strand plays a denied action: it
   drifts off the manifold, flashes the brand green, and snaps back
   onto the attractor. Skipped under prefers-reduced-motion.

   Colors follow the theme (--ink / --color-green).
   Sits at z-index 0, i.e. behind the glass top bar (z-index 100).

   ------------------------------------------------------------
   Keeping it cheap

   The look is unchanged; what it costs to produce is. Six things
   carry the weight:

   1. Batched strokes. A trail used to be stroked one segment at a
      time, so each segment could carry its own alpha — about 12k
      beginPath/stroke pairs per frame, which is what made weaker
      devices crawl. Trails are now projected into a buffer and
      stroked in ALPHA_BANDS bands: every particle's band-b chunk
      joins one path, drawn with one globalAlpha and one stroke.
      Same fading ramp, ~24 draw calls a frame instead of ~12k.
   2. Quality tiers. Cloud size, trail length and backing-store
      resolution come from a tier guessed from device hints at mount,
      then corrected by measured frame times (see adapt()). A device
      that can't hold the full cloud settles on a thinner one instead
      of stuttering through it.
   3. Wall-clock simulation. Integration steps come off an
      accumulator, so the orbit moves at one speed whether the
      display runs at 60Hz or 144Hz, and a stalled frame can't
      trigger a catch-up avalanche.
   4. Budgeted warm-up. Spreading particles along the manifold costs
      a few hundred thousand Euler steps, and doing that in one go on
      mount was a visible hitch. Warm-up is a queue drained a fixed
      number of steps per frame: the cloud fills in over about half a
      second instead of blocking first paint. Respawns use the same
      queue, so a morph no longer spikes a frame.
   5. Nothing runs unseen. An IntersectionObserver parks the loop
      when the hero scrolls away, a hidden tab stops it, and
      prefers-reduced-motion draws one static frame and never loops.
   6. Dirty-rect clears. Each frame clears the box the cloud actually
      touched, not the whole viewport.
   ============================================================ */

// ---- Look & feel (all tweakable) ----
// PARTICLE_COUNT and TRAIL_LENGTH are the *full-quality* figures, i.e. the
// top tier and the allocation ceiling; see TIERS for what lower tiers use.
const PARTICLE_COUNT = 260;
const TRAIL_LENGTH = 46; // trail points kept per particle
const STEPS_PER_FRAME = 2; // integration steps per 60Hz frame (a rate, see SIM_STEP_MS)
const GREEN_RATIO = 0.05; // 5% of particles are green
const SCALE_FACTOR = 0.2; // attractor radius relative to min(viewport)
// When the page lays out a .hero-stage box, the cloud is framed to it instead:
// scaled off the box's shorter side (1/3 would fit the shape's ~3-unit span
// to it exactly; this runs 1.25× that, so the cloud spills past the box),
// and centered on the box sideways. On a landscape box (desktop) it's also
// pulled up from the box's middle toward the middle of the first screen
// (STAGE_LIFT: 0 = the box, 1 = the screen), so it runs up behind the
// headline. A portrait box (a phone) already has room above and below the
// cloud, so there it stays centered in the box, clear of the headline.
// CSS owns the hero layout; this just follows it.
const STAGE_SELECTOR = ".hero-stage";
const STAGE_FILL = (1 / 3) * 1.25;
const STAGE_LIFT = 1;
// Caps the scale so the cloud's span never passes ~90% of the screen's
// width: on a phone the box is barely wider than the cloud already.
const MAX_WIDTH_SCALE = 0.3;
const MIN_STAGE = 96; // px; below this the stage hides the cloud (see place())
const VERTICAL_OFFSET = 0.06; // shift the cloud's center down, as a fraction of viewport height
const FOCAL = 9; // perspective focal length (attractor units)
const BASE_ALPHA = 0.55; // opacity of the freshest trail segment
const LINE_WIDTH = 0.825; // strand thickness (0.75× the original 1.1)
const TRANSITION_MS = 1000; // how long a homotopy morph takes
const CYCLE_MS = 15000; // time between the start of one morph and the next
const MAX_RADIUS = 5.5; // leash: particles past this (vs ~3 for real orbits) respawn

// Alpha steps along a trail. The old code gave every segment its own alpha,
// which forced one stroke per segment; the ramp is now quantized into this
// many contiguous chunks so all of a frame's geometry fits in this many
// paths per colour. 12 is past the point where the banding is visible on
// a sub-pixel-wide line at BASE_ALPHA.
const ALPHA_BANDS = 12;

// ---- Performance: quality tiers ----
// Index 0 is the full look; each step down thins the cloud, shortens the
// trails and caps the backing store. Fractions are of PARTICLE_COUNT and
// TRAIL_LENGTH, so the look & feel knobs above still drive everything.
const TIERS = [
  { particles: 1, trail: 1, dpr: 2 },
  { particles: 0.7, trail: 0.8, dpr: 1.75 },
  { particles: 0.48, trail: 0.65, dpr: 1.5 },
  { particles: 0.32, trail: 0.52, dpr: 1.25 },
];
const MEASURE_FRAMES = 90; // frames per quality measurement window
const SLOW_FRAME_MS = 20; // sustained average worse than this: drop a tier
const FAST_FRAME_MS = 11; // sustained average better than this: try a tier up
// The simulation runs in ticks, one trail sample per tick, STEPS_PER_FRAME
// integration steps per sample — the cadence the look was tuned at on a 60Hz
// display. Driving ticks off wall-clock time keeps both the orbit's speed and
// the trail's length in simulation time identical at any refresh rate.
const TICK_MS = 1000 / 60;
const MAX_TICKS = 3; // accumulator ceiling, so a stall can't trigger catch-up work
const WARM_BUDGET = 9000; // Euler steps per frame spent warming new particles
const WARM_MAX = 2600; // longest warm-up a particle can draw

// ---- "Denied action" event ----
// One strand drifts outward, flashes green, then snaps back to where it would
// have been had it never left (a shadow copy keeps integrating the real field
// alongside it). Phases run back to back; durations in ms.
const DENY_FIRST_MS: [number, number] = [9000, 15000]; // first event, after mount
const DENY_EVERY_MS: [number, number] = [20000, 30000]; // gap between events
const DENY_DRIFT_MS = 2200; // easing outward, tint creeping in
const DENY_HOLD_MS = 500; // full green at its furthest point
const DENY_SNAP_MS = 160; // back onto the manifold
const DENY_SETTLE_MS = 900; // green fades from the strand's trail
const DENY_TOTAL_MS = DENY_DRIFT_MS + DENY_HOLD_MS + DENY_SNAP_MS + DENY_SETTLE_MS;
const DENY_PUSH = 0.0065; // peak outward nudge per integration step
const DENY_FLASH_ALPHA = 1.5; // trail alpha boost while flashing

const randIn = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

// Base viewing orientation (radians). Default for any attractor that
// doesn't override it via its own rotX/rotY.
const ROT_X = 0.7;
const ROT_Y = -0.9;
const ROT_SMOOTH = 0.06; // easing of rotation toward the mouse target

type Vec3 = { x: number; y: number; z: number };

/* An attractor defined by its NATIVE ODE plus the transform that
   maps it into the shared normalized space the particles live in:
   native = center + L · u, so u = (native - center) / L. */
interface Attractor {
  // Write the native derivative at (x, y, z) into out[0..2].
  deriv: (x: number, y: number, z: number, out: number[]) => void;
  cx: number; // native center
  cy: number;
  cz: number;
  L: number; // native length scale (brings the attractor to O(1))
  dt: number; // native integration timestep
  view: number; // per-attractor display zoom (equalizes apparent size)
  rotX?: number; // resting view orientation override (defaults to ROT_X)
  rotY?: number; // resting view orientation override (defaults to ROT_Y)
}

// ---- Aizawa (standard params) ----
const AIZAWA_A = 0.95;
const AIZAWA_B = 0.7;
const AIZAWA_C = 0.6;
const AIZAWA_D = 3.5;
const AIZAWA_E = 0.25;
const AIZAWA_F = 0.1;

// ---- Rössler (classic params) ----
const ROSSLER_A = 0.2;
const ROSSLER_B = 0.2;
const ROSSLER_C = 5.7;

// ---- Lorenz (classic params) ----
const LORENZ_SIGMA = 10;
const LORENZ_RHO = 28;
const LORENZ_BETA = 8 / 3;

const ATTRACTORS: Attractor[] = [
  {
    // Aizawa — L = 1, center on its z-offset: u matches the original look.
    deriv(x, y, z, out) {
      out[0] = (z - AIZAWA_B) * x - AIZAWA_D * y;
      out[1] = AIZAWA_D * x + (z - AIZAWA_B) * y;
      out[2] =
        AIZAWA_C +
        AIZAWA_A * z -
        (z * z * z) / 3 -
        (x * x + y * y) * (1 + AIZAWA_E * z) +
        AIZAWA_F * z * x * x * x;
    },
    cx: 0,
    cy: 0,
    cz: 0.6,
    L: 1,
    dt: 0.0075,
    view: 1,
  },
  {
    // Rössler — a flat spiral in xy with an occasional fold up in z.
    deriv(x, y, z, out) {
      out[0] = -y - z;
      out[1] = x + ROSSLER_A * y;
      out[2] = ROSSLER_B + z * (x - ROSSLER_C);
    },
    cx: 0,
    cy: -1,
    cz: 4,
    L: 8.5,
    dt: 0.01,
    view: 1.1,
    rotX: 0.5,
    rotY: -1.0,
  },
  {
    // Lorenz — the butterfly sits around z ≈ 25 and spans ±~20.
    deriv(x, y, z, out) {
      out[0] = LORENZ_SIGMA * (y - x);
      out[1] = x * (LORENZ_RHO - z) - y;
      out[2] = x * y - LORENZ_BETA * z;
    },
    cx: 0,
    cy: 0,
    cz: 25,
    L: 18,
    dt: 0.006,
    view: 1.05,
    rotX: 0.5,
    rotY: -2.1,
  },
  {
    // Sprott B — a thin, folded sheet centered on the origin (no params).
    deriv(x, y, z, out) {
      out[0] = y * z;
      out[1] = x - y;
      out[2] = 1 - x * y;
    },
    cx: 0,
    cy: 0,
    cz: 0,
    L: 4.5,
    dt: 0.01,
    view: 1.3,
    rotX: 1.3,
    rotY: 0.6,
  },
];

// Scratch buffers for native derivatives (avoid per-step allocation).
const gA: number[] = [0, 0, 0];
const gB: number[] = [0, 0, 0];

// One Euler step under a single attractor's normalized field, mutating u.
function stepField(u: Vec3, a: Attractor) {
  a.deriv(a.cx + a.L * u.x, a.cy + a.L * u.y, a.cz + a.L * u.z, gA);
  u.x += (gA[0] / a.L) * a.dt;
  u.y += (gA[1] / a.L) * a.dt;
  u.z += (gA[2] / a.L) * a.dt;
}

// One Euler step under the homotopy H(u, t) = (1-t)·f_a + t·f_b, mutating u.
function stepBlend(u: Vec3, a: Attractor, b: Attractor, t: number) {
  a.deriv(a.cx + a.L * u.x, a.cy + a.L * u.y, a.cz + a.L * u.z, gA);
  b.deriv(b.cx + b.L * u.x, b.cy + b.L * u.y, b.cz + b.L * u.z, gB);
  const dt = (1 - t) * a.dt + t * b.dt;
  u.x += ((1 - t) * (gA[0] / a.L) + t * (gB[0] / b.L)) * dt;
  u.y += ((1 - t) * (gA[1] / a.L) + t * (gB[1] / b.L)) * dt;
  u.z += ((1 - t) * (gA[2] / a.L) + t * (gB[2] / b.L)) * dt;
}

interface Particle {
  cur: Vec3; // position in normalized space
  trail: Float32Array; // ring buffer of TRAIL_LENGTH * (x,y,z)
  head: number; // index of the newest sample
  count: number; // how many samples are filled
  warm: number; // integration steps still owed before it joins the cloud
  green: boolean;
}

// A particle is allocated once at the trail ceiling and recycled from then on;
// reset() puts it back at a random seed with a fresh warm-up debt. The warm-up
// itself is drained by the frame loop (WARM_BUDGET), not here, so neither
// mount nor a mid-flight respawn blocks on a few thousand Euler steps.
function reset(p: Particle) {
  p.cur.x = (Math.random() - 0.5) * 0.2;
  p.cur.y = (Math.random() - 0.5) * 0.2;
  p.cur.z = (Math.random() - 0.5) * 0.2;
  p.head = 0;
  p.count = 0;
  p.warm = Math.floor(Math.random() * WARM_MAX);
}

function create(green: boolean): Particle {
  const p: Particle = {
    cur: { x: 0, y: 0, z: 0 },
    trail: new Float32Array(TRAIL_LENGTH * 3),
    head: 0,
    count: 0,
    warm: 0,
    green,
  };
  reset(p);
  return p;
}

// Device hints for the opening guess. Deliberately pessimistic: adapt() can
// climb back to the full look within a couple of seconds if the hardware
// turns out to be fine, whereas opening too rich means the first seconds —
// the ones that decide whether the page feels slow — are the janky ones.
function initialTier(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  let tier = 0;
  const cores = nav.hardwareConcurrency || 4;
  if (cores <= 4) tier = Math.max(tier, 2);
  else if (cores <= 6) tier = Math.max(tier, 1);
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
    tier = Math.max(tier, 2);
  }
  // Touch-primary devices pair weak GPUs with dense displays, which is the
  // worst case for a full-viewport canvas of hairline strokes.
  if (window.matchMedia("(pointer: coarse)").matches) tier = Math.max(tier, 2);
  return Math.min(tier, TIERS.length - 1);
}

export function AizawaAttractor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // desynchronized lets the compositor skip a frame of latency on the
    // canvas; it is purely decorative, so tearing risk is irrelevant here.
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true })!;

    // Pull the brand colors straight from the theme. The particles follow
    // the foreground role (--ink), so they flip with the rest of the page.
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#ffffff";
    const GREEN = css.getPropertyValue("--color-green").trim() || "#10b981";

    // ---- particles (allocated at the ceiling, used up to activeCount) ----
    // Trails are sized for TRAIL_LENGTH once; trailLen is the live window
    // into them, so a tier change never reallocates.
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(create(Math.random() < GREEN_RATIO));
    }

    let tier = initialTier();
    let tierFloor = 0; // best tier still allowed; a measured drop ratchets this
    let activeCount = 0;
    let trailLen = TRAIL_LENGTH;
    let dprCap = 2;

    // Which particles are which colour, so a draw pass walks only its own.
    const inkList = new Int32Array(PARTICLE_COUNT);
    const greenList = new Int32Array(PARTICLE_COUNT);
    let inkN = 0;
    let greenN = 0;

    function rebuildLists() {
      inkN = 0;
      greenN = 0;
      for (let i = 0; i < activeCount; i++) {
        if (particles[i].green) greenList[greenN++] = i;
        else inkList[inkN++] = i;
      }
    }

    // Shrinking or growing the live trail window reorders the ring, so repack
    // the newest samples to the front. Exact, and far less jarring than
    // dropping the trails and letting them regrow.
    const repackBuf = new Float32Array(TRAIL_LENGTH * 3);
    function repack(p: Particle, oldLen: number, newLen: number) {
      const n = Math.min(p.count, newLen);
      for (let k = 0; k < n; k++) {
        const src = ((p.head - (n - 1 - k) + oldLen) % oldLen) * 3;
        repackBuf[k * 3] = p.trail[src];
        repackBuf[k * 3 + 1] = p.trail[src + 1];
        repackBuf[k * 3 + 2] = p.trail[src + 2];
      }
      for (let k = 0; k < n * 3; k++) p.trail[k] = repackBuf[k];
      p.head = n > 0 ? n - 1 : 0;
      p.count = n;
    }

    function applyTier() {
      const spec = TIERS[tier];
      const oldLen = trailLen;
      const newLen = Math.max(2, Math.round(TRAIL_LENGTH * spec.trail));
      const newCount = Math.max(1, Math.round(PARTICLE_COUNT * spec.particles));

      if (newLen !== oldLen) {
        for (let i = 0; i < particles.length; i++) repack(particles[i], oldLen, newLen);
        trailLen = newLen;
      }
      // Particles coming back into play hold stale positions; re-seed them
      // and let the warm-up queue fold them in.
      for (let i = activeCount; i < newCount; i++) reset(particles[i]);
      activeCount = newCount;
      rebuildLists();
      deny = null; // its strand may have just left the active set

      if (spec.dpr !== dprCap) {
        dprCap = spec.dpr;
        resize();
      }
    }

    // ---- adaptive quality ----
    // One average over MEASURE_FRAMES frames, not a per-frame reaction: a
    // single slow frame means nothing, a slow second means the device can't
    // hold this tier. Dropping a tier raises tierFloor so quality can never
    // climb back past a level already measured as too expensive — that
    // ratchet is what stops it oscillating between two tiers forever.
    let windowFrames = 0;
    let windowMs = 0;

    function adapt(dtMs: number) {
      // Ignore stalls that aren't ours: tab resume, a GC pause, a long task
      // elsewhere on the page.
      if (dtMs > 100) return;
      windowMs += dtMs;
      windowFrames++;
      if (windowFrames < MEASURE_FRAMES) return;
      const avg = windowMs / windowFrames;
      windowFrames = 0;
      windowMs = 0;
      if (avg > SLOW_FRAME_MS && tier < TIERS.length - 1) {
        tier++;
        tierFloor = tier;
        applyTier();
      } else if (avg < FAST_FRAME_MS && tier > tierFloor) {
        tier--;
        applyTier();
      }
    }

    // ---- denied-action event state ----
    // shadow: where the strand would be had it stayed on the field.
    // from: its position when the snap began, lerped toward the shadow.
    // snapped: the snap reached the shadow (a hidden tab can cut it short).
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let deny: {
      p: Particle;
      idx: number; // its slot in particles, so the draw pass needn't look it up
      start: number;
      shadow: Vec3;
      from: Vec3 | null;
      snapped: boolean;
    } | null = null;
    let nextDeny = performance.now() + randIn(DENY_FIRST_MS);

    // ---- attractor cycling / homotopy state ----
    let current = 0; // resting attractor index
    let fromIdx = 0;
    let toIdx = 0;
    let transitioning = false;
    let transStart = 0;

    function advance() {
      if (transitioning) return; // a morph is already running
      fromIdx = current;
      toIdx = (current + 1) % ATTRACTORS.length;
      transitioning = true;
      transStart = performance.now();
    }
    // Kick off a morph on a fixed cadence (CYCLE_MS > TRANSITION_MS, so the
    // previous morph has always finished by the time the next one starts).
    const cycleTimer = window.setInterval(advance, CYCLE_MS);
    const cycleOrigin = performance.now();

    // ---- dirty rect ----
    // The cloud covers a fraction of a full-viewport canvas, so clearing all
    // of it every frame is mostly wasted fill. Track what was drawn and clear
    // exactly that box next frame.
    let dirty = false;
    let dMinX = 0;
    let dMinY = 0;
    let dMaxX = 0;
    let dMaxY = 0;
    let bMinX = 0;
    let bMinY = 0;
    let bMaxX = 0;
    let bMaxY = 0;

    function clearDirty() {
      if (!dirty) return;
      const pad = LINE_WIDTH + 2;
      const x = Math.max(0, Math.floor(dMinX - pad));
      const y = Math.max(0, Math.floor(dMinY - pad));
      const w = Math.min(width, Math.ceil(dMaxX + pad)) - x;
      const h = Math.min(height, Math.ceil(dMaxY + pad)) - y;
      if (w > 0 && h > 0) ctx.clearRect(x, y, w, h);
      dirty = false;
    }

    // ---- viewport / hi-dpi sizing ----
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let scale = 0;
    let dpr = 1;

    function resize() {
      const nextDpr = Math.min(window.devicePixelRatio || 1, dprCap);
      // clientWidth excludes any scrollbar; innerWidth includes it, which
      // would size the canvas wider than the page and trigger a spurious
      // horizontal scrollbar.
      const nextW = document.documentElement.clientWidth;
      const nextH = window.innerHeight;
      // Mobile browsers fire resize for every URL-bar nudge. Reallocating the
      // backing store each time is expensive and pointless, so only the cheap
      // re-framing runs when nothing that matters actually changed.
      if (nextW === width && nextH === height && nextDpr === dpr) {
        place();
        return;
      }
      dpr = nextDpr;
      width = nextW;
      height = nextH;
      place();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = LINE_WIDTH;
      // Butt caps on contiguous chunks abut exactly, so band seams neither
      // gap nor double-blend; round joins keep the strand itself smooth.
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";
      // The backing store came back blank, so nothing is owed a clear.
      dirty = false;
    }
    // Center and scale. The canvas is anchored to the top of the page, so the
    // stage's page coordinates (viewport rect + scroll) are canvas coordinates.
    // Whether to draw at all. A stage squeezed below MIN_STAGE (a phone held
    // sideways, where the copy takes the whole first screen) hides the cloud
    // rather than letting it fall back onto the copy. The simulation keeps
    // running, so it reappears as soon as there's room.
    let visible = true;

    function place() {
      const stage = document.querySelector<HTMLElement>(STAGE_SELECTOR);
      const r = stage?.getBoundingClientRect();
      visible = !r || Math.min(r.width, r.height) >= MIN_STAGE;
      if (r && visible) {
        cx = r.left + r.width / 2;
        const boxMid = r.top + window.scrollY + r.height / 2;
        const lift = r.width > r.height ? STAGE_LIFT : 0;
        cy = boxMid + (height / 2 - boxMid) * lift;
        scale = Math.min(Math.min(r.width, r.height) * STAGE_FILL, width * MAX_WIDTH_SCALE);
      } else {
        cx = width / 2;
        cy = height / 2 + height * VERTICAL_OFFSET;
        scale = Math.min(width, height) * SCALE_FACTOR;
      }
    }

    applyTier();
    resize();

    // Resize storms (a dragged window edge, a rotating phone) collapse into
    // one re-layout on the next frame.
    let resizeQueued = false;
    function onResize() {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        resize();
      });
    }
    window.addEventListener("resize", onResize);
    // The stage moves when the copy above it reflows (web fonts landing, a
    // breakpoint): follow it without resizing the canvas.
    const stageEl = document.querySelector(STAGE_SELECTOR);
    const stageObserver = stageEl ? new ResizeObserver(place) : null;
    if (stageEl) stageObserver!.observe(stageEl);
    document.fonts?.ready.then(place);

    // ---- rotation: per-attractor base angle + subtle mouse sway ----
    // The resting orientation comes from the active attractor (interpolated
    // during a morph). Mouse sway and the arrow-key pan offset ride on top.
    const baseRotX = (a: Attractor) => a.rotX ?? ROT_X;
    const baseRotY = (a: Attractor) => a.rotY ?? ROT_Y;

    let rotX = ROT_X; // eased current angle
    let rotY = ROT_Y;
    let restX = ROT_X; // resting target (base + pan, no sway) for read-out
    let restY = ROT_Y;

    // ---- per-frame view state, shared with the draw helpers ----
    let active = ATTRACTORS[0];
    let blendFrom = ATTRACTORS[0];
    let blendTo = ATTRACTORS[0];
    let blendT = 0;
    let effScale = 0;
    let cosX = 1;
    let sinX = 0;
    let cosY = 1;
    let sinY = 0;

    // Projected trail points for the whole cloud, particle i starting at
    // i * TRAIL_LENGTH. Projecting once up front is what lets the band loop
    // read the same points back ALPHA_BANDS times for free.
    const projX = new Float32Array(PARTICLE_COUNT * TRAIL_LENGTH);
    const projY = new Float32Array(PARTICLE_COUNT * TRAIL_LENGTH);
    // The subset of a colour pass that actually has a strand to draw.
    const drawIdx = new Int32Array(PARTICLE_COUNT);
    const drawCount = new Int32Array(PARTICLE_COUNT);
    let drawN = 0;
    const one = new Int32Array(1); // single-particle list for the denied strand

    // Project one colour group's trails into projX/projY, recording which
    // particles have something to stroke and growing this frame's bounds.
    function project(list: Int32Array, n: number) {
      drawN = 0;
      for (let j = 0; j < n; j++) {
        const i = list[j];
        const p = particles[i];
        if (p.count < 2) continue;
        const off = i * TRAIL_LENGTH;
        const oldest = (p.head - (p.count - 1) + trailLen) % trailLen;
        for (let k = 0; k < p.count; k++) {
          const idx = ((oldest + k) % trailLen) * 3;
          const x = p.trail[idx];
          const y = p.trail[idx + 1];
          const z = p.trail[idx + 2];

          const y1 = y * cosX - z * sinX;
          const z1 = y * sinX + z * cosX;
          const x2 = x * cosY + z1 * sinY;
          const z2 = -x * sinY + z1 * cosY;
          const persp = FOCAL / (FOCAL - z2);
          const sx = cx + x2 * effScale * persp;
          const sy = cy + y1 * effScale * persp;
          projX[off + k] = sx;
          projY[off + k] = sy;
          if (sx < bMinX) bMinX = sx;
          if (sx > bMaxX) bMaxX = sx;
          if (sy < bMinY) bMinY = sy;
          if (sy > bMaxY) bMaxY = sy;
        }
        drawIdx[drawN] = i;
        drawCount[drawN] = p.count;
        drawN++;
      }
    }

    // Stroke everything project() just laid down, one path per alpha band.
    // Band b owns the contiguous slice of each trail between segment
    // floor(b·segs/BANDS) and floor((b+1)·segs/BANDS), so every segment is
    // drawn exactly once and the alpha of a band is the same for every
    // particle — which is what collapses ~12k strokes into ALPHA_BANDS.
    function strokeBands(alphaScale: number) {
      if (drawN === 0) return;
      for (let b = 0; b < ALPHA_BANDS; b++) {
        const alpha = Math.min((BASE_ALPHA * alphaScale * (b + 0.5)) / ALPHA_BANDS, 1);
        if (alpha <= 0.002) continue; // below the blend's noise floor
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let j = 0; j < drawN; j++) {
          const segs = drawCount[j] - 1;
          const s0 = ((b * segs) / ALPHA_BANDS) | 0;
          const s1 = (((b + 1) * segs) / ALPHA_BANDS) | 0;
          if (s1 <= s0) continue;
          const off = drawIdx[j] * TRAIL_LENGTH;
          ctx.moveTo(projX[off + s0], projY[off + s0]);
          for (let k = s0 + 1; k <= s1; k++) ctx.lineTo(projX[off + k], projY[off + k]);
        }
        ctx.stroke();
      }
    }

    // Resolve this frame's homotopy parameter, active field, zoom and
    // orientation. Shared by the animated loop and the static render.
    function computeView(now: number) {
      blendT = 0;
      blendFrom = ATTRACTORS[fromIdx];
      blendTo = ATTRACTORS[toIdx];
      if (transitioning) {
        const raw = (now - transStart) / TRANSITION_MS;
        if (raw >= 1) {
          current = toIdx;
          fromIdx = toIdx;
          transitioning = false;
        } else {
          blendT = raw * raw * (3 - 2 * raw); // smoothstep
        }
      }
      active = ATTRACTORS[transitioning ? toIdx : current];
      const view = transitioning
        ? blendFrom.view + (blendTo.view - blendFrom.view) * blendT
        : active.view;
      effScale = scale * view;

      // resting orientation: per-attractor base (lerped across the morph with
      // the same eased t) plus the arrow-key pan; mouse sway rides on top.
      restX = transitioning
        ? baseRotX(blendFrom) + (baseRotX(blendTo) - baseRotX(blendFrom)) * blendT
        : baseRotX(active);
      restY = transitioning
        ? baseRotY(blendFrom) + (baseRotY(blendTo) - baseRotY(blendFrom)) * blendT
        : baseRotY(active);
      rotX += (restX - rotX) * ROT_SMOOTH;
      rotY += (restY - rotY) * ROT_SMOOTH;

      cosX = Math.cos(rotX);
      sinX = Math.sin(rotX);
      cosY = Math.cos(rotY);
      sinY = Math.sin(rotY);
    }

    // Record the position a particle is currently at as its newest trail
    // sample, advancing the ring.
    function push(p: Particle) {
      p.head = (p.head + 1) % trailLen;
      const b = p.head * 3;
      p.trail[b] = p.cur.x;
      p.trail[b + 1] = p.cur.y;
      p.trail[b + 2] = p.cur.z;
      if (p.count < trailLen) p.count++;
    }

    function draw(denyAlpha: number) {
      clearDirty();
      if (!visible) return;

      bMinX = Infinity;
      bMinY = Infinity;
      bMaxX = -Infinity;
      bMaxY = -Infinity;

      // Draw the base (ink) particles first, greens on top so the 5% pop.
      ctx.strokeStyle = INK;
      project(inkList, inkN);
      strokeBands(1);
      ctx.strokeStyle = GREEN;
      project(greenList, greenN);
      strokeBands(1);

      if (denyAlpha > 0 && deny) {
        one[0] = deny.idx;
        ctx.strokeStyle = GREEN;
        project(one, 1);
        strokeBands(denyAlpha);
      }

      ctx.globalAlpha = 1;

      if (bMaxX > bMinX) {
        dMinX = bMinX;
        dMinY = bMinY;
        dMaxX = bMaxX;
        dMaxY = bMaxY;
        dirty = true;
      }
    }

    // ---- the loop ----
    let raf = 0;
    let running = false;
    let lastNow = 0;
    let acc = 0; // unspent wall-clock time, in ms, owed to the integrator

    function frame(now: number) {
      const dtMs = Math.min(now - lastNow, 250);
      lastNow = now;
      adapt(dtMs);

      computeView(now);

      // Ticks come off a wall-clock accumulator, so the orbit advances at the
      // same rate on a 60Hz and a 144Hz display. The ceiling means a long
      // stall is simply lost time rather than a burst of catch-up work that
      // would stall the next frame too.
      acc = Math.min(acc + dtMs, TICK_MS * MAX_TICKS);
      const ticks = (acc / TICK_MS) | 0;
      acc -= ticks * TICK_MS;

      // ---- denied-action event: start one, or advance the running one ----
      if (!deny && now >= nextDeny) {
        // Never overlap a morph: the shadow would follow a field mid-change.
        const untilMorph = CYCLE_MS - ((now - cycleOrigin) % CYCLE_MS);
        if (reduceMotion.matches || transitioning || untilMorph < DENY_TOTAL_MS + 500) {
          nextDeny = now + 4000;
        } else {
          // Reservoir-pick an eligible strand without building a pool array.
          let chosen = -1;
          let seen = 0;
          for (let i = 0; i < activeCount; i++) {
            const p = particles[i];
            if (p.green || p.count !== trailLen) continue;
            seen++;
            if (Math.random() * seen < 1) chosen = i;
          }
          if (chosen >= 0) {
            const p = particles[chosen];
            deny = {
              p,
              idx: chosen,
              start: now,
              shadow: { ...p.cur },
              from: null,
              snapped: false,
            };
          }
          nextDeny = now + randIn(DENY_EVERY_MS);
        }
      }
      const denyAge = deny ? now - deny.start : 0;
      const pushing = deny !== null && denyAge < DENY_DRIFT_MS + DENY_HOLD_MS;
      const snapping = deny !== null && !pushing && denyAge < DENY_TOTAL_MS - DENY_SETTLE_MS;
      // Outward nudge per step: eases in across the drift, full during the hold.
      const outward = pushing ? DENY_PUSH * Math.min(denyAge / DENY_DRIFT_MS, 1) ** 2 : 0;

      // advance the simulation
      let warmBudget = WARM_BUDGET;
      for (let i = 0; i < activeCount; i++) {
        const p = particles[i];

        // Still owed warm-up: spend what this frame's budget allows and skip
        // the rest of the pipeline until the debt is clear. A particle only
        // starts laying down a trail once it is properly spread out.
        if (p.warm > 0) {
          const n = Math.min(p.warm, warmBudget);
          for (let s = 0; s < n; s++) stepField(p.cur, active);
          p.warm -= n;
          warmBudget -= n;
          if (p.warm > 0) continue;
        }

        const denied = deny !== null && deny.p === p && (pushing || snapping);
        // One trail sample per tick, STEPS_PER_FRAME integration steps apart.
        for (let t = 0; t < ticks; t++) {
          for (let s = 0; s < STEPS_PER_FRAME; s++) {
            if (transitioning) stepBlend(p.cur, blendFrom, blendTo, blendT);
            else stepField(p.cur, active);
            if (denied) {
              const sh = deny!.shadow;
              if (transitioning) stepBlend(sh, blendFrom, blendTo, blendT);
              else stepField(sh, active);
              if (outward > 0) {
                const x = p.cur.x;
                const y = p.cur.y;
                const z = p.cur.z;
                const r = Math.sqrt(x * x + y * y + z * z) || 1;
                p.cur.x += (x / r) * outward;
                p.cur.y += (y / r) * outward;
                p.cur.z += (z / r) * outward;
              }
            }
          }
          if (denied && snapping) {
            // Ease from where the snap began onto the shadow's live position.
            const d = deny!;
            if (!d.from) d.from = { ...p.cur };
            const k = Math.min((denyAge - DENY_DRIFT_MS - DENY_HOLD_MS) / DENY_SNAP_MS, 1);
            const e = 1 - (1 - k) ** 3;
            p.cur.x = d.from.x + (d.shadow.x - d.from.x) * e;
            p.cur.y = d.from.y + (d.shadow.y - d.from.y) * e;
            p.cur.z = d.from.z + (d.shadow.z - d.from.z) * e;
            if (k >= 1) d.snapped = true;
          }
          push(p);
        }
        // Respawn anything that goes non-finite or escapes the leash
        // (real orbits stay within ~3; only blend-time runaways exceed it).
        // A reset zeroes count, so any NaN a tick just wrote is never drawn.
        const r2 = p.cur.x * p.cur.x + p.cur.y * p.cur.y + p.cur.z * p.cur.z;
        if (!Number.isFinite(r2) || r2 > MAX_RADIUS * MAX_RADIUS) {
          if (deny && deny.p === p) deny = null;
          reset(p);
        }
      }

      // The denied strand: its green overlay ramps in over the drift, holds
      // bright through the flash and snap, then fades out of the trail. If a
      // hidden tab cut the snap short (or skipped it), land it on the shadow.
      let denyAlpha = 0;
      if (deny) {
        if (denyAge >= DENY_TOTAL_MS) {
          if (!deny.snapped) deny.p.cur = { ...deny.shadow };
          deny = null;
        } else {
          const flashEnd = DENY_TOTAL_MS - DENY_SETTLE_MS;
          let g: number;
          if (denyAge < DENY_DRIFT_MS) g = 0.4 * (denyAge / DENY_DRIFT_MS) ** 2;
          else if (denyAge < flashEnd) g = 1;
          else g = 1 - (denyAge - flashEnd) / DENY_SETTLE_MS;
          const boost = denyAge >= DENY_DRIFT_MS && denyAge < flashEnd ? DENY_FLASH_ALPHA : 1;
          denyAlpha = g * boost;
        }
      }

      draw(denyAlpha);

      raf = requestAnimationFrame(frame);
    }

    // One frame, no loop: the reduced-motion rendering. Pay the full warm-up
    // and trail fill once, draw, and stop.
    function drawStatic() {
      computeView(performance.now());
      for (let i = 0; i < activeCount; i++) {
        const p = particles[i];
        for (let s = 0; s < p.warm; s++) stepField(p.cur, active);
        p.warm = 0;
        for (let k = 0; k < trailLen; k++) {
          stepField(p.cur, active);
          push(p);
        }
      }
      draw(0);
    }

    // ---- when to run at all ----
    // Offscreen or hidden costs nothing, and prefers-reduced-motion gets the
    // still frame instead of a loop.
    let onscreen = true;
    let staticDrawn = false;

    function sync() {
      const wanted = onscreen && !document.hidden && !reduceMotion.matches;
      if (wanted === running) {
        if (!wanted && reduceMotion.matches && !staticDrawn && onscreen) {
          drawStatic();
          staticDrawn = true;
        }
        return;
      }
      running = wanted;
      if (wanted) {
        staticDrawn = false;
        // Resuming after a pause: start the clock here so the accumulator
        // doesn't see the whole gap.
        lastNow = performance.now();
        acc = 0;
        windowFrames = 0;
        windowMs = 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        if (reduceMotion.matches && onscreen) {
          drawStatic();
          staticDrawn = true;
        }
      }
    }

    // The canvas is the first screen, so this parks the loop as soon as the
    // hero scrolls out of view — the attractor is no longer on screen to be
    // worth any frames. rootMargin brings it back just before it reappears.
    const io = new IntersectionObserver(
      (entries) => {
        onscreen = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);

    sync();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
      io.disconnect();
      stageObserver?.disconnect();
      window.clearInterval(cycleTimer);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="attractor-canvas" aria-hidden="true" />
      <div
        ref={readoutRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 12,
          right: 14,
          zIndex: 200,
          color: "#ffffff",
          font: "12px ui-monospace, SFMono-Regular, Menlo, monospace",
          pointerEvents: "none",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      />
    </>
  );
}
