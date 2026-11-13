// Footer: a single bar carrying the beta note on the left and links +
// copyright on the right.

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-bar">
        <div className="footer-copy">Private beta with a small group of teams.</div>

        <div className="footer-links">
          <a href="https://arxiv.org/abs/2604.01483" target="_blank" rel="noopener noreferrer">
            Read the paper
          </a>
          <a href="/about">About</a>
          <a href="/careers">Careers</a>
          <a href="mailto:dev@bijectai.com">dev@bijectai.com</a>
          <span className="footer-tag">© 2026 Biject. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
