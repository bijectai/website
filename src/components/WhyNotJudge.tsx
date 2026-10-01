// The comparison a reader is already making: why not ask another model? A
// plain table rather than side-by-side cards, then a note on where the kernel
// sits among other layers, offset right so it reads as the last word.
const ROWS = [
  {
    label: "Decides by",
    judge: "Reading the action and a prompt",
    gate: "Checking the action against a Lean 4 definition",
  },
  {
    label: "Same action twice",
    judge: "Can answer differently",
    gate: "Same verdict every time",
  },
  {
    label: "Instructions hidden in the action",
    judge: "Read, and can be persuaded",
    gate: "Treated as data",
  },
  {
    label: "What you keep",
    judge: "The model’s explanation",
    gate: "A signed verdict naming the rule",
  },
];

export function WhyNotJudge() {
  return (
    <section className="judge" id="why-not-a-judge" aria-labelledby="judge-title">
      <div className="wrap">
        <h2 className="h2 h2-set" id="judge-title">
          <span className="h2-line">A judge can be persuaded.</span>{" "}
          <span className="h2-line">A kernel can’t.</span>
        </h2>
        <p className="body judge-lede">
          LLM judges and prompt guardrails read the same text an attacker
          writes. One well-placed line in a file, a tool result, or a commit
          message can change their answer. The kernel doesn’t take
          instructions. It checks whether the action satisfies the policy.
        </p>

        <table className="compare">
          <thead>
            <tr>
              <td />
              <th scope="col">LLM judge or prompt guardrail</th>
              <th scope="col">Biject gate</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td data-label="LLM judge">{row.judge}</td>
                <td data-label="Biject gate">{row.gate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="body judge-note">
          Proof checks don’t replace your other layers. They cover the rules
          you can state precisely, like a spending limit, who may change a
          record, or which tools an agent may call. Keep heuristic filters and model-based review for
          the judgment calls. Put the kernel where a rule has to hold every
          time.
        </p>
      </div>
    </section>
  );
}
