// The textured field behind the top of every page: rows of small Lean 4,
// with "proof, not probability." set into them at intervals. Texture, not
// content, so it's hidden from assistive tech; each page's headline carries
// the meaning.
//
// The phrases are the only things in the field meant to be read, so they're
// set apart three ways: the heading face instead of mono, about twice as
// bright, and spaced so they never run into a Lean line.
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

function buildField(phrases: string[]) {
  const turn = { n: 0 };
  return Array.from({ length: ROWS }, (_, row) => {
    const segments = buildRow(row, phrases, turn);
    return { segments, indent: rowIndent(row, segments) };
  });
}

const DEFAULT_FIELD = buildField([PHRASE]);
const HERO_FIELD = buildField(HERO_PHRASES);

/**
 * `hero` mixes in the hero's other lines (HERO_PHRASES); every other page
 * sets "proof, not probability." alone.
 */
export function ProofField({ hero = false }: { hero?: boolean }) {
  const field = hero ? HERO_FIELD : DEFAULT_FIELD;
  return (
    <div className="proof-field" aria-hidden="true">
      {field.map(({ segments, indent }, row) => (
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
