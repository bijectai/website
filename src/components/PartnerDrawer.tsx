import { useEffect, useRef, useState } from "react";

// Right-hand "Partner with us" drawer, opened by the top-bar CTA. Offers a
// direct "Schedule a meeting" link, then an inquiry form that POSTs to the
// partnerships Apps Script (which appends a row to the partner sheet).
const PARTNER_URL =
  "https://script.google.com/macros/s/AKfycbzsFWlutWxvcKMKZgFjraVUW9v9e25oWre4fXKLaUHWNu_nM9mAEP3rgexcV42-_VPp/exec";

const CALENDAR_URL = "https://calendar.app.google/9K6okKLashw17RZw9";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function PartnerDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  // Close on Escape and lock background scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Reset to a fresh, empty form each time the drawer is reopened.
  useEffect(() => {
    if (open) {
      setSubmit({ status: "idle" });
      formRef.current?.reset();
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submit.status === "submitting") return;

    const data = new FormData(e.currentTarget);
    setSubmit({ status: "submitting" });

    try {
      const payload = {
        first_name: String(data.get("first_name") || ""),
        last_name: String(data.get("last_name") || ""),
        company: String(data.get("company") || ""),
        email: String(data.get("email") || ""),
        phone: String(data.get("phone") || ""),
        comment: String(data.get("comment") || ""),
      };

      // No Content-Type header: the string body defaults to text/plain, a
      // "simple" request that skips the CORS preflight Apps Script can't answer.
      const res = await fetch(PARTNER_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await res.json();
      } catch {
        // Some deployments return no/again non-JSON body; a resolved request
        // with no explicit error is treated as success below.
      }

      if (result && (result.error || result.success === false)) {
        throw new Error(result.error || "Submission failed");
      }
      setSubmit({ status: "success" });
    } catch (err) {
      setSubmit({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <>
      <div
        className={"partner-overlay" + (open ? " is-open" : "")}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={"partner-drawer" + (open ? " is-open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Partner with us"
        aria-hidden={!open}
      >
        <button
          type="button"
          className="partner-close"
          aria-label="Close"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
        >
          ×
        </button>

        <h2 className="partner-title">Partner with us</h2>
        <p className="partner-sub">
          Book time with our team, or leave your details and we'll reach out.
        </p>

        <a
          className="partner-schedule"
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={open ? 0 : -1}
        >
          Schedule a meeting
        </a>

        <div className="partner-divider">
          <span>or</span>
        </div>

        {submit.status === "success" ? (
          <div className="partner-done">
            <p className="partner-done-text">
              Thanks — we've received your details and will be in touch shortly.
            </p>
            <button
              type="button"
              className="partner-submit"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form className="partner-form" ref={formRef} onSubmit={handleSubmit}>
            <div className="partner-row">
              <label className="partner-field">
                <span>First name</span>
                <input
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  tabIndex={open ? 0 : -1}
                />
              </label>
              <label className="partner-field">
                <span>Last name</span>
                <input
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  required
                  tabIndex={open ? 0 : -1}
                />
              </label>
            </div>

            <label className="partner-field">
              <span>Company</span>
              <input
                name="company"
                type="text"
                autoComplete="organization"
                tabIndex={open ? 0 : -1}
              />
            </label>

            <label className="partner-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                tabIndex={open ? 0 : -1}
              />
            </label>

            <label className="partner-field">
              <span>Phone</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                tabIndex={open ? 0 : -1}
              />
            </label>

            <label className="partner-field">
              <span>Comment</span>
              <textarea
                name="comment"
                rows={4}
                placeholder="What would you like to explore together?"
                tabIndex={open ? 0 : -1}
              />
            </label>

            {submit.status === "error" && (
              <p className="partner-error">Couldn't submit: {submit.message}</p>
            )}

            <button
              type="submit"
              className="partner-submit"
              disabled={submit.status === "submitting"}
              tabIndex={open ? 0 : -1}
            >
              {submit.status === "submitting" ? "Submitting…" : "Send inquiry"}
            </button>
          </form>
        )}
      </aside>
    </>
  );
}
