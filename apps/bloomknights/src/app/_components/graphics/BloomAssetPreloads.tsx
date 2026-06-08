export default function BloomAssetPreloads() {
  return (
    <>
      <link
        key="bloom-background-mobile"
        rel="preload"
        href="https://assets.knighthacks.org/bloom-background-mobile.avif"
        as="image"
        type="image/avif"
        media="(max-width: 767px)"
      />
      <link
        key="bloom-background-desktop"
        rel="preload"
        href="https://assets.knighthacks.org/bloom-background-desktop.avif"
        as="image"
        type="image/avif"
        media="(min-width: 768px)"
      />
    </>
  );
}
