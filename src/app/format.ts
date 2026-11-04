/** "+2" / "−1" / "0" using a true minus sign, matching the pixel text style. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `−${Math.abs(delta)}`;
  return "0";
}
