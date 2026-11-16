# biject website

## Rules for every page

- **Every page renders the ASCII background (`<ProofField />`)** unless the
  person asking for the page says otherwise. It goes first in the page's
  fragment, before the top bar, as in `src/components/About.tsx`:

  ```tsx
  <>
    <ProofField />
    <div className="topbar-gap" aria-hidden="true" />
    <TopBar />
    <main className="...">…</main>
    <Footer />
  </>
  ```

  The homepage uses `<ProofField hero />`. Page content sits above it with
  `position: relative; z-index: 1` on the page's `<main>`.
