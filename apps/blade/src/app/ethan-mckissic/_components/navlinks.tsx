import Link from "next/link";

export type LinkItem = {
  label: string;
  href: string;          // internal ("/about") or external ("https://...")
  newTab?: boolean;      // force target=_blank (defaults true for externals)
};

type Props = {
  items: LinkItem[];
  align?: "left" | "right";
  ariaLabel?: string;
};

const base =
  "text-4xl mb-6 tracking-wide transition hover:opacity-80 hover:-translate-y-0.5 " +
  "focus:outline-none focus:ring-2 focus:ring-white/40 rounded italic text-shadow-lg";

function isExternal(href: string) {
  return href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
}

export default function VerticalLinks({ items, align = "left", ariaLabel = "links" }: Props) {
  return (
    <nav aria-label={ariaLabel} className={`flex flex-col gap-6 ${align === "right" ? "text-right" : ""}`}>
      {items.map(({ label, href, newTab }) => {
        const external = isExternal(href);
        const targetBlank = newTab ?? external;

        return external ? (
          <a
            key={label}
            href={href}
            className={base}
            target={targetBlank ? "_blank" : undefined}
            rel={targetBlank ? "noreferrer" : undefined}
          >
            {label}
          </a>
        ) : (
          <Link key={label} href={href} className={base}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
