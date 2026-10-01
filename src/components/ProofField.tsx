// The textured field behind the top of every page: rows of small Lean 4,
// with "proof, not probability." set into them at intervals. Texture, not
// content, so it's hidden from assistive tech; each page's headline carries
// the meaning.
//
// The phrase is the one thing in the field meant to be read, so it's set
// apart three ways: the heading face instead of mono, about twice as bright,
// and spaced so it never runs into a Lean line.
//
// Deterministic (no randomness), so every render and every page draws the
// same field.

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
const ROWS = 32;
// Characters per row: wider than a 2560px screen at the largest type size.
const ROW_CHARS = 420;
// The phrase lands after every PHRASE_EVERY Lean lines, offset per row so
// it doesn't line up into a column. Every fourth row opens with it, so a
// phone-width screen, which only sees each row's first line or so, still
// gets the phrase.
const PHRASE_EVERY = 3;

type Segment = { text: string; phrase: boolean };

function buildRow(row: number): Segment[] {
  const segments: Segment[] = [];
  let length = 0;
  let lean = (row * 4) % LEAN.length;
  let sincePhrase = row % (PHRASE_EVERY + 1);
  while (length < ROW_CHARS) {
    const phrase = sincePhrase === PHRASE_EVERY;
    const text = phrase ? PHRASE : LEAN[lean++ % LEAN.length];
    sincePhrase = phrase ? 0 : sincePhrase + 1;
    segments.push({ text, phrase });
    length += text.length + 4;
  }
  return segments;
}

// Rows are staggered by a few characters so the Lean never lines up into
// columns: most start part-way off the left edge, but a row that opens with
// the phrase steps in instead, so the phrase is never clipped.
function rowIndent(row: number, segments: Segment[]): string {
  return segments[0].phrase ? `${(row % 3) * 2 + 1}ch` : `${-((row * 7) % 11) * 1.3}ch`;
}

const FIELD = Array.from({ length: ROWS }, (_, row) => {
  const segments = buildRow(row);
  return { segments, indent: rowIndent(row, segments) };
});

export function ProofField() {
  return (
    <div className="proof-field" aria-hidden="true">
      {FIELD.map(({ segments, indent }, row) => (
        <p className="proof-row" key={row} style={{ marginLeft: indent }}>
          {segments.map((seg, i) =>
            seg.phrase ? (
              <span className="proof-phrase" key={i}>
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
