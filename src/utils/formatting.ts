import { Colors } from "../constants/theme";

/** "system_design" -> "System Design" */
export function formatCategory(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Score -> colour mapping (unified 80/60/40 thresholds). */
export function scoreColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 60) return Colors.primary;
  if (score >= 40) return Colors.amber;
  return Colors.error;
}
