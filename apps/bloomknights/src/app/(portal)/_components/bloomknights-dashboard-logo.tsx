import Image from "next/image";

export function BloomKnightsDashboardLogo() {
  return (
    <div
      aria-label="BloomKnights"
      className="bk-dashboard-logo-shell mx-auto mb-8 flex w-fit justify-center px-4 sm:mb-10"
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
        sizes="(min-width: 1024px) 420px, (min-width: 640px) 340px, 260px"
        className="bk-dashboard-logo h-auto w-[260px] sm:w-[340px] lg:w-[420px]"
      />
    </div>
  );
}
