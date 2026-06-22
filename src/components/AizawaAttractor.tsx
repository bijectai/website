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

      // advance the simulation
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let s = 0; s < STEPS_PER_FRAME; s++) {
          if (transitioning) stepBlend(p.cur, from, to, t);
          else stepField(p.cur, active);
        }
        // Respawn anything that goes non-finite or escapes the leash
        // (real orbits stay within ~3; only blend-time runaways exceed it).
        const r2 = p.cur.x * p.cur.x + p.cur.y * p.cur.y + p.cur.z * p.cur.z;
        if (!Number.isFinite(r2) || r2 > MAX_RADIUS * MAX_RADIUS) {
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

      function drawPass(greenPass: boolean) {
        ctx.strokeStyle = greenPass ? GREEN : INK;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.green !== greenPass || p.count < 2) continue;

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
            ctx.globalAlpha = BASE_ALPHA * (k / (p.count - 1));
            ctx.beginPath();
            ctx.moveTo(projX[k - 1], projY[k - 1]);
            ctx.lineTo(projX[k], projY[k]);
            ctx.stroke();
          }
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
