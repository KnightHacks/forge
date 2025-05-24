import React from 'react';

interface MLHBadgeProps {
  showFloating: boolean;
}

function MLHBadge({ showFloating }: MLHBadgeProps) {
  return (
    <div
      className={`fixed right-4 top-0 z-[10000] transition-all duration-300 ease-in-out ${
        showFloating ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
      style={{ maxWidth: '100px', minWidth: '60px', width: '10vw' }}
    >
      <a
        id="mlh-trust-badge"
        className="block"
        href="https://mlh.io/na?utm_source=na-hackathon&utm_medium=TrustBadge&utm_campaign=2026-season&utm_content=white"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://s3.amazonaws.com/logged-assets/trust-badge/2026/mlh-trust-badge-2026-white.svg"
          alt="Major League Hacking 2026 Hackathon Season"
          className="w-full"
        />
      </a>
    </div>
  );
}

export default MLHBadge; 