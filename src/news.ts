// Everything listed on /news: published research and the team's posts.
//
// Metadata only, no JSX. The `seo` build plugin reads this file (through
// src/seo.ts) to bake a title, description and link preview into a static
// page for every post, and that runs in Node, outside the app.
//
// To publish a post:
//   1. Write the body as a component in src/news/<slug>.tsx. Plain JSX
//      (<p>, <h2>, <ul>, <a>, <blockquote>, <Code>) is styled by .post-body.
//   2. Register it in POSTS in src/news/posts.tsx under the same slug.
//   3. Add an entry below with kind "post". It's live at /news/<slug>.
//
// Research and anything else hosted elsewhere gets an `href` instead of a
// body: it's listed here and links out.

export type NewsKind = "paper" | "post";

export type NewsItem = {
  /** URL segment for a post (/news/<slug>); a stable key for everything else. */
  slug: string;
  kind: NewsKind;
  title: string;
  /** YYYY-MM-DD, or YYYY-MM when only the month is known. */
  date: string;
  /** One or two sentences. Also the post's search and link-preview description. */
  summary: string;
  /** External home for the item. Set for papers; leave unset for posts. */
  href?: string;
};

export const NEWS: NewsItem[] = [
  {
    slug: "type-checked-compliance",
    kind: "paper",
    title: "Type-Checked Compliance",
    // From the arXiv identifier: 2604 is April 2026.
    date: "2026-04",
    summary: "Preprint on arXiv, 2604.01483.",
    href: "https://arxiv.org/abs/2604.01483",
  },
];

export const KIND_LABEL: Record<NewsKind, string> = {
  paper: "Paper",
  post: "Post",
};

/** Newest first. ISO dates sort as strings. */
export function sortedNews(): NewsItem[] {
  return [...NEWS].sort((a, b) => b.date.localeCompare(a.date));
}

export function findPost(slug: string): NewsItem | undefined {
  return NEWS.find((item) => item.kind === "post" && item.slug === slug);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-04" → "Apr 2026"; "2026-04-14" → "Apr 14, 2026". */
export function formatNewsDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const month = MONTHS[m - 1];
  return d ? `${month} ${d}, ${y}` : `${month} ${y}`;
}
