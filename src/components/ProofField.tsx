import { useEffect, useRef } from "react";

/* ============================================================
   The textured field behind the top of every page: rows of small Lean 4,
   with "proof, not probability." set into them at intervals. Texture, not
   content, so it's hidden from assistive tech; each page's headline carries
   the meaning.

   The phrases are the only things in the field meant to be read, so they're
   set apart three ways: semibold, about twice as bright, and spaced so they
   never run into a Lean line. The Lean itself is tinted the way an editor
   would set it (keywords green, operators a shade up).

   It's drawn on a canvas so it can be alive:

   - It keeps rewriting. Every second or so a decode pass runs along a
     stretch of some row: the characters under it churn through Lean
     symbols and settle back, as if that line were being recompiled.
   - It answers the cursor. Code near the pointer brightens and leans away
     from it, and churns where the pointer moves (faster movement stirs
     more), settling back once it has passed.

   The layout is deterministic (no randomness), so every render and every
   page sets the same field; only the motion is random.

   ------------------------------------------------------------
   Keeping it cheap

   It shares the first screen with the attractor, and it's decoration, so
   it's built to cost next to nothing and to give way first:

   1. One settled layer. The resting field, its fade down the screen
      included, is drawn once per layout into an offscreen canvas. The fade
      used to be a CSS mask, which made the compositor re-mask the whole
      layer every frame the canvas changed; baked in, it costs nothing.
   2. Dirty rows only. A frame restores, from that layer, just the stretch
      of each row that held a live character last frame or holds one now,
      then draws the live characters on top. Nothing redraws the whole
      canvas, and the canvas stops where the fade does.
   3. No garbage, no text layout. Live characters, churn timers and their
      bookkeeping live in typed arrays sized once, so a frame allocates
      nothing and the collector has no reason to stall one. Live characters
      are stamped from a glyph atlas built per layout, so a frame never
      calls fillText (font lookup and shaping on every call) or switches
      fonts and colors.
   4. Idle means idle. A pointer resting over the field, with nothing
      churning and no pass running, draws nothing at all. Cursor motion
      redraws at up to 60fps (never more, on a fast display), ambient
      passes at 30fps or less.
   5. Quality tiers. It measures its own draw time and the page's frame
      rate, and when either runs slow it steps down a tier: rarer passes,
      then none and a smaller, slower cursor response, then a still field.
      Like the attractor, a drop is a ratchet. Device hints, and a battery
      that's low and unplugged, choose a lighter tier from the start.
   6. Nothing runs unseen. Offscreen or in a hidden tab it stops, and
      prefers-reduced-motion gets the still field.
   ============================================================ */

// ---- Look & feel (all tweakable) ----
// Character kinds, indexing the tables below.
const CODE = 0;
const KEYWORD = 1;
const OPERATOR = 2;
const PHRASE_CHAR = 3;
const GAP = 4;
// Resting alpha per kind: the Lean bright enough to read as code you could
// follow if you leant in, and still well under the sub-headline (0.7) so it
// never competes with the copy. HOT_ALPHA is what it reaches under the
// cursor; CHURN_LIFT is added to a character that's churning on its own.
const REST_ALPHA = [0.1, 0.26, 0.17, 0.22];
const HOT_ALPHA = [0.5, 0.75, 0.6, 0.7];
const CHURN_LIFT = 0.22;
const CHURN_GLYPHS = Array.from("∀∃λ→↔∧∨¬≤≥⟨⟩∈⊢≠≡ℕ:=_.01pqhvxs");
const GLYPH_MS = 70; // a churning character changes this often

const STIR_PUSH = 7; // px the nearest characters lean away
const STIR_MOVE = 0.12; // churn chance per frame per character, at full pointer speed
const STIR_FULL_SPEED = 25; // px per frame that counts as full speed
const STIR_FLOOR = 0.03; // influence below this changes nothing visible; skipped
const CHURN_MS = [180, 650] as const; // how long a stirred character churns

const PASS_CELLS = [16, 46] as const; // how much of a row a pass rewrites
const PASS_SPEED = [45, 85] as const; // cells per second
const PASS_WINDOW = 5; // cells still churning behind a pass's head

// The field fades out down the screen: full strength to FADE_FROM of the
// box's height, gone by FADE_TO. Passes only run above PASS_VISIBLE, where
// they can be seen.
const FADE_FROM = 0.16;
const FADE_TO = 0.56;
const PASS_VISIBLE = 0.5;

