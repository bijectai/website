import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import {
  PAGES,
  SEO_END,
  SEO_START,
  renderHeadTags,
  renderRobotsTxt,
  renderSitemap,
} from "./src/seo";

const SEO_BLOCK = new RegExp(`${SEO_START}[\\s\\S]*?${SEO_END}`);

/**
 * Bakes per-route SEO into the build.
 *
 * The site is a client-rendered SPA, so the tags App.tsx sets at runtime are
 * invisible to the scrapers behind link previews (Slack, LinkedIn, X, iMessage)
 * — they read the served HTML and never execute JavaScript. This emits a real
 * HTML file per route, each carrying its own title, description, canonical and
 * Open Graph tags, so a shared link previews as the page it actually points at.
 *
 * Vercel serves dist/about/index.html for /about before the SPA catch-all
 * rewrite in vercel.json applies, and every route loads the same bundle, so
 * client-side behaviour is unchanged. robots.txt and sitemap.xml are written
 * from the same config, which keeps the domain in exactly one place.
 */
function seo(): Plugin {
  let outDir = "dist";
  let isBuild = false;

  return {
    name: "seo",

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      isBuild = config.command === "build";
    },

    // Fills the marker in index.html. Runs in dev too, so the dev server shows
    // the same titles and tags the deployed site does.
    transformIndexHtml(html) {
      return html.replace(SEO_BLOCK, () => renderHeadTags("/"));
    },

    closeBundle() {
      // Vite also fires this when the dev server shuts down, where there is no
      // dist/ to read.
      if (!isBuild) return;

      const index = readFileSync(join(outDir, "index.html"), "utf8");

      for (const path of Object.keys(PAGES)) {
        if (path === "/") continue;
        const file = join(outDir, path.slice(1), "index.html");
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, index.replace(SEO_BLOCK, () => renderHeadTags(path)));
      }

      writeFileSync(join(outDir, "robots.txt"), renderRobotsTxt());
      writeFileSync(join(outDir, "sitemap.xml"), renderSitemap());
    },
  };
}

export default defineConfig({
  plugins: [react(), seo()],
});
