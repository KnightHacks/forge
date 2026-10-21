import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

export default function NotFoundPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="not-found container" id="main-content">
        <p className="eyebrow">That page is missing</p>
        <h1 className="display-serif">No project at this address.</h1>
        <p className="page-lede">
          The case study may have moved, or the link may be incomplete.
        </p>
        <Link className="button-secondary" href="/archive">
          <ArrowLeft aria-hidden="true" size={15} /> Browse the archive
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
