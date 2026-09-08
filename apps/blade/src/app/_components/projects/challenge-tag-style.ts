/** Choose the higher-contrast foreground for a validated six-digit tag color. */
export function challengeTagStyle(color: string | null | undefined) {
  if (!color) return undefined;
  const luminance = [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
    const channel =
      Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    const linear =
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + weight * linear;
  }, 0);
  // Black and white contrast ratios cross here; either choice stays above 4.5:1.
  return {
    backgroundColor: color,
    borderColor: color,
    color: luminance > Math.sqrt(0.0525) - 0.05 ? "black" : "white",
  };
}
