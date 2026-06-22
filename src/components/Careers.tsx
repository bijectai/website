import { useEffect, useState } from "react";
import { ApplyForm } from "./ApplyForm";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

// Careers page. Pulls open roles live from the Google Sheet via the deployed
// Apps Script web app (doGet returns the sheet rows as an array of objects
// keyed by the header row). For now this just renders whatever comes back so
// we can confirm the feed is wired up correctly — the ID column is fetched but
// never shown.
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz1uKNhQaTYRqcAUWDl6V8odKB5Vn_T58OU93PPr5mgMnH5pXfz3VlSUHzJDA4BT6tP/exec";

// One row of the Roles sheet. Every column comes through as a string except
// where the sheet holds a number; the Apps Script formats dates to YYYY-MM-DD.
interface Job {
  ID?: string | number;
  date_open?: string;
  title?: string;
  abstract?: string;
  description?: string;
  requirements?: string;
  compensation?: string;
  location?: string;
  work_type?: string;
  field?: string;
}

// Split a free-text cell into a list. The sheet may separate items with
// newlines, " | ", or "; " — mirror whichever the author used. A cell with no
// separators comes back as a single-item list.
function toList(value?: string): string[] {
  if (!value) return [];
  return String(value)
    .split(/\r?\n|\s*\|\s*|\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: Job[] };

export function Careers() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // The role title the applicant clicked "Apply" on; null when the modal is
  // closed. Shown for context only — the backend doesn't store the role.
  const [applyRole, setApplyRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(APPS_SCRIPT_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // doGet returns the rows as an array; on a server-side failure it
        // returns { error: "..." } instead.
        if (data && data.error) throw new Error(String(data.error));
        if (!Array.isArray(data)) throw new Error("Unexpected response shape");
        if (!cancelled) setState({ status: "ready", jobs: data });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Drops the sticky bar a --bar-gap inset from the top so its pill lines
          up with the logo + CTA corners that float fixed at that same inset. */}
      <div className="topbar-gap" aria-hidden="true" />
      <TopBar />

      <main className="careers">
        <div className="careers-inner">
          <h1 className="careers-title">Open Roles</h1>
          <p className="careers-lede">
            Join us in building formally verified AI compliance infrastructure.
          </p>

          {state.status === "loading" && (
            <p className="careers-status">Loading open roles…</p>
          )}

          {state.status === "error" && (
            <p className="careers-status careers-status-error">
              Couldn't load roles: {state.message}
            </p>
          )}

          {state.status === "ready" && state.jobs.length === 0 && (
            <p className="careers-status">
              No open roles at the moment — check back soon.
            </p>
          )}

          {state.status === "ready" && state.jobs.length > 0 && (
            <div className="careers-list">
              {state.jobs.map((job, i) => (
                <JobCard
                  key={job.ID ?? i}
                  job={job}
                  onApply={() => setApplyRole(job.title || "Open role")}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {applyRole !== null && (
        <ApplyForm role={applyRole} onClose={() => setApplyRole(null)} />
      )}
    </>
  );
}

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) {
  const meta = [job.field, job.location, job.work_type].filter(Boolean);
  const requirements = toList(job.requirements);

  return (
    <article className="job-card">
      <header className="job-head">
        <h2 className="job-title">{job.title}</h2>
        {job.date_open && (
          <span className="job-date">Opened {job.date_open}</span>
        )}
      </header>

      {meta.length > 0 && (
        <ul className="job-meta">
          {meta.map((m, i) => (
            <li key={i} className="job-meta-item">
              {m}
            </li>
          ))}
        </ul>
      )}

      {job.abstract && <p className="job-abstract">{job.abstract}</p>}

      {job.description && (
        <Field label="Description">
          <p className="job-text">{job.description}</p>
        </Field>
      )}

      {requirements.length > 0 && (
        <Field label="Requirements">
          {requirements.length === 1 ? (
            <p className="job-text">{requirements[0]}</p>
          ) : (
            <ul className="job-reqs">
              {requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </Field>
      )}

      {job.compensation && (
        <Field label="Compensation">
          <p className="job-text">{job.compensation}</p>
        </Field>
      )}

      <div className="job-foot">
        <button type="button" className="job-apply" onClick={onApply}>
          Apply
        </button>
      </div>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="job-field">
      <h3 className="job-field-label">{label}</h3>
      {children}
    </div>
  );
}
