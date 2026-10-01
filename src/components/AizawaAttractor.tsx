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
   ============================================================ */

// ---- Look & feel (all tweakable) ----
const PARTICLE_COUNT = 260;
const TRAIL_LENGTH = 46; // trail points kept per particle
const STEPS_PER_FRAME = 2; // integration steps advanced per frame
const GREEN_RATIO = 0.05; // 5% of particles are green
const SCALE_FACTOR = 0.2; // attractor radius relative to min(viewport)
const VERTICAL_OFFSET = 0.06; // shift the cloud's center down, as a fraction of viewport height
const FOCAL = 9; // perspective focal length (attractor units)
const BASE_ALPHA = 0.55; // opacity of the freshest trail segment
const LINE_WIDTH = 0.825; // strand thickness (0.75× the original 1.1)
const TRANSITION_MS = 1000; // how long a homotopy morph takes
const CYCLE_MS = 15000; // time between the start of one morph and the next
const MAX_RADIUS = 5.5; // leash: particles past this (vs ~3 for real orbits) respawn

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
  green: boolean;
}

function spawn(a: Attractor, green: boolean): Particle {
  // Start near the manifold, then warm up a random amount so the
  // particles end up spread along it rather than bunched together.
  const cur: Vec3 = {
    x: (Math.random() - 0.5) * 0.2,
    y: (Math.random() - 0.5) * 0.2,
    z: (Math.random() - 0.5) * 0.2,
  };
  const warm = Math.floor(Math.random() * 2600);
  for (let i = 0; i < warm; i++) stepField(cur, a);

  const trail = new Float32Array(TRAIL_LENGTH * 3);
  return { cur, trail, head: 0, count: 0, green };
}

