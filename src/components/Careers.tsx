import { useEffect, useRef, useState } from "react";
import { ApplyForm } from "./ApplyForm";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

// Careers page. Pulls open roles live from the Google Sheet via the deployed
// Apps Script web app (doGet returns the sheet rows as an array of objects
// keyed by the header row). The Apps Script round-trip is slow, so we (1) seed
// from a sessionStorage cache for instant repeat visits and revalidate in the
// background, and (2) render the cards lazily in pages as the reader scrolls
// rather than painting the whole list at once.
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz1uKNhQaTYRqcAUWDl6V8odKB5Vn_T58OU93PPr5mgMnH5pXfz3VlSUHzJDA4BT6tP/exec";

// Roles cached from the last successful fetch, so navigating back to /careers
// shows results immediately while a fresh copy loads in the background.
const CACHE_KEY = "biject:careers:jobs";

// How many cards to mount initially and reveal per scroll step.
const PAGE_SIZE = 6;

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

// Render a sheet cell that may be a full datetime as a plain calendar date.
// We strip any time component first (TZ-safe), then prettify a YYYY-MM-DD
// value to e.g. "Jun 23, 2026"; anything we can't parse is shown verbatim.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function formatDate(value?: string): string {
  if (!value) return "";
  const datePart = String(value).trim().split(/[T ]/)[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return datePart;
  const [, y, mo, d] = m;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}, ${y}`;
}

function readCache(): Job[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; jobs: Job[] };

export function Careers() {
  // Seed from cache when available so the list paints instantly; otherwise
  // start in the loading state and show skeletons.
  const [state, setState] = useState<LoadState>(() => {
    const cached = readCache();
    return cached ? { status: "ready", jobs: cached } : { status: "loading" };
  });
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
        if (cancelled) return;
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // Cache is best-effort; ignore quota / privacy-mode failures.
        }
        setState({ status: "ready", jobs: data });
      } catch (err) {
        // Keep showing cached results if we already have some; only surface
        // the error when there was nothing to fall back to.
        if (cancelled) return;
        setState((prev) =>
          prev.status === "ready"
            ? prev
            : {
                status: "error",
                message: err instanceof Error ? err.message : String(err),
              },
        );
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

          {state.status === "loading" && <JobSkeletons />}

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
            <JobList
              jobs={state.jobs}
              onApply={(title) => setApplyRole(title)}
            />
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

// Lazily reveals the role cards a page at a time. A sentinel below the list
// bumps the visible count whenever it scrolls into view, so a long sheet never
// mounts hundreds of cards up front.
function JobList({
  jobs,
  onApply,
}: {
  jobs: Job[];
  onApply: (title: string) => void;
}) {
  const [visible, setVisible] = useState(() => Math.min(PAGE_SIZE, jobs.length));
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset the window if the underlying list changes (e.g. background refresh).
  useEffect(() => {
    setVisible(Math.min(PAGE_SIZE, jobs.length));
  }, [jobs]);

  useEffect(() => {
    if (visible >= jobs.length) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + PAGE_SIZE, jobs.length));
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, jobs.length]);

  return (
    <div className="careers-list">
      {jobs.slice(0, visible).map((job, i) => (
        <JobCard
          key={job.ID ?? i}
          job={job}
          onApply={() => onApply(job.title || "Open role")}
        />
      ))}
      {visible < jobs.length && (
        <div ref={sentinelRef} className="careers-sentinel" aria-hidden="true">
          <span className="careers-status">Loading more roles…</span>
        </div>
      )}
    </div>
  );
}

// Placeholder cards shown while the (slow) initial fetch is in flight.
function JobSkeletons() {
  return (
    <div className="careers-list" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <article key={i} className="job-card job-skeleton">
          <div className="skel skel-title" />
          <div className="skel-meta">
            <div className="skel skel-pill" />
            <div className="skel skel-pill" />
            <div className="skel skel-pill" />
          </div>
          <div className="skel skel-line" />
          <div className="skel skel-line skel-line-short" />
        </article>
      ))}
    </div>
  );
}

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) {
  // Collapsed by default: the card shows just the title, its three meta pills
  // and the abstract. Everything else lives behind the "Details" toggle.
  const [open, setOpen] = useState(false);
  const meta = [job.field, job.location, job.work_type].filter(Boolean);
  const requirements = toList(job.requirements);
  const opened = formatDate(job.date_open);
  const hasDetails =
    Boolean(job.description) ||
    requirements.length > 0 ||
    Boolean(job.compensation) ||
    Boolean(opened);

  return (
    <article className="job-card">
      <header className="job-head">
        <h2 className="job-title">{job.title}</h2>
        {hasDetails && (
          <button
            type="button"
            className="job-details-btn"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "Details"}
          </button>
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

      {open && hasDetails && (
        <div className="job-details">
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

          {opened && (
            <Field label="Opened">
              <p className="job-text">{opened}</p>
            </Field>
          )}
        </div>
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
