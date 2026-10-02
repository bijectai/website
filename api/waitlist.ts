// Inquiry endpoint.
//
// The homepage's "Partner with us" form POSTs here; this mails the inquiry to
// the team through Resend, with the sender set as reply-to so it can be
// answered straight from the notification. Same provider and key as
// api/partner.ts.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY  required. An API key from resend.com
//   WAITLIST_FROM   optional. Overrides the From address (falls back to
//                   PARTNER_FROM). Whatever is used must sit on a domain
//                   verified in Resend, or Resend rejects the send.
//
// A missing key fails loudly in the logs and returns a 500 rather than
// silently dropping a request.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const TO = "dev@bijectai.com";
const DEFAULT_FROM = "biject website <dev@bijectai.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Per-IP send limit: RATE_LIMIT requests per RATE_WINDOW_MS.
 *
 * Kept in this instance's memory, so it stops one client hammering a warm
 * function, not a distributed flood (that needs a shared store such as
 * Vercel KV). A real visitor submits once.
 */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const recent = new Map<string, number[]>();

/** True when `ip` has used its sends for the window; records the attempt otherwise. */
export function rateLimited(ip: string, now = Date.now()): boolean {
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  // Bound the map: drop clients whose window has passed.
  if (recent.size > 5000) {
    for (const [key, times] of recent) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) recent.delete(key);
    }
  }
  return false;
}

/** The caller's address as Vercel reports it. */
function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/** Caps so an abusive payload can't turn into a multi-megabyte email. */
const MAX = {
  name: 120,
  email: 254,
  company: 160,
  project: 3000,
} as const;

export type WaitlistRequest = {
  name: string;
  email: string;
  company: string;
  project: string;
};

const field = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Validate a submitted body. Only the email is required, as in the form. */
export function parseRequest(
  raw: unknown,
): { request: WaitlistRequest } | { error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const email = field(body.email, MAX.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid email address is required." };
  }

  return {
    request: {
      name: field(body.name, MAX.name),
      email,
      company: field(body.company, MAX.company),
      project: field(body.project, MAX.project),
    },
  };
}

/** The short identity fields, listed as one block at the top of the email. */
const DETAILS: [keyof WaitlistRequest, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["company", "Company"],
];

/** The one long-form answer, set below the details under its own heading. */
const PROJECT_LABEL = "Tell us about your project";

const BLANK_TEXT = "(blank)";
const BLANK_HTML = "<em style='color:#666;'>(blank)</em>";

export function subjectFor(request: WaitlistRequest): string {
  // Name first when it's there, since it's what the reply will open with;
  // the email always identifies the sender if both the others are blank.
  const who = request.name || request.email;
  return request.company ? `New inquiry: ${who}, ${request.company}` : `New inquiry: ${who}`;
}

export function textBody(request: WaitlistRequest): string {
  return [
    ...DETAILS.map(([key, label]) => `${label}: ${request[key] || BLANK_TEXT}`),
    "",
    PROJECT_LABEL,
    request.project || BLANK_TEXT,
  ].join("\n");
}

export function htmlBody(request: WaitlistRequest): string {
  const email = escapeHtml(request.email);
  return [
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;">`,
    `<p>Name: ${escapeHtml(request.name) || BLANK_HTML}</p>`,
    `<p>Email: <a href="mailto:${email}">${email}</a></p>`,
    `<p>Company: ${escapeHtml(request.company) || BLANK_HTML}</p>`,
    `<p style="margin:16px 0 4px;color:#666;">${PROJECT_LABEL}</p>`,
    `<div style="white-space:pre-wrap;">${escapeHtml(request.project) || BLANK_HTML}</div>`,
    `</div>`,
  ].join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vercel parses JSON bodies, but fall back in case the content type is off.
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Malformed request body." });
    }
  }

  // Honeypot: the form renders `website` off-screen, so only a bot fills it.
  // Answer as though it worked, so the bot has nothing to learn and retry.
  if (field((body as Record<string, unknown> | null)?.website, 200)) {
    return res.status(200).json({ success: true });
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  // Checked after validation, so malformed requests don't spend the quota.
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: "Too many requests. Try again in a few minutes." });
  }
  const { request } = parsed;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; dropping waitlist request", {
      email: request.email,
    });
    // Generic for the visitor; the distinct reason is in the log above.
    return res.status(500).json({ error: "Couldn't send your request." });
  }

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.WAITLIST_FROM || process.env.PARTNER_FROM || DEFAULT_FROM,
        to: [TO],
        reply_to: request.email,
        subject: subjectFor(request),
        text: textBody(request),
        html: htmlBody(request),
      }),
    });
  } catch (err) {
    console.error("Could not reach Resend", err);
    return res.status(502).json({ error: "Couldn't send your request." });
  }

  if (!response.ok) {
    // Log the provider's reason, but don't leak it to the browser.
    console.error("Resend rejected the message", response.status, await response.text());
    return res.status(502).json({ error: "Couldn't send your request." });
  }

  return res.status(200).json({ success: true });
}
