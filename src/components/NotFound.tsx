// Default 404 page. Shown for any path the router doesn't recognize.
// Centered white text on the near-black page background.
export function NotFound() {
  return (
    <main className="notfound">
      <h1 className="notfound-text">404</h1>
      <a className="notfound-home" href="/">
        Back to home
      </a>
    </main>
  );
}
