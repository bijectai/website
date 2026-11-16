import { ProofField } from "./ProofField";

// Default 404 page. Shown for any path the router doesn't recognize.
// Centered white text over the site's background type.
export function NotFound() {
  return (
    <>
      <ProofField />
      <main className="notfound">
        <h1 className="notfound-text">404</h1>
        <a className="notfound-home" href="/">
          Back to home
        </a>
      </main>
    </>
  );
}
