// Partner inquiry endpoint.
//
// The "Partner with us" drawer POSTs here; this mails the inquiry to the
// partnerships inbox through Resend, with the sender set as reply-to so the
// team can answer straight from the notification.
//
// Environment (Vercel project settings):
//   RESEND_API_KEY  required — an API key from resend.com
//   PARTNER_FROM    optional — overrides the From address. Whatever is used
//                   must sit on a domain verified in Resend, or Resend
//                   rejects the send.
//
// A missing key fails loudly in the logs and returns a 500 rather than
// silently dropping a lead.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const TO = "team@bijectai.com";
const DEFAULT_FROM = "biject website <partnerships@bijectai.com>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Caps so an abusive payload can't turn into a multi-megabyte email. */
const MAX = {
  name: 120,
  company: 200,
  email: 254,
  phone: 40,
  comment: 5000,
} as const;

export type Inquiry = {
  name: string;
  email: string;
  company: string;
  phone: string;
  comment: string;
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

/**
 * Validate a submitted body into an Inquiry.
 *
 * Mirrors the fields the drawer marks `required`, so a submission that passes
 * the browser's own validation passes here too.
 */
export function parseInquiry(
  raw: unknown,
): { inquiry: Inquiry } | { error: string } {
  const body = (raw ?? {}) as Record<string, unknown>;

  const first = field(body.first_name, MAX.name);
  const last = field(body.last_name, MAX.name);
  const email = field(body.email, MAX.email);

  if (!first || !last) {
    return { error: "First and last name are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid email address is required." };
  }

  return {
    inquiry: {
      name: `${first} ${last}`,
      email,
      company: field(body.company, MAX.company),
      phone: field(body.phone, MAX.phone),
      comment: field(body.comment, MAX.comment),
    },
  };
}

export function subjectFor(inquiry: Inquiry): string {
  const who = inquiry.company ? `${inquiry.name} (${inquiry.company})` : inquiry.name;
  return `Partnership inquiry — ${who}`;
}

export function textBody(inquiry: Inquiry): string {
  return [
    `Name:    ${inquiry.name}`,
    `Email:   ${inquiry.email}`,
    `Company: ${inquiry.company || "—"}`,
    `Phone:   ${inquiry.phone || "—"}`,
    "",
    inquiry.comment || "(no comment)",
  ].join("\n");
}

export function htmlBody(inquiry: Inquiry): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666;">${label}</td>` +
    `<td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`;

  return [
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#111;">`,
    `<table style="border-collapse:collapse;margin-bottom:16px;">`,
    row("Name", inquiry.name),
    `<tr><td style="padding:4px 16px 4px 0;color:#666;">Email</td>`,
    `<td style="padding:4px 0;"><a href="mailto:${escapeHtml(inquiry.email)}">`,
    `${escapeHtml(inquiry.email)}</a></td></tr>`,
    row("Company", inquiry.company || "—"),
    row("Phone", inquiry.phone || "—"),
    `</table>`,
    `<div style="white-space:pre-wrap;">`,
    escapeHtml(inquiry.comment) || "<em style='color:#666;'>(no comment)</em>",
    `</div></div>`,
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

  // Honeypot: the drawer renders `website` off-screen, so only a bot fills it.
  // Answer as though it worked, so the bot has nothing to learn and retry.
  if (field((body as Record<string, unknown> | null)?.website, 200)) {
    return res.status(200).json({ success: true });
  }

  const parsed = parseInquiry(body);
  if ("error" in parsed) {
    return res.status(400).json({ error: parsed.error });
  }
  const { inquiry } = parsed;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; dropping partner inquiry", {
      email: inquiry.email,
    });
    // Generic for the visitor — the distinct reason is in the log above.
    return res.status(500).json({ error: "Couldn't send your message." });
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
        from: process.env.PARTNER_FROM || DEFAULT_FROM,
        to: [TO],
        reply_to: inquiry.email,
        subject: subjectFor(inquiry),
        text: textBody(inquiry),
        html: htmlBody(inquiry),
      }),
    });
  } catch (err) {
    console.error("Could not reach Resend", err);
    return res.status(502).json({ error: "Couldn't send your message." });
  }

  if (!response.ok) {
    // Log the provider's reason, but don't leak it to the browser.
    console.error("Resend rejected the message", response.status, await response.text());
    return res.status(502).json({ error: "Couldn't send your message." });
  }

  return res.status(200).json({ success: true });
}
