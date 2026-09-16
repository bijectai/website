# Institution logos

The "Brought to you by minds from" row on `/about` (`src/components/About.tsx`)
looks for a logo file per institution:

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

- **Positive shapes on a transparent background.** The row forces every logo to
  a single ink with `filter: grayscale(1) brightness(0) invert(1)`, so color
  carries no meaning here — only which pixels are covered. Two shapes that read
  fine in color collapse under it:
  - a logo knocked out of a colored field (the field floods solid and the
    artwork inside disappears);
  - artwork cut as a *hole* in a filled block, which inverts into a dark shape
    on a light slab while the rest of the row is light-on-dark.

  `nyu.svg` arrived in the second form — a square with the torch punched out of
  it — and was reduced to the torch alone. Reach for the institution's
  one-color/reversed variant, and if only the boxed lockup exists, delete the
  field subpath so the mark fills as a positive shape.
- **SVG, trimmed to the artwork** with no built-in padding. The row sizes each
  logo from its `viewBox`, not from where the ink actually stops, so empty space
  inside the box turns into a gap in the row. `iit-madras.svg` arrived with 45%
  of its width empty and left a visible hole next to Chicago; `nyu.svg` kept 10%
  of empty width on its *left* after the square field came off, which indented
  it from the other marks in the stacked phone list. Both were fixed by pulling
  the `viewBox` in to the ink rather than by editing paths.
- **Outlines, not live `<text>`.** These files load through an `<img>`, which is
  an isolated document: it cannot reach the Google Fonts link in `index.html`,
  so a `font-family` of "Space Grotesk" silently falls back to whatever the
  viewer's default sans happens to be — Helvetica, Arial, something else. Any
  lettering has to be converted to paths, or it will not be the typeface you
  designed with and will shift between platforms.
- Check each institution's trademark guidelines before publishing.

## Sizing

Below 721px the marks stack and are centred on a shared axis, and there `scale`
does not apply: each logo is capped to one `max-width` at a fixed height and
`object-fit: contain` shrinks it to fit, which evens out the column without
per-logo tuning. Cap with `max-width` rather than `width` — a `width` leaves the
`<li>` sized to the logo's full intrinsic width while the `<img>` inside is
clipped to the cap, and centring the item then parks the wide marks off-axis. Everywhere above that, the row
scales each logo to a shared base height, then multiplies it by a
per-institution `scale` in the `ORIGINS` list in `About.tsx`. Marks fill their
box by very different amounts — a one-line wordmark is nearly all cap height, a
stacked wordmark splits it over two lines, and a circular seal spends most of
its box on the ring — so a shared height alone makes the wide wordmarks shout
and the seal vanish. When a logo is swapped, eyeball it against its neighbours
and adjust that one number; `1` is the base height.

The raster originals these were traced from are kept out of the build, in
`logos/` at the repo root, alongside the editable source of any lockup that was
assembled here rather than supplied by the institution.
