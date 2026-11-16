import { useCallback, useEffect, useRef, useState } from "react";

// The /audit-agent page's centerpiece: the four-stage audit pipeline with the
// scope gate under "Investigate". The kernel shows up twice (the gate and
// "Prove"), and that's the story the animation tells.
//
// When the figure scrolls into view it plays once: each stage lights up in
// turn, the gate allows one in-scope action, then blocks one out-of-scope
// click, which lands in "Blocked and logged". A short log under the boxes
// narrates what happened. Readers who prefer reduced motion get the finished
// state straight away. The captions under the figure carry the same content
// as text, so the animation itself is aria-hidden decoration.

type NodeId = "formalize" | "investigate" | "gate" | "blocked" | "prove" | "package";

/** The step at which each box lights up. */
const ACTIVE_AT: Record<NodeId, number> = {
  formalize: 1,
  investigate: 2,
  gate: 3,
  blocked: 4,
  prove: 5,
  package: 6,
};

/** One past the last step: everything shows as done. */
const FINAL = 7;
const STEP_MS = 1150;

type LogLine = { step: number; who: string; text: string; tone?: "ok" | "deny" };

// Hosts use the reserved .test TLD: this is a seeded target, not a real system.
const LOG: LogLine[] = [
  { step: 1, who: "spec", text: "AC-7 lockout_after_failed_attempts (max := 3) · approved" },
  { step: 2, who: "agent", text: "open admin.target.test/settings/security" },
  { step: 3, who: "gate", text: "read-only · host in scope · allowed", tone: "ok" },
  { step: 4, who: "agent", text: 'click "Export users" → share.outside.test' },
  { step: 4, who: "gate", text: "host not in scope · blocked · logged", tone: "deny" },
  { step: 5, who: "kernel", text: "ac-7_obj.a max_failed_attempts = 3 · SATISFIED · 1.1 ms", tone: "ok" },
  { step: 6, who: "package", text: "verdicts signed ed25519 · exported as OSCAL results" },
];

function state(id: NodeId, step: number): "idle" | "active" | "done" {
  const at = ACTIVE_AT[id];
  // The gate stays lit through the block, so the denial reads as its doing.
  if (id === "gate" && step === 4) return "active";
  if (step === at) return "active";
  return step > at ? "done" : "idle";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function AssessPipeline() {
  const figRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    if (prefersReducedMotion()) {
      setStep(FINAL);
      return;
    }
    setStep(0);
    setPlaying(true);
  }, []);

  // Advance one step at a time while playing.
  useEffect(() => {
    if (!playing) return;
    if (step >= FINAL) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 300 : STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, step]);

  // Start the first time most of the figure is on screen.
  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    if (!("IntersectionObserver" in window)) {
      setStep(FINAL);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          play();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(fig);
    return () => io.disconnect();
  }, [play]);

  const node = (id: NodeId) => `pipe-node pipe-${id} is-${state(id, step)}`;
  const denying = step === 4;

  return (
    <figure
      className={`pipe${denying ? " is-denying" : ""}${step >= FINAL ? " is-final" : ""}`}
      ref={figRef}
    >
      <p className="pipe-head">Agents collect facts. Only the kernel decides.</p>

      <div className="pipe-grid" aria-hidden="true">
        <div className={node("formalize")}>
          <span className="pipe-num">1</span>
          <span className="pipe-name">Formalize</span>
          <span className="pipe-text">NIST control text becomes a Lean spec, approved by your team</span>
        </div>

        <div className={node("investigate")}>
          <span className="pipe-num">2</span>
          <span className="pipe-name">Investigate</span>
          <span className="pipe-text">Agent browses the system read-only and records facts</span>
        </div>

        <div className={`${node("prove")} is-kernel`}>
          <span className="pipe-num">3</span>
          <span className="pipe-name">Prove</span>
          <span className="pipe-text">Kernel checks facts against the spec: pass, fail, review</span>
        </div>

        <div className={node("package")}>
          <span className="pipe-num">4</span>
          <span className="pipe-name">Package</span>
          <span className="pipe-text">Signed verdicts and evidence, exported as OSCAL results</span>
        </div>

        <div className={`pipe-vlink${step >= 2 ? " is-on" : ""}`}>
          <span className={`pipe-v pipe-v-down${step === 2 || step === 4 ? " is-pulse" : ""}`}>
            each action
          </span>
          <span className={`pipe-v pipe-v-up${step === 3 ? " is-pulse" : ""}`}>allowed</span>
        </div>

        <div className={`${node("gate")} is-kernel${denying ? " is-deny" : ""}`}>
          <span className="pipe-name">Scope gate</span>
          <span className="pipe-text">Every click checked before it runs. Out of scope: blocked</span>
        </div>

        <div className={`pipe-hlink${step >= 4 ? " is-on" : ""}${denying ? " is-pulse" : ""}`}>
          <span>out of scope</span>
        </div>

        <div className={`${node("blocked")} is-blocked`}>
          <span className="pipe-name">Blocked and logged</span>
          <span className="pipe-text">Never executes</span>
        </div>
      </div>

      <ol className="pipe-log" aria-hidden="true">
        {LOG.map((line, i) => (
          <li
            key={i}
            className={`${step >= line.step ? "is-shown" : ""}${line.tone ? ` is-${line.tone}` : ""}`}
          >
            <span className="pipe-log-who">{line.who}</span>
            <span className="pipe-log-text">{line.text}</span>
          </li>
        ))}
      </ol>

      <div className="pipe-foot">
        <span className="pipe-legend">
          <span className="pipe-swatch" aria-hidden="true" /> Runs in the Biject kernel
        </span>
        <button
          type="button"
          className="pipe-replay"
          onClick={play}
          disabled={playing}
          aria-label="Replay the pipeline animation"
        >
          Replay
        </button>
      </div>
    </figure>
  );
}
