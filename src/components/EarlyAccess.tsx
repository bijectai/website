import { useState } from "react";

// The page's last section: the inquiry form. POSTs to api/waitlist.ts, which
// emails it to the team. Copy and the book-a-call link on the left, the form
// on the right. Old links to #early-access are redirected here by App.
const WAITLIST_URL = "/api/waitlist";

const CALL_URL = "https://calendar.app.google/rTHDeEVQ63XULVzD8";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

export function EarlyAccess() {
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submit.status === "submitting") return;

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      company: String(data.get("company") || ""),
      project: String(data.get("project") || ""),
      website: String(data.get("website") || ""),
    };
    setSubmit({ status: "submitting" });

    try {
      const res = await fetch(WAITLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: { error?: string } | null = await res.json().catch(() => null);
      // A non-2xx is a failure even when the body doesn't say so.
      if (!res.ok) {
        throw new Error(result?.error || `Request failed (${res.status}).`);
      }
      setSubmit({ status: "success", email: payload.email });
    } catch (err) {
      setSubmit({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <section className="access" id="access" aria-labelledby="access-title">
      <div className="wrap access-grid">
        <div className="access-copy">
          <h2 className="h2" id="access-title">
            Partner with us.
          </h2>
          <p className="body">
            We formalize your rules in Lean 4 and put the kernel in front of
            every tool call. The more you tell us about your project, the
            sooner we can put the right engineers on it.
          </p>
          <p className="access-call">
            Rather talk it through first?{" "}
            <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
              Book a call
            </a>
          </p>
        </div>

        {submit.status === "success" ? (
          <div className="access-done" role="status">
            <p className="access-done-title">Request received.</p>
            <p className="body">
              We’ll reply to {submit.email}. If it’s urgent,{" "}
              <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
                book a call
              </a>
              .
            </p>
          </div>
        ) : (
          <form className="access-form" onSubmit={handleSubmit}>
            {/* Honeypot: parked off-screen, so only a bot fills it in. A
                non-empty value makes the API drop the submission. */}
            <input
              className="honeypot"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <label className="field">
              <span>Name</span>
              <input name="name" type="text" autoComplete="name" />
            </label>

            <label className="field">
              <span>Work email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>

            <label className="field">
              <span>Company</span>
              <input name="company" type="text" autoComplete="organization" />
            </label>

            <label className="field">
              <span>Tell us about your project</span>
              <textarea
                name="project"
                rows={4}
                placeholder="What you’re building, what it can act on, and what it should never do"
              />
            </label>

            {submit.status === "error" && (
              // Always leave a way through: a request shouldn't be lost
              // because the endpoint is down.
              <p className="form-error" role="alert">
                {submit.message} Email us at{" "}
                <a href="mailto:dev@bijectai.com">dev@bijectai.com</a>{" "}
                instead.
              </p>
            )}

            <button
              type="submit"
              className="nav-cta form-submit"
              disabled={submit.status === "submitting"}
            >
              {submit.status === "submitting" ? "Sending…" : "Start the conversation"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
