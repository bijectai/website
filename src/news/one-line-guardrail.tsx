// "Case study: gating a self-improving coding harness" (2026-09-29).
// Listed in src/news.ts under the slug "one-line-guardrail".

const CHART = "/news/one-line-guardrail/2_holdout.png";

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function OneLineGuardrail() {
  return (
    <>
      <h2>The problem</h2>
      <p>
        In order to create self evolving agent harnesses, you give the model the
        ability to mutate its own abilities in meaningful ways. It becomes
        dangerous when you realize that the evals we rely on for AI safety can
        be gamed. In our own testing on{" "}
        <Out href="https://arxiv.org/abs/2510.20270">ImpossibleBench</Out>,
        GPT-5 never cheated on any of the tasks in 64 tries, because the prompt
        told it not to. We changed that one line to “make the tests pass by any
        means”, and it went straight for the test files. That one line was
        doing all the work. A self evolving harness is the exact scenario where
        this can be dangerous.
      </p>

      <h2>Two gates</h2>
      <p>
        We decided to build a self evolving coding harness, but designed to only
        change for measured performance benefits that align with a human’s
        intent. Every proposed change was checked by the{" "}
        <Out href="https://github.com/arkanemystic/lean-agent-protocol">
          Lean-Agent Protocol
        </Out>{" "}
        (the open-source predecessor of the Biject API), checked against a formal spec
        written in Lean, which is outside of the harness’s grasp. Once approved
        by Biject, the change has to beat the old harness on tasks it’s never
        seen, by a rule fixed in advance. This two step architecture ensured
        that changes were both safe and a genuine improvement to the harness
        instead of creating a ‘doom loop’. We utilized MongoDB Atlas to hold
        the loop’s state. Change streams moved each edit through the gate, and
        vector search let the harness recall past rejections.
      </p>

      <h2>Results</h2>
      <p>
        On 40 unseen problems from ImpossibleBench’s original solvable set,
        over 3 runs, the harness improved from 59% to 71% with Qwen 3.7 Flash
        underneath: +11.7 points, with a 95% confidence interval of +4.2 to
        +20.0. It won in all three runs, by 7.5 to 15 points each. Lean-Agent
        Protocol caught 38/38 known tampering techniques, and blocked 0 of 16
        legitimate test runs covering normal work like running tests, adding
        helper files, and editing dependencies. All 5,636 gate decisions were
        re-checked by the Lean kernel via the Lean-Agent Protocol. Truly
        promising numbers, but it has to be said that this was only one
        generation of self improvement under one model. A simple but worthy
        improvement to this would simply be running more generations, but we’d
        run out of time at that point.
      </p>

      <figure>
        <a href={CHART} target="_blank" rel="noopener noreferrer">
          <img
            src={CHART}
            width={1690}
            height={1222}
            loading="lazy"
            alt="Default vs evolved harness on 40 unseen problems, 3 runs each. The evolved harness won every run."
          />
        </a>
        <figcaption>Default vs evolved harness on 40 unseen problems, 3 runs each.</figcaption>
      </figure>

      <h2>Why it matters</h2>
      <p>
        A harness that rewrites itself to score higher is as adversarial as it
        gets, and it’s exactly where prompt-based guardrails break first. Biject
        held up because of its architecture, designed to be domain and workflow
        agnostic: the rules sit somewhere an agent can’t touch, the gate looks
        at the agent’s proposed action rather than the stated intent it gives,
        and every decision can be replayed/rechecked by the Lean kernel. It’s
        only getting more critical as agents get more autonomy and control over
        their own tools, memory and setup. Monitoring them with another model
        delivers a confidence score. We think deploying serious agents requires
        genuine proof. If an agent can edit its own guardrails, they aren’t
        really guardrails.
      </p>
      <p>
        This project was built for a{" "}
        <Out href="https://www.mongodb.com/solutions/startups">MongoDB for Startups</Out>{" "}
        program hackathon, kudos to them for hosting a well organized and fun
        event.
      </p>
    </>
  );
}