export function AizawaAttractor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Pull the brand colors straight from the theme. The particles follow
    // the foreground role (--ink), so they flip with the rest of the page.
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#ffffff";
    const GREEN = css.getPropertyValue("--color-green").trim() || "#10b981";

    // ---- particles (start on Aizawa) ----
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(spawn(ATTRACTORS[0], Math.random() < GREEN_RATIO));
    }

    // ---- denied-action event state ----
    // shadow: where the strand would be had it stayed on the field.
    // from: its position when the snap began, lerped toward the shadow.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let deny: { p: Particle; start: number; shadow: Vec3; from: Vec3 | null } | null = null;
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

    // ---- viewport / hi-dpi sizing ----
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let scale = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // clientWidth excludes any scrollbar; innerWidth includes it, which
      // would size the canvas wider than the page and trigger a spurious
      // horizontal scrollbar.
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      cx = width / 2;
      cy = height / 2 + height * VERTICAL_OFFSET;
      scale = Math.min(width, height) * SCALE_FACTOR;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---- rotation: per-attractor base angle + subtle mouse sway ----
    // The resting orientation comes from the active attractor (interpolated
    // during a morph). Mouse sway and the arrow-key pan offset ride on top.
    const baseRotX = (a: Attractor) => a.rotX ?? ROT_X;
    const baseRotY = (a: Attractor) => a.rotY ?? ROT_Y;

    let rotX = ROT_X; // eased current angle
    let rotY = ROT_Y;
    let restX = ROT_X; // resting target (base + pan, no sway) for read-out
    let restY = ROT_Y;



    // reusable buffer for projected trail points
    const projX = new Float32Array(TRAIL_LENGTH);
    const projY = new Float32Array(TRAIL_LENGTH);

    let raf = 0;

    function frame() {
      // resolve the homotopy parameter for this frame
      let t = 0; // eased 0..1
      const from = ATTRACTORS[fromIdx];
      const to = ATTRACTORS[toIdx];
      if (transitioning) {
        const raw = (performance.now() - transStart) / TRANSITION_MS;
        if (raw >= 1) {
          current = toIdx;
          fromIdx = toIdx;
          transitioning = false;
        } else {
          t = raw * raw * (3 - 2 * raw); // smoothstep
        }
      }
      const active = ATTRACTORS[transitioning ? toIdx : current];
      const view = transitioning ? from.view + (to.view - from.view) * t : active.view;
      const effScale = scale * view;

      // resting orientation: per-attractor base (lerped across the morph with
      // the same eased t) plus the arrow-key pan; mouse sway rides on top.
      restX = transitioning
        ? baseRotX(from) + (baseRotX(to) - baseRotX(from)) * t
        : baseRotX(active);
      restY = transitioning
        ? baseRotY(from) + (baseRotY(to) - baseRotY(from)) * t
        : baseRotY(active);
      rotX += (restX - rotX) * ROT_SMOOTH;
      rotY += (restY - rotY) * ROT_SMOOTH;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // ---- denied-action event: start one, or advance the running one ----
      const now = performance.now();
      if (!deny && now >= nextDeny) {
        // Never overlap a morph: the shadow would follow a field mid-change.
        const untilMorph = CYCLE_MS - ((now - cycleOrigin) % CYCLE_MS);
        if (reduceMotion.matches || transitioning || untilMorph < DENY_TOTAL_MS + 500) {
          nextDeny = now + 4000;
        } else {
          const pool = particles.filter((p) => !p.green && p.count === TRAIL_LENGTH);
          const p = pool[Math.floor(Math.random() * pool.length)];
          if (p) deny = { p, start: now, shadow: { ...p.cur }, from: null };
          nextDeny = now + randIn(DENY_EVERY_MS);
        }
      }
      const denyAge = deny ? now - deny.start : 0;
      const pushing = deny !== null && denyAge < DENY_DRIFT_MS + DENY_HOLD_MS;
      const snapping = deny !== null && !pushing && denyAge < DENY_TOTAL_MS - DENY_SETTLE_MS;
      // Outward nudge per step: eases in across the drift, full during the hold.
      const push = pushing ? DENY_PUSH * Math.min(denyAge / DENY_DRIFT_MS, 1) ** 2 : 0;

      // advance the simulation
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const denied = deny !== null && deny.p === p && (pushing || snapping);
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
          if (transitioning) stepBlend(p.cur, from, to, t);
          else stepField(p.cur, active);
          if (denied) {
            const sh = deny!.shadow;
            if (transitioning) stepBlend(sh, from, to, t);
            else stepField(sh, active);
            if (push > 0) {
              const r = Math.hypot(p.cur.x, p.cur.y, p.cur.z) || 1;
              p.cur.x += (p.cur.x / r) * push;
              p.cur.y += (p.cur.y / r) * push;
              p.cur.z += (p.cur.z / r) * push;
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
        }
        // Respawn anything that goes non-finite or escapes the leash
        // (real orbits stay within ~3; only blend-time runaways exceed it).
        const r2 = p.cur.x * p.cur.x + p.cur.y * p.cur.y + p.cur.z * p.cur.z;
        if (!Number.isFinite(r2) || r2 > MAX_RADIUS * MAX_RADIUS) {
          if (deny && deny.p === p) deny = null;
          particles[i] = spawn(active, p.green);
          continue;
        }
        p.head = (p.head + 1) % TRAIL_LENGTH;
        const b = p.head * 3;
        p.trail[b] = p.cur.x;
        p.trail[b + 1] = p.cur.y;
        p.trail[b + 2] = p.cur.z;
        if (p.count < TRAIL_LENGTH) p.count++;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineCap = "round";

      // Draw the base (ink) particles first, greens on top so the 5% pop.
      drawPass(false);
      drawPass(true);

      // The denied strand: its green overlay ramps in over the drift, holds
      // bright through the flash and snap, then fades out of the trail. If a
      // hidden tab let the whole event elapse unseen, land it on the shadow.
      if (deny) {
        if (denyAge >= DENY_TOTAL_MS) {
          if (!deny.from) deny.p.cur = { ...deny.shadow };
          deny = null;
        } else {
          const flashEnd = DENY_TOTAL_MS - DENY_SETTLE_MS;
          let g: number;
          if (denyAge < DENY_DRIFT_MS) g = 0.4 * (denyAge / DENY_DRIFT_MS) ** 2;
          else if (denyAge < flashEnd) g = 1;
          else g = 1 - (denyAge - flashEnd) / DENY_SETTLE_MS;
          const boost = denyAge >= DENY_DRIFT_MS && denyAge < flashEnd ? DENY_FLASH_ALPHA : 1;
          ctx.strokeStyle = GREEN;
          drawTrail(deny.p, g * boost);
        }
      }

      function drawPass(greenPass: boolean) {
        ctx.strokeStyle = greenPass ? GREEN : INK;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.green !== greenPass) continue;
          drawTrail(p, 1);
        }
      }

      // Stroke one particle's trail in the current strokeStyle, alpha scaled.
      function drawTrail(p: Particle, alphaScale: number) {
        if (p.count < 2) return;
        // project the trail oldest -> newest
        const oldest = (p.head - (p.count - 1) + TRAIL_LENGTH) % TRAIL_LENGTH;
        for (let k = 0; k < p.count; k++) {
          const idx = ((oldest + k) % TRAIL_LENGTH) * 3;
          const x = p.trail[idx];
          const y = p.trail[idx + 1];
          const z = p.trail[idx + 2];

          const y1 = y * cosX - z * sinX;
          const z1 = y * sinX + z * cosX;
          const x2 = x * cosY + z1 * sinY;
          const z2 = -x * sinY + z1 * cosY;
          const persp = FOCAL / (FOCAL - z2);
          projX[k] = cx + x2 * effScale * persp;
          projY[k] = cy + y1 * effScale * persp;
        }

        // stroke segments with alpha ramping up toward the head
        for (let k = 1; k < p.count; k++) {
          ctx.globalAlpha = Math.min(BASE_ALPHA * alphaScale * (k / (p.count - 1)), 1);
          ctx.beginPath();
          ctx.moveTo(projX[k - 1], projY[k - 1]);
          ctx.lineTo(projX[k], projY[k]);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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
