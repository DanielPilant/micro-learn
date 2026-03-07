import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing } from "../constants/theme";
import type { EvaluationResult } from "../types";

// ── Score interpretation helpers ─────────────────────────────

const AMBER = "#F59E0B";

function getScoreColor(score: number): string {
  if (score >= 90) return Colors.success; // green
  if (score >= 70) return Colors.primary; // blue
  if (score >= 40) return AMBER;          // amber
  return Colors.error;                    // red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 40) return "Developing";
  return "Needs Work";
}

// ── Component ────────────────────────────────────────────────

export default function EvaluationCard({ score, feedback }: EvaluationResult) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <View style={styles.card}>
      {/* ── Score row ── */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View
          style={[styles.labelBadge, { backgroundColor: color + "22" }]}
        >
          <Text style={[styles.labelText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${score}%`, backgroundColor: color },
          ]}
        />
      </View>

      <View style={styles.divider} />

      {/* ── Written feedback ── */}
      <Text style={styles.feedbackLabel}>Feedback</Text>
      <Text style={styles.feedbackText}>{feedback}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  scoreBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 56,
  },
  scoreOutOf: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  labelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  barTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  feedbackLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  feedbackText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
  },
});
