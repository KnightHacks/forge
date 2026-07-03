import Image from "next/image";

export function BloomKnightsDashboardLogo() {
  return (
    <div
      aria-label="BloomKnights"
      className="bk-dashboard-logo-shell mx-auto mb-5 flex w-fit justify-center px-4 sm:mb-6"
      role="img"
    >
      <Image
        src="/BloomKnights.svg"
        alt=""
        width={650}
        height={325}
        priority
        unoptimized
        draggable="false"
        sizes="(min-width: 640px) 260px, 210px"
        className="bk-dashboard-logo h-auto w-[210px] sm:w-[260px]"
      />
    </div>
  );
}
