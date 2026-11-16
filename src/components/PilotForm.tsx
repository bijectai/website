import { useState } from "react";

// The /atlas page's pilot request. Inline, not a modal: it is the page's
// last section and its one ask. Posts to api/pilot.ts, which mails it to
// dev@bijectai.com.
//
// The spec asks for four fields (name, organization, framework, system type).
// A work email is the one addition: without it there is no way to answer.

export const FRAMEWORKS = [
  "NIST SP 800-53",
  "NIST SP 800-171 / CMMC",
  "NIST AI RMF",
  "Other",
] as const;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; message: string };

export function PilotForm() {
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submit.status === "submitting") return;

    const data = new FormData(e.currentTarget);
    const payload = Object.fromEntries(
      ["name", "email", "organization", "framework", "system", "website"].map((k) => [
        k,
        String(data.get(k) ?? ""),
      ]),
    );

    setSubmit({ status: "submitting" });
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Couldn't send your request.");
      setSubmit({ status: "done" });
    } catch (err) {
      setSubmit({
        status: "error",
        message:
          (err instanceof Error && err.message) ||
          "Couldn't send your request.",
      });
    }
  }

  if (submit.status === "done") {
    return (
      <div className="pilot-form pilot-done" role="status">
        <p className="pilot-done-title">Thanks. We'll be in touch to scope it.</p>
        <p className="pilot-done-text">
          Expect a reply from <a href="mailto:dev@bijectai.com">dev@bijectai.com</a>.
        </p>
      </div>
    );
  }

  const busy = submit.status === "submitting";

  return (
    <form className="pilot-form" onSubmit={handleSubmit}>
      <div className="apply-row">
        <label className="apply-field">
          <span>Name</span>
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
        <label className="apply-field">
          <span>Work email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
      </div>

      <label className="apply-field">
        <span>Organization</span>
        <input name="organization" autoComplete="organization" required maxLength={200} />
      </label>

      <div className="apply-row">
        <label className="apply-field">
          <span>Framework you answer to</span>
          <select name="framework" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {FRAMEWORKS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="apply-field">
          <span>Type of system</span>
          <input
            name="system"
            required
            maxLength={200}
            placeholder="e.g. HR web app, on-prem"
          />
        </label>
      </div>

      {/* Honeypot: off-screen, so only a bot fills it in. */}
      <input
        className="pilot-hp"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {submit.status === "error" && (
        <p className="apply-error" role="alert">
          {submit.message} You can also write to{" "}
          <a href="mailto:dev@bijectai.com">dev@bijectai.com</a>.
        </p>
      )}

      <div className="pilot-actions">
        <button type="submit" className="apply-submit" disabled={busy}>
          {busy ? "Sending…" : "Scope a pilot"}
        </button>
      </div>
    </form>
  );
}
