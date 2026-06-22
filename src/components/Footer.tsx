// Footer: an oversized, very faint "biject" wordmark with a bottom bar
// carrying the copyright on the left and links + kernel tag on the right.

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-wordmark" aria-hidden="true">biject</div>

      <div className="footer-bar">
        <div className="footer-copy">2026 biject</div>

        <div className="footer-links">
          <a href="mailto:contact@bijectai.com">contact@bijectai.com</a>
          <span className="footer-tag"></span>
        </div>
      </div>
    </footer>
  );
}
