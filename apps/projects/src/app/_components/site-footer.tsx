import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner container">
        <p>Projects is a Knight Hacks community archive.</p>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/archive">Browse the archive</Link>
          <a href="https://knighthacks.org">Knight Hacks</a>
          <a href="https://github.com/KnightHacks">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
