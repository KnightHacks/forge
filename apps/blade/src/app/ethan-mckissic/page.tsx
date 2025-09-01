import VerticalLinks, { type LinkItem } from "./_components/navlinks";
import CenterIcon from "./_components/centericon";

export default function Portal() {
  const left: LinkItem[] = [
    { label: "about", href: "/about" },
    { label: "experience", href: "/experience" },
    { label: "projects", href: "/projects" },
  ];

  const right: LinkItem[] = [
    { label: "resume", href: "/McKissic_Ethan_Resume_Web.pdf" },
    { label: "github", href: "https://github.com/lain561" },
    { label: "linkedin", href: "https://www.linkedin.com/in/ethan-mckissic-1682362a8/" },
  ];

  return (
    <main className="fixed inset-0 overflow-hidden">
      {/* Background layer */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-lg"
        style={{ backgroundImage: "url('/blue.jpg')" }}
      />

      {/* Optional: a subtle dark overlay so text/icons pop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Foreground content */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   grid grid-cols-[1fr_275px_1fr] items-center gap-20 md:gap-48 sm:gap-8 z-10"
      >
        <VerticalLinks items={left} ariaLabel="primary" />
        <CenterIcon src="/blue_jvne.jpg" size={275} />
        <VerticalLinks items={right} align="right" ariaLabel="external" />
      </div>
    </main>
  );
}
