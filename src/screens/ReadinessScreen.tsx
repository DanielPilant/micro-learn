import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type DimensionValue,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useReadiness } from "../hooks/useReadiness";
import { Colors, Spacing } from "../constants/theme";
import { scoreColor, formatCategory } from "../utils/formatting";
import type { ReadinessScreenProps } from "../navigation/types";
import type { CategoryReadiness } from "../hooks/useReadiness";

function CategoryCard({
  item,
  t,
}: {
  item: CategoryReadiness;
  t: (key: any, vars?: Record<string, string | number>) => string;
}) {
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
            { width: `${item.avgScore}%` as DimensionValue, backgroundColor: color },
          ]}
        />
      </View>

      <Text style={styles.cardMeta}>
        {t("progress.basedOn", {
          count: item.answerCount,
          s: item.answerCount !== 1 ? "s" : "",
        })}
      </Text>
    </View>
  );
}

export default function ReadinessScreen(_: ReadinessScreenProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
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
            <Text style={styles.signOutText}>{t("learn.signOut")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenTitle}>{t("progress.title")}</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryText}>{t("learn.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Streak card ── */}
            <View style={styles.streakCard}>
              <View style={styles.streakLeft}>
                <Ionicons name="flame" size={36} color={Colors.amber} />
                <View style={styles.streakTextGroup}>
                  <Text style={styles.streakCount}>
                    {profile?.current_streak ?? 0}
                  </Text>
                  <Text style={styles.streakLabel}>
                    {t("progress.dayStreak")}
                  </Text>
                </View>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakRight}>
                <Text style={styles.longestCount}>
                  {profile?.longest_streak ?? 0}
                </Text>
                <Text style={styles.longestLabel}>{t("progress.longest")}</Text>
              </View>
            </View>

            {/* ── Category readiness ── */}
            <Text style={styles.sectionTitle}>
              {t("progress.readinessByCategory")}
            </Text>

            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="bar-chart-outline"
                  size={40}
                  color={Colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>{t("progress.noData")}</Text>
                <Text style={styles.emptyBody}>{t("progress.noDataBody")}</Text>
              </View>
            ) : (
              categories.map((item) => (
                <CategoryCard key={item.category} item={item} t={t} />
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
