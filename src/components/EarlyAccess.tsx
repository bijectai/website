import { useState } from "react";

// The waitlist. POSTs to api/waitlist.ts, which emails the request to the
// team. Copy and the book-a-call link on the left, the form on the right.
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
      email: String(data.get("email") || ""),
      agent: String(data.get("agent") || ""),
      runtime: String(data.get("runtime") || ""),
      block: String(data.get("block") || ""),
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
    <section className="access" id="early-access" aria-labelledby="access-title">
      <div className="wrap access-grid">
        <div className="access-copy">
          <h2 className="h2" id="access-title">
            Request early access.
          </h2>
          <p className="body">
            The SDK is in private beta. We’re piloting with a small group of
            teams and adding a few at a time. Tell us what your agent does and
            what it should never do.
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
              <span>Work email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>

            <label className="field">
              <span>What agent are you building?</span>
              <input
                name="agent"
                type="text"
                placeholder="A coding agent that opens PRs on our monorepo"
              />
            </label>

            <label className="field">
              <span>What framework or runtime does it use?</span>
              <input
                name="runtime"
                type="text"
                placeholder="LangGraph, OpenAI Agents SDK, our own loop"
              />
            </label>

            <label className="field">
              <span>What would you want to block?</span>
              <textarea
                name="block"
                rows={3}
                placeholder="Writes to tests/, shell commands outside the repo"
              />
            </label>

            {submit.status === "error" && (
              // Always leave a way through: a request shouldn't be lost
              // because the endpoint is down.
              <p className="form-error" role="alert">
                {submit.message} Email us at{" "}
                <a href="mailto:team@bijectai.com">team@bijectai.com</a>{" "}
                instead.
              </p>
            )}

            <button
              type="submit"
              className="nav-cta form-submit"
              disabled={submit.status === "submitting"}
            >
              {submit.status === "submitting" ? "Sending…" : "Request early access"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// The page's last line before the footer. Points back to the form.
export function Closing() {
  return (
    <section className="closing" aria-label="Closing">
      <div className="wrap">
        <div className="closing-inner">
          <p className="closing-text">Put a proof between your agent and its tools.</p>
          <a className="closing-link" href="#early-access">
            Request early access
          </a>
        </div>
      </div>
    </section>
  );
}
