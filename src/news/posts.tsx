import type { ComponentType } from "react";

// Post bodies, keyed by the slug of their entry in src/news.ts. A post with
// an entry there but no body here renders the 404 page.
//
// To add one: write src/news/<slug>.tsx with a default-exported component,
// then import it and add it below, e.g.
//
//   import WhyKernels from "./why-kernels";
//   export const POSTS = { "why-kernels": WhyKernels };
export const POSTS: Record<string, ComponentType> = {};
