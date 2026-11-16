// Pilot request endpoint.
//
// The /atlas page's "Start with one system" form POSTs here; this mails the
// request to the team through Resend, with the sender set as reply-to so it
// can be answered straight from the notification. Same provider and key as
// api/waitlist.ts.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY  required. An API key from resend.com
//   PILOT_FROM      optional. Overrides the From address (falls back to
//                   PARTNER_FROM). Whatever is used must sit on a domain
//                   verified in Resend, or Resend rejects the send.
//
// A missing key fails loudly in the logs and returns a 500 rather than
// silently dropping a lead.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const TO = "dev@bijectai.com";
const DEFAULT_FROM = "biject website <dev@bijectai.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Per-IP send limit, kept in this instance's memory (see api/waitlist.ts). */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const recent = new Map<string, number[]>();

export function rateLimited(ip: string, now = Date.now()): boolean {
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) {
    for (const [key, times] of recent) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) recent.delete(key);
    }
  }
  return false;
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/** Caps so an abusive payload can't turn into a multi-megabyte email. */
const MAX = {
  name: 120,
  email: 254,
  organization: 200,
  framework: 60,
  system: 200,
} as const;

export type PilotRequest = {
  name: string;
  email: string;
  organization: string;
  framework: string;
  system: string;
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

/** Validate a submitted body. Every field is required, as in the form. */
export function parseRequest(raw: unknown): { request: PilotRequest } | { error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const request: PilotRequest = {
    name: field(body.name, MAX.name),
    email: field(body.email, MAX.email),
    organization: field(body.organization, MAX.organization),
    framework: field(body.framework, MAX.framework),
    system: field(body.system, MAX.system),
  };

  if (!request.name) return { error: "Your name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    return { error: "A valid email address is required." };
  }
  if (!request.organization) return { error: "Your organization is required." };
  if (!request.framework) return { error: "Choose the framework you answer to." };
  if (!request.system) return { error: "Tell us the type of system." };

  return { request };
}

const ROWS: [keyof PilotRequest, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["organization", "Organization"],
  ["framework", "Framework"],
  ["system", "System"],
];

export function subjectFor(request: PilotRequest): string {
  return `Atlas pilot request: ${request.organization} (${request.framework})`;
}

export function textBody(request: PilotRequest): string {
  return ["Atlas pilot request from /atlas", "", ...ROWS.map(([k, l]) => `${l}: ${request[k]}`)].join(
    "\n",
  );
}

export function htmlBody(request: PilotRequest): string {
  const email = escapeHtml(request.email);
  const row = ([key, label]: [keyof PilotRequest, string]) => {
    const value =
      key === "email" ? `<a href="mailto:${email}">${email}</a>` : escapeHtml(request[key]);
    return (
      `<tr><td style="padding:4px 16px 4px 0;color:#666;">${label}</td>` +
      `<td style="padding:4px 0;">${value}</td></tr>`
    );
  };
  return [
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;">`,
    `<p style="margin:0 0 12px;color:#666;">Atlas pilot request from /atlas</p>`,
    `<table style="border-collapse:collapse;">`,
    ...ROWS.map(row),
    `</table></div>`,
  ].join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Malformed request body." });
    }
  }

  // Honeypot: the form renders `website` off-screen, so only a bot fills it.
  if (field((body as Record<string, unknown> | null)?.website, 200)) {
    return res.status(200).json({ success: true });
  }

  const parsed = parseRequest(body);
  if ("error" in parsed) {
    return res.status(400).json({ error: parsed.error });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: "Too many requests. Try again in a few minutes." });
  }
  const { request } = parsed;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; dropping pilot request", {
      email: request.email,
    });
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
        from: process.env.PILOT_FROM || process.env.PARTNER_FROM || DEFAULT_FROM,
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
    console.error("Resend rejected the message", response.status, await response.text());
    return res.status(502).json({ error: "Couldn't send your request." });
  }

  return res.status(200).json({ success: true });
}