// ---- Performance: quality tiers ----
// Index 0 is the full look. Each step down rewrites less often (passEvery
// null: no passes), answers the cursor in a smaller circle (stir, px; 0:
// not at all) and at a lower rate. Rates are minimum ms between frames.
type Tier = {
  passEvery: readonly [number, number] | null;
  ambientMs: number;
  stir: number;
  stirMs: number;
};
const TIERS: readonly Tier[] = [
  { passEvery: [400, 1100], ambientMs: 33, stir: 130, stirMs: 16 },
  { passEvery: [900, 2200], ambientMs: 50, stir: 110, stirMs: 16 },
  { passEvery: null, ambientMs: 50, stir: 90, stirMs: 33 },
  { passEvery: null, ambientMs: 50, stir: 0, stirMs: 33 },
];
const LOW_POWER_TIER = 2; // the most a low, unplugged battery allows
const MEASURE_FRAMES = 60; // drawn frames per quality measurement window
const MEASURE_GRACE_MS = 2000; // let the page settle (attractor warm-up) first
const DRAW_SLOW_MS = 3; // our draw averaging worse than this: drop a tier
const DRAW_FAST_MS = 1; // better than this (and the page keeping up): try one up
const PAGE_SLOW_MS = 24; // the page's frames averaging worse while we animate: drop
const PAGE_FAST_MS = 18;
const LIVE_CAP = 4096; // live characters per frame (a full-tier stir is ~300)

// ---- The field's text ----
// Policy-shaped Lean 4: a limit, a permission, an order of operations, and
// the soundness and uniqueness facts the gate relies on. Illustrative.
const LEAN = [
  "structure Policy where (name : String) (holds : Action → Prop)",
  "inductive Verdict | allow | deny (rule : String)",
  "structure Action where (tool : Tool) (args : Args) (actor : Role)",
  "def withinLimit (t : Transfer) : Prop := t.amount ≤ t.account.limit",
  "theorem limit_respected (t : Transfer) (h : approved t) : t.amount ≤ t.account.limit := h.bound",
  "def mayWrite (r : Role) (rec : Record) : Prop := rec.owner = r ∨ r = .admin",
  "def requiresSignOff (rel : Release) : Prop := rel.signOff.isSome",
  "def check (p : Policy) [DecidablePred p.holds] (a : Action) : Verdict := if p.holds a then .allow else .deny p.name",
  "theorem verdict_unique (h₁ : check p a = v₁) (h₂ : check p a = v₂) : v₁ = v₂ := h₁ ▸ h₂",
  "theorem deny_sound (h : ¬ p.holds a) : check p a = .deny p.name := by simp [check, h]",
  "instance : DecidablePred withinLimit := fun t => Nat.decLe _ _",
  "∀ v ∈ log, signed v ∧ chained v",
  "example : ¬ withinLimit ⟨501, ⟨500⟩⟩ := by decide",
  "theorem allow_iff : check p a = .allow ↔ p.holds a := by unfold check; split <;> simp_all",
  "def Policy.and (p q : Policy) : Policy := ⟨p.name ++ \" ∧ \" ++ q.name, fun a => p.holds a ∧ q.holds a⟩",
  "theorem order_respected : ∀ s ∈ run, ∀ d ∈ deps s, d.approvedBefore s := by intro s hs d hd; exact (valid run).deps hs hd",
];

const PHRASE = "proof, not probability.";

/** The hero's set: the anchor phrase plus lines it alternates with. */
export const HERO_PHRASES = [
  PHRASE,
  "the kernel has the last word",
  "no proof, no action",
  "every verdict signed",
  "replay any decision",
  "the policy can’t be prompted",
  "out of the agent’s reach",
  "decidable by design",
  "QED, every call",
];
const ROWS = 32;
// Characters per row: wider than a 2560px screen at the largest type size.
const ROW_CHARS = 420;
// The phrase lands after every PHRASE_EVERY Lean lines, offset per row so
// it doesn't line up into a column. Every fourth row opens with it, so a
// phone-width screen, which only sees each row's first line or so, still
// gets the phrase.
const PHRASE_EVERY = 3;
// Blank cells between neighbouring lines in a row.
const GAP_CELLS = 4;

type Segment = { text: string; phrase: boolean };

