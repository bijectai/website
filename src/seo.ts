// Single source of truth for the site's search and social metadata.
//
// Two consumers read this: App.tsx applies it to the live document on every
// navigation, and the `seo` plugin in vite.config.ts bakes it into a static
// HTML file per route (plus robots.txt and sitemap.xml) at build time. Routing
// both paths through one config is what keeps the crawler-visible tags from
// drifting away from what the app actually renders.

/**
 * Canonical origin, no trailing slash. Both bijectai.com and www.bijectai.com
 * point at the Vercel project; this is the one search engines should treat as
 * the real address, and every absolute URL on the site derives from it.
 */
export const SITE_URL = "https://www.bijectai.com";

export const SITE_NAME = "biject";

/** 1200x630 social card. Regenerate from scripts/og-image.html — see its header. */
export const OG_IMAGE = `${SITE_URL}/og.png`;

export const CONTACT_EMAIL = "team@bijectai.com";

export type PageSeo = {
  /** The page's name exactly as the site's own navigation writes it. */
  name: string;
  /** ~155 characters: longer and search engines truncate it mid-sentence. */
  description: string;
};

/** Every route the app serves, keyed by normalized pathname. Drives the sitemap. */
export const PAGES: Record<string, PageSeo> = {
  "/": {
    name: "home",
    description:
      "Formally verified guardrails for AI agents. biject hand-formalizes your policies in Lean and compiles them into decision kernels proven correct.",
  },
  "/about": {
    name: "About us",
    description:
      "biject is an R&P lab built on one primitive: if you can't prove it, you can't trust it. We build guardrails that return machine-checked proofs.",
  },
  "/careers": {
    name: "Careers",
    description:
      "Open roles at biject. Help us formalize the world's rules in Lean and compile them into decision kernels that are mathematically proven correct.",
  },
};

const NOT_FOUND: PageSeo = {
  name: "page not found",
  description: "That page doesn't exist. Head back to the biject home page.",
};

/** Normalize a pathname to a PAGES key: "/about/" and "/about" both give "/about". */
export function routeKey(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export type PageMeta = {
  title: string;
  description: string;
  url: string;
  /** False for the 404 route, which is marked noindex rather than ranked. */
  indexable: boolean;
};

export function seoFor(pathname: string): PageMeta {
  const key = routeKey(pathname);
  // Not every pathname is a route — anything unrecognized renders the 404 page.
  const page: PageSeo | undefined = PAGES[key];
  return {
    title: `${SITE_NAME} | ${(page ?? NOT_FOUND).name}`,
    description: (page ?? NOT_FOUND).description,
    url: SITE_URL + key,
    indexable: page !== undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Build-time rendering
 * ------------------------------------------------------------------ */

/** Delimits the generated block in index.html so the build can swap it per route. */
export const SEO_START = "<!--seo-->";
export const SEO_END = "<!--/seo-->";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/**
 * The route's SEO block as an HTML string, markers included.
 *
 * Build-time only — the running app mutates the live tags instead of
 * re-rendering them.
 */
export function renderHeadTags(pathname: string): string {
  const { title, description, url, indexable } = seoFor(pathname);

  // Same on every page, so it rides along here rather than being hardcoded in
  // index.html, which would put the domain in a second place.
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: CONTACT_EMAIL,
    description: PAGES["/"].description,
  };

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${indexable ? "index, follow" : "noindex, follow"}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    ``,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    ``,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    ``,
    `<script type="application/ld+json">${JSON.stringify(organization)}</script>`,
  ];

  return [SEO_START, ...tags.map((t) => (t ? `  ${t}` : t)), SEO_END].join("\n  ");
}

/** The sitemap listing every indexable route. */
export function renderSitemap(): string {
  const urls = Object.keys(PAGES)
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

/* ------------------------------------------------------------------ *
 * Runtime (browser)
 * ------------------------------------------------------------------ */

/** Find a head tag, creating it if the served HTML didn't already carry one. */
function headTag(selector: string, create: () => HTMLElement): Element {
  let el: Element | null = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(key: "name" | "property", value: string, content: string): void {
  headTag(`meta[${key}="${value}"]`, () => {
    const el = document.createElement("meta");
    el.setAttribute(key, value);
    return el;
  }).setAttribute("content", content);
}

/**
 * Point the document's title and crawler-facing tags at `pathname`.
 *
 * The build bakes the same values into the HTML served for each route, so this
 * is what keeps the tab title right and what crawlers that execute JavaScript
 * end up reading — it is not what link-preview scrapers see.
 */
export function applySeo(pathname: string): void {
  const { title, description, url, indexable } = seoFor(pathname);

  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "robots", indexable ? "index, follow" : "noindex, follow");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);

  headTag('link[rel="canonical"]', () => {
    const el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    return el;
  }).setAttribute("href", url);
}
