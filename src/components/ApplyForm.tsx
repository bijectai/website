import { useEffect, useRef, useState } from "react";

// Application form modal. Collects the applicant's details + résumé and POSTs
// them to the second Apps Script (doPost), which saves the résumé to Drive and
// appends a row to the applications sheet, returning a unique application key.
const APPLY_URL =
  "https://script.google.com/macros/s/AKfycbzItfOJ2LzfpmPKGO823d8aQ75iLn7j35QxUXsK0_feZAAcsg_MHhJwxNX3pXR9bXUFbg/exec";

// Résumés are sent base64-encoded inline, which inflates size ~33%; cap the
// raw file so the request stays well within Apps Script's POST limits.
const MAX_RESUME_BYTES = 8 * 1024 * 1024; // 8 MB

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; key: string }
  | { status: "error"; message: string };

// Read a File as a bare base64 string (without the "data:...;base64," prefix),
// matching the resume_base64 the Apps Script expects.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function ApplyForm({
  role,
  onClose,
}: {
  role: string;
  onClose: () => void;
}) {
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus the first field on open, close on Escape, and lock background scroll.
  useEffect(() => {
    firstFieldRef.current?.focus();
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
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submit.status === "submitting") return;

    const data = new FormData(e.currentTarget);
    const file = data.get("resume") as File | null;

    if (file && file.size > MAX_RESUME_BYTES) {
      setSubmit({ status: "error", message: "Résumé must be under 8 MB." });
      return;
    }

    setSubmit({ status: "submitting" });

    try {
      const payload: Record<string, string> = {
        first_name: String(data.get("first_name") || ""),
        last_name: String(data.get("last_name") || ""),
        email: String(data.get("email") || ""),
        phone: String(data.get("phone") || ""),
        comment: String(data.get("comment") || ""),
      };

      if (file && file.size > 0) {
        payload.resume_base64 = await fileToBase64(file);
        payload.resume_mime_type = file.type || "application/octet-stream";
      }

      // No Content-Type header: a string body defaults to text/plain, a
      // "simple" request that skips the CORS preflight Apps Script can't
      // answer. doPost reads the raw body and JSON.parses it regardless.
      const res = await fetch(APPLY_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result && result.success) {
        setSubmit({
          status: "success",
          key: String(result.application_key || ""),
        });
      } else {
        throw new Error(result?.error || "Submission failed");
      }
    } catch (err) {
      setSubmit({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="apply-overlay" onClick={onClose}>
      <div
        className="apply-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="apply-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        {submit.status === "success" ? (
          <div className="apply-done">
            <h2 className="apply-title" id="apply-title">
              Application received
            </h2>
            <p className="apply-done-text">
              Thanks for applying — we've got your details and will be in touch.
            </p>
            {submit.key && (
              <p className="apply-key">
                Reference: <span>{submit.key}</span>
              </p>
            )}
            <button type="button" className="apply-submit" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="apply-form" onSubmit={handleSubmit}>
            <h2 className="apply-title" id="apply-title">
              Apply
            </h2>
            <p className="apply-role">{role}</p>

            <div className="apply-row">
              <label className="apply-field">
                <span>First name</span>
                <input
                  ref={firstFieldRef}
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="apply-field">
                <span>Last name</span>
                <input
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

            <div className="apply-row">
              <label className="apply-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="apply-field">
                <span>Phone</span>
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
            </div>

            <label className="apply-field">
              <span>Comment</span>
              <textarea
                name="comment"
                rows={4}
                placeholder="Anything you'd like us to know"
              />
            </label>

            <label className="apply-field">
              <span>Résumé (PDF)</span>
              <input
                name="resume"
                type="file"
                accept=".pdf,application/pdf"
                required
              />
            </label>

            {submit.status === "error" && (
              <p className="apply-error">Couldn't submit: {submit.message}</p>
            )}

            <div className="apply-actions">
              <button
                type="button"
                className="apply-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="apply-submit"
                disabled={submit.status === "submitting"}
              >
                {submit.status === "submitting"
                  ? "Submitting…"
                  : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
