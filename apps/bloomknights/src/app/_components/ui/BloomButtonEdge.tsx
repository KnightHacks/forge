const buttonBloomPositions = [
  "left",
  "top-left",
  "top-center",
  "top-right",
  "right",
  "bottom-right",
  "bottom-center",
  "bottom-left",
] as const;

export default function BloomButtonEdge() {
  return (
    <div className="bloom-cta-blooms" aria-hidden="true">
      {buttonBloomPositions.map((position) => (
        <span
          key={position}
          className={`bloom-cta-flower bloom-cta-flower-${position}`}
        />
      ))}
    </div>
  );
}