// With more than one phrase, the first (the anchor) takes every other phrase
// slot and the rest rotate through the slots between. The anchor/other
// alternation is offset every fourth row, so the rows that open with a phrase
// (the ones a phone sees) alternate too. The other lines take turns in order
// across the whole field (`turn` is shared by every row), so each one shows
// up equally and neighbouring slots never repeat.
function buildRow(row: number, phrases: string[], turn: { n: number }): Segment[] {
  const segments: Segment[] = [];
  const others = phrases.length - 1;
  let length = 0;
  let lean = (row * 4) % LEAN.length;
  let sincePhrase = row % (PHRASE_EVERY + 1);
  let slot = 0;
  while (length < ROW_CHARS) {
    const phrase = sincePhrase === PHRASE_EVERY;
    let text: string;
    if (!phrase) text = LEAN[lean++ % LEAN.length];
    else if (others === 0 || (slot++ + Math.floor(row / 4)) % 2 === 0) text = phrases[0];
    else text = phrases[1 + (turn.n++ % others)];
    sincePhrase = phrase ? 0 : sincePhrase + 1;
    segments.push({ text, phrase });
    length += text.length + GAP_CELLS;
  }
  return segments;
}

// Rows are staggered by a few cells so the Lean never lines up into
// columns: most start part-way off the left edge, but a row that opens with
// the phrase steps in instead, so the phrase is never clipped.
function rowIndent(row: number, segments: Segment[]): number {
  return segments[0].phrase ? (row % 3) * 2 + 1 : -((row * 7) % 11) * 1.3;
}

// Lean keywords and operators. One capture group, so split() hands them back
// at the odd indices.
const TOKEN =
  /(\b(?:structure|inductive|def|theorem|instance|example|where|fun|by|if|then|else)\b|:=|[→↔∀∈∧∨¬≤▸])/;

/** One row as a run of monospace cells, each with its kind. */
type Row = { chars: string[]; kinds: Uint8Array; indent: number };

function layoutRow(segments: Segment[], indent: number): Row {
  const chars: string[] = [];
  const kinds: number[] = [];
  const push = (text: string, kind: number) => {
    for (const ch of text) {
      chars.push(ch);
      kinds.push(ch === " " ? GAP : kind);
    }
  };
  for (const seg of segments) {
    if (seg.phrase) push(seg.text, PHRASE_CHAR);
    else
      seg.text.split(TOKEN).forEach((part, i) =>
        push(part, i % 2 === 0 ? CODE : /^[a-z]/.test(part) ? KEYWORD : OPERATOR),
      );
    push(" ".repeat(GAP_CELLS), GAP);
  }
  return { chars, kinds: Uint8Array.from(kinds), indent };
}

function buildField(phrases: string[]): Row[] {
  const turn = { n: 0 };
  return Array.from({ length: ROWS }, (_, row) => {
    const segments = buildRow(row, phrases, turn);
    return layoutRow(segments, rowIndent(row, segments));
  });
}

const DEFAULT_FIELD = buildField([PHRASE]);
const HERO_FIELD = buildField(HERO_PHRASES);

// Every character the field can draw, once each: the glyph atlas's columns.
const GLYPHS = [...new Set([...LEAN.join(""), ...HERO_PHRASES.join(""), ...CHURN_GLYPHS])];
const FIELD_CHARS = GLYPHS.join("");
const GLYPH_INDEX = new Map(GLYPHS.map((g, i) => [g, i]));
const CHURN_INDEX = Uint16Array.from(CHURN_GLYPHS, (g) => GLYPH_INDEX.get(g) ?? 0);

// Cells are keyed row * KEY_STRIDE + column; no row runs this long.
const KEY_STRIDE = 1024;

const between = ([lo, hi]: readonly [number, number]) => lo + Math.random() * (hi - lo);

// The atlas column of a churn glyph for a cell, holding for GLYPH_MS and
// then changing: a cheap integer hash of the cell and the current tick.
function churnGlyph(row: number, col: number, now: number): number {
  let h =
    Math.imul(row, 73856093) ^ Math.imul(col, 19349663) ^ Math.imul(Math.floor(now / GLYPH_MS), 83492791);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return CHURN_INDEX[(h >>> 0) % CHURN_INDEX.length];
}

type Pass = { row: number; from: number; len: number; t0: number; speed: number };

// Device hints for the opening tier, read the same way as the attractor's:
// few cores or little memory start a step down, and adapt() takes it from
// there. Touch devices never stir (no hover), so they only pay for passes.
function initialTier(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const weak =
    cores <= 4 ||
    (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) ||
    window.matchMedia("(pointer: coarse)").matches;
  return weak ? 1 : 0;
}

