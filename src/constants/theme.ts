/** Minimal colour / spacing tokens – expand later */
export const Colors = {
  background: "#0F0F1A",
  surface: "#1A1A2E",
  primary: "#4F8EF7",
  textPrimary: "#EAEAEA",
  textSecondary: "#A0A0B0",
  border: "#2A2A3E",
  success: "#34D399",
  error: "#F87171",
  amber: "#F59E0B",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// ── Shared colour maps (used by Practice + Readiness screens) ────

export const DifficultyColor: Record<string, string> = {
  easy: Colors.success,
  medium: Colors.amber,
  hard: Colors.error,
};

export const CategoryColor: Record<string, string> = {
  system_design: "#818CF8",
  algorithms: "#34D399",
  dsa_theory: "#34D399",
  databases: Colors.amber,
  networking: "#38BDF8",
  operating_systems: "#FB923C",
  devops: "#A78BFA",
  fullstack_api: "#F472B6",
};

export const CATEGORY_FALLBACK_COLOR = Colors.primary;
