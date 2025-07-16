import Image from "next/image";

interface MLHBadgeProps {
  showFloating: boolean;
}

function MLHBadge({ showFloating }: MLHBadgeProps) {
  return (
    <div
      className={`fixed top-0 right-4 z-[9998] transition-all duration-300 ease-in-out ${
        showFloating
          ? "-translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
      style={{ maxWidth: "100px", minWidth: "60px", width: "10vw" }}
    >
      <a
        id="mlh-trust-badge"
        className="block rounded-sm transition-all duration-200 focus:outline-4 focus:outline-offset-2 focus:outline-[#d83434]"
        href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Major League Hacking 2026 Hackathon Season - Opens in new tab"
      >
        <Image
          src="https://s3.amazonaws.com/logged-assets/trust-badge/2026/mlh-trust-badge-2026-white.svg"
          alt="Major League Hacking 2026 Hackathon Season"
          width={100}
          height={100}
          className="w-full"
        />
      </a>
    </div>
  );
}

export default MLHBadge;
