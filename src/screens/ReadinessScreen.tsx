import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useReadiness } from "../hooks/useReadiness";
import { Colors, Spacing } from "../constants/theme";
import type { ReadinessScreenProps } from "../navigation/types";
import type { CategoryReadiness } from "../hooks/useReadiness";

// Colours for the score progress bar.
function scoreColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 60) return Colors.primary;
  if (score >= 40) return "#F59E0B";
  return Colors.error;
}

// "system_design" → "System Design"
function formatCategory(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CategoryCard({ item }: { item: CategoryReadiness }) {
  const color = scoreColor(item.avgScore);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{formatCategory(item.category)}</Text>
        <Text style={[styles.cardScore, { color }]}>{item.avgScore}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${item.avgScore}%` as any, backgroundColor: color },
          ]}
        />
      </View>

      <Text style={styles.cardMeta}>
        Based on {item.answerCount} answer{item.answerCount !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

export default function ReadinessScreen(_: ReadinessScreenProps) {
  const { signOut } = useAuth();
  const { profile, categories, loading, error, refresh } = useReadiness();

  // Re-fetch every time the user switches to this tab so data stays current.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>micro-learn</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenTitle}>Progress</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Streak card ── */}
            <View style={styles.streakCard}>
              <View style={styles.streakLeft}>
                <Ionicons name="flame" size={36} color="#F59E0B" />
                <View style={styles.streakTextGroup}>
                  <Text style={styles.streakCount}>
                    {profile?.current_streak ?? 0}
                  </Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </View>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakRight}>
                <Text style={styles.longestCount}>
                  {profile?.longest_streak ?? 0}
                </Text>
                <Text style={styles.longestLabel}>longest</Text>
              </View>
            </View>

            {/* ── Category readiness ── */}
            <Text style={styles.sectionTitle}>Readiness by Category</Text>

            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="bar-chart-outline"
                  size={40}
                  color={Colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No data yet</Text>
                <Text style={styles.emptyBody}>
                  Submit and evaluate answers on the Daily tab to see your
                  readiness scores here.
                </Text>
              </View>
            ) : (
              categories.map((item) => (
                <CategoryCard key={item.category} item={item} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  appName: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  signOutText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: Spacing.lg,
  },
  // ── Streak card ──
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  streakLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  streakTextGroup: {
    gap: 2,
  },
  streakCount: {
    color: Colors.textPrimary,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 40,
  },
  streakLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  streakDivider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  streakRight: {
    alignItems: "center",
    gap: 2,
  },
  longestCount: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  longestLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  // ── Section label ──
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: Spacing.md,
  },
  // ── Category card ──
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  cardScore: {
    fontSize: 22,
    fontWeight: "800",
  },
  barTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  // ── Loading / error ──
  centered: {
    alignItems: "center",
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
