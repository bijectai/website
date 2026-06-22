// Default 404 page. Shown for any path that isn't the site root.
// Centered white text on the near-black page background, with the wet floor
// sign (public/404.svg) above it.
export function NotFound() {
  return (
    <main className="notfound">
      <p className="notfound-text">404</p>
    </main>
  );
}
