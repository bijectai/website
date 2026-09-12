# Institution logos

The "Brought to you by minds from" row on `/about` (`src/components/About.tsx`)
looks for a logo file per institution. Drop them here as:

| File            | Institution                              |
| --------------- | ---------------------------------------- |
| `cornell.svg`   | Cornell University                       |
| `iit-madras.svg`| Indian Institute of Technology Madras    |
| `uchicago.svg`  | University of Chicago                    |
| `nyu.svg`       | New York University                      |
| `osu.svg`       | Ohio State University                    |

Each file appears automatically on the next build — no code change needed. Any
file that is missing falls back to the institution's name set in type, so the
row is never half-empty and files can land one at a time.

Guidance for the assets themselves:

- **Solid shapes on a transparent background.** The row forces every logo to a
  single ink with `filter: grayscale(1) brightness(0) invert(1)`, so a logo that
  relies on white knocked out of a colored field collapses into a solid block.
  Use the one-color/reversed variant from the institution's brand kit.
- **SVG, trimmed to the artwork** with no built-in padding — the row handles
  spacing and scales each file to ~22-30px tall.
- Check each institution's trademark guidelines before publishing.
