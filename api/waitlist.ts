// Early-access waitlist endpoint.
//
// The homepage's early-access form POSTs here; this mails the request to the
// team through Resend, with the requester set as reply-to so it can be
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
const DEFAULT_FROM = "biject website <partnerships@bijectai.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Caps so an abusive payload can't turn into a multi-megabyte email. */
const MAX = {
  email: 254,
  answer: 500,
  block: 3000,
} as const;

export type WaitlistRequest = {
  email: string;
  agent: string;
  runtime: string;
  block: string;
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
      email,
      agent: field(body.agent, MAX.answer),
      runtime: field(body.runtime, MAX.answer),
      block: field(body.block, MAX.block),
    },
  };
}

const QUESTIONS: [keyof WaitlistRequest, string][] = [
  ["agent", "What agent are you building?"],
  ["runtime", "What framework or runtime does it use?"],
  ["block", "What would you want to block?"],
];

export function subjectFor(request: WaitlistRequest): string {
  return `Early access request: ${request.email}`;
}

export function textBody(request: WaitlistRequest): string {
  return [
    `Email: ${request.email}`,
    ...QUESTIONS.flatMap(([key, question]) => ["", question, request[key] || "(blank)"]),
  ].join("\n");
}

export function htmlBody(request: WaitlistRequest): string {
  const email = escapeHtml(request.email);
  return [
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;">`,
    `<p>Email: <a href="mailto:${email}">${email}</a></p>`,
    ...QUESTIONS.map(
      ([key, question]) =>
        `<p style="margin:16px 0 4px;color:#666;">${question}</p>` +
        `<div style="white-space:pre-wrap;">${
          escapeHtml(request[key]) || "<em style='color:#666;'>(blank)</em>"
        }</div>`,
    ),
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