type BatteryLike = EventTarget & { charging: boolean; level: number };

/**
 * `hero` mixes in the hero's other lines (HERO_PHRASES); every other page
 * sets "proof, not probability." alone.
 */
export function ProofField({ hero = false }: { hero?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const layer = document.createElement("canvas");
    const lctx = layer.getContext("2d");
    const atlas = document.createElement("canvas");
    const actx = atlas.getContext("2d");
    if (!box || !canvas || !ctx || !lctx || !actx) return;
    const field = hero ? HERO_FIELD : DEFAULT_FIELD;
    const rows = field.length;
    // Each cell's atlas column.
    const rowGlyphs = field.map((row) => Uint16Array.from(row.chars, (ch) => GLYPH_INDEX.get(ch) ?? 0));

    // Colors follow the theme, like the attractor's.
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#ffffff";
    const GREEN = css.getPropertyValue("--color-green").trim() || "#10b981";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // ---- metrics: the type settings come from .proof-field in style.css ----
    let W = 0;
    let H = 0;
    let dpr = 1;
    let fontSize = 14;
    let family = "monospace";
    let rowH = 28;
    let padTop = 0;
    let cellW = 8;
    let passRows = 0;
    let fontRegular = "";
    let fontBold = "";
    // Atlas sprites, in CSS px and whole device px; spritePad is the room
    // either side of the cell.
    let spriteW = 0;
    let spriteH = 0;
    let spriteDW = 0;
    let spriteDH = 0;
    let spritePad = 0;
    // The canvas's page position, so the pointer maps onto it without a
    // layout read per frame (the field is pinned to the top of the page).
    let originX = 0;
    let originY = 0;
    const rowFade = new Float32Array(rows); // the baked fade at each row's middle
    const rowX = (r: number) => field[r].indent * cellW;
    // The canvas sits inside the box's top padding, so rows start at 0.
    const rowTop = (r: number) => r * rowH;

    function readType() {
      const s = getComputedStyle(box!);
      fontSize = parseFloat(s.fontSize) || 14;
      rowH = parseFloat(s.lineHeight) || fontSize * 2.05;
      padTop = parseFloat(s.paddingTop) || 0;
      family = s.fontFamily;
      fontRegular = `400 ${fontSize}px ${family}`;
      fontBold = `600 ${fontSize}px ${family}`;
    }

    function layout() {
      readType();
      const boxH = box!.clientHeight;
      const fadeFrom = boxH * FADE_FROM - padTop;
      const fadeTo = boxH * FADE_TO - padTop;
      W = box!.clientWidth;
      // Nothing below the end of the fade is visible, so the canvas ends there.
      H = Math.max(1, Math.min(Math.ceil(rows * rowH), Math.ceil(fadeTo)));
      passRows = Math.max(0, Math.min(rows, Math.floor((boxH * PASS_VISIBLE - padTop) / rowH)));
      for (let r = 0; r < rows; r++) {
        const mid = rowTop(r) + rowH / 2;
        rowFade[r] = Math.min(Math.max((fadeTo - mid) / (fadeTo - fadeFrom), 0), 1);
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [canvas!, layer]) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      canvas!.style.height = `${H}px`;
      for (const c of [ctx!, lctx!]) {
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.textBaseline = "middle";
      }
      // Restores and sprites copy device pixels 1:1; never resample them.
      ctx!.imageSmoothingEnabled = false;
      ctx!.font = fontRegular;
      cellW = ctx!.measureText("M").width;

      // The glyph atlas: every glyph at full strength in four variants (rows:
      // ink, green, ink semibold, green semibold). Live characters are
      // stamped from here with drawImage, which skips the font lookup and
      // shaping fillText pays on every call.
      // Sprites are cropped close to the glyph (stamps cost by area), with a
      // little room either side for glyphs that overhang their cell.
      spriteDW = Math.ceil(cellW * 1.6 * dpr);
      spriteDH = Math.ceil(fontSize * 1.5 * dpr);
      spriteW = spriteDW / dpr;
      spriteH = spriteDH / dpr;
      spritePad = (spriteW - cellW) / 2;
      atlas.width = spriteDW * GLYPHS.length;
      atlas.height = spriteDH * 4;
      actx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      actx!.textBaseline = "middle";
      for (let v = 0; v < 4; v++) {
        actx!.font = v >= 2 ? fontBold : fontRegular;
        actx!.fillStyle = v % 2 ? GREEN : INK;
        for (let g = 0; g < GLYPHS.length; g++) {
          actx!.fillText(GLYPHS[g], g * spriteW + spritePad, v * spriteH + spriteH / 2);
        }
      }

      // The settled field, one pass per kind so the font and color change
      // four times, not per character…
      for (let kind = CODE; kind <= PHRASE_CHAR; kind++) {
        lctx!.font = kind === PHRASE_CHAR ? fontBold : fontRegular;
        lctx!.fillStyle = kind === KEYWORD ? GREEN : INK;
        lctx!.globalAlpha = REST_ALPHA[kind];
        for (let r = 0; r < rows; r++) {
          const { chars, kinds } = field[r];
          const x0 = rowX(r);
          const y = rowTop(r) + rowH / 2;
          const first = Math.max(0, Math.floor(-x0 / cellW));
          const last = Math.min(chars.length, Math.ceil((W - x0) / cellW));
          for (let c = first; c < last; c++) {
            if (kinds[c] === kind) lctx!.fillText(chars[c], x0 + c * cellW, y);
          }
        }
      }
      lctx!.globalAlpha = 1;
      // …then the fade down the screen, kept only where it lets the field
      // through.
      lctx!.globalCompositeOperation = "destination-in";
      const fade = lctx!.createLinearGradient(0, fadeFrom, 0, fadeTo);
      fade.addColorStop(0, "#000");
      fade.addColorStop(1, "rgba(0, 0, 0, 0)");
      lctx!.fillStyle = fade;
      lctx!.fillRect(0, 0, W, H);
      lctx!.globalCompositeOperation = "source-over";

      const rect = canvas!.getBoundingClientRect();
      originX = rect.left + window.scrollX;
      originY = rect.top + window.scrollY;
      resetSpans();
    }

    function drawSettled() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.drawImage(layer, 0, 0, W, H);
    }

    // ---- live characters, allocation-free ----
    // Cells are keyed row * KEY_STRIDE + column. A frame's live characters
    // fill these arrays from 0; `stamp` marks which frame last claimed a cell
    // and `slotOf` where, so a cell claimed twice (a pass under the cursor)
    // is updated in place rather than drawn twice.
    const CELLS = rows * KEY_STRIDE;
    const liveKey = new Int32Array(LIVE_CAP);
    const liveDX = new Float32Array(LIVE_CAP);
    const liveDY = new Float32Array(LIVE_CAP);
    const liveAlpha = new Float32Array(LIVE_CAP);
    const liveVariant = new Uint8Array(LIVE_CAP); // atlas row
    const liveGlyph = new Uint16Array(LIVE_CAP); // atlas column
    let liveN = 0;
    const stamp = new Int32Array(CELLS);
    const slotOf = new Int32Array(CELLS);
    let frameId = 0;

    // Each row's horizontal extent of live characters, this frame and last;
    // the union is what a frame restores from the layer.
    const spanLo = new Float32Array(rows);
    const spanHi = new Float32Array(rows);
    const prevLo = new Float32Array(rows);
    const prevHi = new Float32Array(rows);
    function resetSpans() {
      spanLo.fill(Infinity);
      spanHi.fill(-Infinity);
      prevLo.fill(Infinity);
      prevHi.fill(-Infinity);
    }
    resetSpans();

    function put(r: number, c: number, glyph: number, alpha: number, green: boolean, dx = 0, dy = 0) {
      const key = r * KEY_STRIDE + c;
      let i: number;
      if (stamp[key] === frameId) {
        i = slotOf[key];
      } else {
        if (liveN === LIVE_CAP) return;
        i = liveN++;
        stamp[key] = frameId;
        slotOf[key] = i;
        liveKey[i] = key;
      }
      liveGlyph[i] = glyph;
      liveAlpha[i] = Math.min(alpha, 1) * rowFade[r];
      const kind = field[r].kinds[c];
      liveVariant[i] = (kind === PHRASE_CHAR ? 2 : 0) + (green || kind === KEYWORD ? 1 : 0);
      liveDX[i] = dx;
      liveDY[i] = dy;
      const x = rowX(r) + c * cellW;
      if (x < spanLo[r]) spanLo[r] = x;
      if (x + cellW > spanHi[r]) spanHi[r] = x + cellW;
    }

    // Churning characters: when each stops, and a compact list of which.
    const churnUntil = new Float64Array(CELLS);
    const churnKeys = new Int32Array(LIVE_CAP);
    let churnN = 0;
    function startChurn(key: number, until: number) {
      if (churnUntil[key] !== 0 || churnN === LIVE_CAP) return;
      churnUntil[key] = until;
      churnKeys[churnN++] = key;
    }
    function clearChurn() {
      for (let i = 0; i < churnN; i++) churnUntil[churnKeys[i]] = 0;
      churnN = 0;
    }

    let passes: Pass[] = [];

    function spawnPass(now: number) {
      if (passRows === 0) return;
      const row = Math.floor(Math.random() * passRows);
      const len = Math.round(between(PASS_CELLS));
      const x0 = rowX(row);
      const first = Math.max(0, Math.ceil(-x0 / cellW));
      const last = Math.min(field[row].chars.length, Math.floor((W - x0) / cellW)) - len;
      if (last <= first) return;
      const from = first + Math.floor(Math.random() * (last - first));
      passes.push({ row, from, len, t0: now, speed: between(PASS_SPEED) });
    }

    // Restores one row's stretch from the settled layer, snapped to device
    // pixels so the copy is exact.
    function restore(r: number, x0: number, x1: number) {
      // A pushed character, or a glyph wider than its cell, can land this
      // far outside the cell.
      const pad = STIR_PUSH + spritePad + 1;
      const sx = Math.max(0, Math.floor((x0 - pad) * dpr));
      const ex = Math.min(canvas!.width, Math.ceil((x1 + pad) * dpr));
      const sy = Math.floor(rowTop(r) * dpr);
      const ey = Math.min(canvas!.height, Math.ceil((rowTop(r) + rowH) * dpr));
      if (ex <= sx || ey <= sy) return;
      const x = sx / dpr;
      const y = sy / dpr;
      const w = (ex - sx) / dpr;
      const h = (ey - sy) / dpr;
      ctx!.clearRect(x, y, w, h);
      ctx!.drawImage(layer, sx, sy, ex - sx, ey - sy, x, y, w, h);
    }

    // One frame: gather this frame's live characters, restore every row
    // stretch that held one last frame or holds one now, then draw them.
    function draw(now: number, stir: { x: number; y: number; speed: number; radius: number } | null) {
      frameId++;
      liveN = 0;

      for (let i = 0; i < churnN; ) {
        const key = churnKeys[i];
        if (churnUntil[key] <= now) {
          churnUntil[key] = 0;
          churnKeys[i] = churnKeys[--churnN];
          continue;
        }
        const r = (key / KEY_STRIDE) | 0;
        const c = key - r * KEY_STRIDE;
        put(r, c, churnGlyph(r, c, now), REST_ALPHA[field[r].kinds[c]] + CHURN_LIFT, false);
        i++;
      }

      for (let i = 0; i < passes.length; ) {
        const pass = passes[i];
        const head = ((now - pass.t0) / 1000) * pass.speed;
        if (head - PASS_WINDOW > pass.len) {
          passes[i] = passes[passes.length - 1];
          passes.pop();
          continue;
        }
        const kinds = field[pass.row].kinds;
        const lo = Math.max(0, Math.ceil(head - PASS_WINDOW));
        const hi = Math.min(pass.len - 1, Math.floor(head));
        for (let k = lo; k <= hi; k++) {
          const c = pass.from + k;
          const kind = kinds[c];
          if (kind === GAP) continue;
          const behind = head - k;
          const glyph = churnGlyph(pass.row, c, now);
          if (behind < 1) put(pass.row, c, glyph, 0.75, true);
          else put(pass.row, c, glyph, REST_ALPHA[kind] + 0.28 * (1 - behind / PASS_WINDOW), false);
        }
        i++;
      }

      if (stir) {
        const R = stir.radius;
        const R2 = R * R;
        const chance = STIR_MOVE * Math.min(1, stir.speed / STIR_FULL_SPEED);
        const firstRow = Math.max(0, Math.floor((stir.y - R) / rowH));
        const lastRow = Math.min(rows - 1, Math.floor((stir.y + R) / rowH));
        for (let r = firstRow; r <= lastRow; r++) {
          if (rowFade[r] === 0) break; // the rest are faded out
          const kinds = field[r].kinds;
          const glyphs = rowGlyphs[r];
          const x0 = rowX(r);
          const dy = rowTop(r) + rowH / 2 - stir.y;
          const first = Math.max(0, Math.floor((stir.x - R - x0) / cellW));
          const last = Math.min(kinds.length - 1, Math.ceil((stir.x + R - x0) / cellW));
          for (let c = first; c <= last; c++) {
            const kind = kinds[c];
            if (kind === GAP) continue;
            const dx = x0 + (c + 0.5) * cellW - stir.x;
            const d2 = dx * dx + dy * dy;
            if (d2 >= R2) continue;
            const d = Math.sqrt(d2);
            const t = 1 - d / R;
            const f = t * t * (3 - 2 * t) * presence;
            if (f < STIR_FLOOR) continue;
            const key = r * KEY_STRIDE + c;
            if (chance > 0 && Math.random() < f * chance) startChurn(key, now + between(CHURN_MS));
            const push = d > 0 ? (STIR_PUSH * f) / d : 0;
            put(
              r,
              c,
              churnUntil[key] !== 0 ? churnGlyph(r, c, now) : glyphs[c],
              REST_ALPHA[kind] + (HOT_ALPHA[kind] - REST_ALPHA[kind]) * f,
              false,
              dx * push,
              dy * push * 0.6,
            );
          }
        }
      }

      for (let r = 0; r < rows; r++) {
        const lo = Math.min(spanLo[r], prevLo[r]);
        const hi = Math.max(spanHi[r], prevHi[r]);
        if (hi >= lo) restore(r, lo, hi);
      }
      prevLo.set(spanLo);
      prevHi.set(spanHi);
      spanLo.fill(Infinity);
      spanHi.fill(-Infinity);

      // Stamp each live character from the atlas, snapped to device pixels
      // so the copy is exact.
      for (let i = 0; i < liveN; i++) {
        const key = liveKey[i];
        const r = (key / KEY_STRIDE) | 0;
        const c = key - r * KEY_STRIDE;
        const x = Math.round((rowX(r) + c * cellW - spritePad + liveDX[i]) * dpr) / dpr;
        const y = Math.round((rowTop(r) + (rowH - spriteH) / 2 + liveDY[i]) * dpr) / dpr;
        ctx!.globalAlpha = liveAlpha[i];
        ctx!.drawImage(
          atlas,
          liveGlyph[i] * spriteDW,
          liveVariant[i] * spriteDH,
          spriteDW,
          spriteDH,
          x,
          y,
          spriteW,
          spriteH,
        );
      }
      ctx!.globalAlpha = 1;
    }

    // ---- quality ----
    let tier = initialTier();
    let tierFloor = 0; // best tier still allowed; a measured drop ratchets this
    let batteryTier = 0; // a low, unplugged battery raises this
    const currentTier = () => TIERS[Math.max(tier, batteryTier)];

    let measureFrom = 0;
    let drawnFrames = 0;
    let drawMs = 0;
    let pageFrames = 0;
    let pageMs = 0;

    // One verdict per MEASURE_FRAMES drawn frames, never per frame: a slow
    // second means the device can't hold this tier, a slow frame means
    // nothing.
    function adapt() {
      const draw = drawMs / drawnFrames;
      const page = pageFrames ? pageMs / pageFrames : 0;
      drawnFrames = drawMs = pageFrames = pageMs = 0;
      if ((draw > DRAW_SLOW_MS || page > PAGE_SLOW_MS) && tier < TIERS.length - 1) {
        tier++;
        tierFloor = tier;
      } else if (draw < DRAW_FAST_MS && page < PAGE_FAST_MS && tier > tierFloor) {
        tier--;
      }
    }

    // ---- pointer ----
    // The raw pointer (client coords), a smoothed copy the field follows,
    // and how present it is (eases in on arrival, out when it leaves).
    const pointer = { x: 0, y: 0, in: false };
    let sx = 0;
    let sy = 0;
    let lastX = 0;
    let lastY = 0;
    let lastScrollX = 0;
    let lastScrollY = 0;
    let presence = 0;
    let wasNear = false;

    // ---- the loop ----
    let raf = 0;
    let running = false;
    let ready = false;
    let disposed = false;
    let lastFrame = 0;
    let lastDraw = 0;
    let nextPassAt = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const interval = now - lastFrame;
      lastFrame = now;
      const spec = currentTier();

      if (spec.passEvery && now >= nextPassAt) {
        spawnPass(now);
        nextPassAt = now + between(spec.passEvery);
      }

      const speed = Math.hypot(pointer.x - lastX, pointer.y - lastY);
      lastX = pointer.x;
      lastY = pointer.y;
      const moveX = (pointer.x - sx) * 0.35;
      const moveY = (pointer.y - sy) * 0.35;
      const fadeIn = ((pointer.in ? 1 : 0) - presence) * 0.12;
      sx += moveX;
      sy += moveY;
      presence += fadeIn;
      // Scrolling slides the field under a resting pointer, which moves it
      // as far as the field is concerned.
      const scrolled = window.scrollX !== lastScrollX || window.scrollY !== lastScrollY;
      lastScrollX = window.scrollX;
      lastScrollY = window.scrollY;
      const mx = sx - (originX - lastScrollX);
      const my = sy - (originY - lastScrollY);
      const R = spec.stir;
      const near = R > 0 && presence > 0.01 && mx > -R && mx < W + R && my > -R && my < H + R;
      const stirring =
        near && (speed > 0 || scrolled || Math.abs(moveX) + Math.abs(moveY) > 0.05 || Math.abs(fadeIn) > 0.001);
      // Leaving the field needs one last frame to settle what it left.
      const leaving = wasNear && !near;
      wasNear = near;

      if (!stirring && !leaving && passes.length === 0 && churnN === 0) return;
      if (now - lastDraw < (stirring ? spec.stirMs : spec.ambientMs) - 2) return;
      if (now > measureFrom && interval < 100) {
        pageFrames++;
        pageMs += interval;
      }
      lastDraw = now;
      const t0 = performance.now();
      draw(now, near ? { x: mx, y: my, speed, radius: R } : null);
      if (now > measureFrom) {
        drawMs += performance.now() - t0;
        if (++drawnFrames >= MEASURE_FRAMES) adapt();
      }
    }

    // Offscreen or hidden costs nothing, and prefers-reduced-motion gets the
    // still field instead of a loop.
    let onscreen = true;

    function sync() {
      const wanted = ready && onscreen && !document.hidden && !reduceMotion.matches;
      if (wanted === running) return;
      running = wanted;
      if (wanted) {
        measureFrom = performance.now() + MEASURE_GRACE_MS;
        drawnFrames = drawMs = pageFrames = pageMs = 0;
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        // Park on the clean field: nothing frozen mid-churn.
        clearChurn();
        passes = [];
        resetSpans();
        if (ready) drawSettled();
      }
    }

    // Lay out once the mono face has loaded, so the cells are measured on
    // the real glyphs. Passing every character the field can show pulls in
    // the face's symbol subsets too (∀, →, ≤ …), which a canvas wouldn't
    // fetch on its own. A font that fails to load falls back the same way.
    readType();
    Promise.all([document.fonts.load(fontRegular, FIELD_CHARS), document.fonts.load(fontBold, FIELD_CHARS)])
      .catch(() => undefined)
      .then(() => {
        if (disposed) return;
        layout();
        ready = true;
        drawSettled();
        sync();
      });

    // Re-lay out when the box resizes (type sizes follow the viewport).
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (!ready || resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        layout();
        drawSettled();
      });
    });
    ro.observe(box);

    const io = new IntersectionObserver(
      (entries) => {
        onscreen = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    // A low battery that isn't charging usually means the OS is throttling
    // too; the field steps down to LOW_POWER_TIER until it's plugged in.
    // (Chromium only; elsewhere the measurements do the same job.)
    let battery: BatteryLike | null = null;
    const onBattery = () => {
      batteryTier = battery && !battery.charging && battery.level <= 0.2 ? LOW_POWER_TIER : 0;
    };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    nav
      .getBattery?.()
      .then((b) => {
        if (disposed) return;
        battery = b;
        onBattery();
        b.addEventListener("levelchange", onBattery);
        b.addEventListener("chargingchange", onBattery);
      })
      .catch(() => undefined);

    // The field sits under the page, so it listens to the whole window.
    // Touch has no hover, so only a mouse or pen stirs it.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!pointer.in) {
        sx = lastX = e.clientX;
        sy = lastY = e.clientY;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.in = true;
    };
    const onLeave = () => {
      pointer.in = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      running = false;
      ro.disconnect();
      io.disconnect();
      battery?.removeEventListener("levelchange", onBattery);
      battery?.removeEventListener("chargingchange", onBattery);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
    };
  }, [hero]);

  return (
    <div className="proof-field" ref={boxRef} aria-hidden="true">
      <canvas className="proof-canvas" ref={canvasRef} />
    </div>
  );
}
