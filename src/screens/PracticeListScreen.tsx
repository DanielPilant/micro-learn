import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { Colors, Spacing } from "../constants/theme";
import type { Question } from "../types";
import type { PracticeListScreenProps } from "../navigation/types";

// ── Difficulty pill colours ───────────────────────────────────
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: Colors.success,
  medium: "#F59E0B",
  hard: Colors.error,
};

// ── Category accent colours (one per domain) ─────────────────
const CATEGORY_COLOR: Record<string, string> = {
  system_design: "#818CF8", // indigo
  algorithms: "#34D399", // green
  dsa_theory: "#34D399",
  databases: "#F59E0B", // amber
  networking: "#38BDF8", // sky
  operating_systems: "#FB923C", // orange
  devops: "#A78BFA", // violet
  fullstack_api: "#F472B6", // pink
};
const CATEGORY_FALLBACK = Colors.primary;

function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat] ?? CATEGORY_FALLBACK;
}

// ── Component ─────────────────────────────────────────────────
export default function PracticeListScreen({
  navigation,
}: PracticeListScreenProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ── Fetch unanswered questions (also runs on tab focus) ─────
  const loadQuestions = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setListError(null);

    // Fetch the user's preferred language first, then scope the inbox to it
    const { data: profileData } = await supabase
      .from("profiles")
      .select("content_language")
      .eq("id", user.id)
      .single();

    const userLang = profileData?.content_language ?? "en";

    const { data, error } = await supabase.rpc("get_unanswered_questions", {
      p_user_id: user.id,
      p_language: userLang,
    });

    if (error) {
      setListError(error.message);
    } else {
      setQuestions((data as Question[]) ?? []);
    }
    setListLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions]),
  );

  // ── Generate 5 new questions ─────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);

    const { error } = await supabase.functions.invoke(
      "generate-practice-questions",
    );

    if (error) {
      setGenError(t("practice.genFailed"));
    }

    setGenerating(false);
    await loadQuestions();
  }, [loadQuestions]);

  // ── List card ─────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => {
      const catColor = categoryColor(item.category);
      const diffColor =
        DIFFICULTY_COLOR[item.difficulty] ?? Colors.textSecondary;

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate("PracticeDetail", { question: item })
          }
        >
          {/* left accent bar */}
          <View style={[styles.cardAccent, { backgroundColor: catColor }]} />

          <View style={styles.cardBody}>
            {/* header row */}
            <View style={styles.cardHeader}>
              <Text style={[styles.categoryLabel, { color: catColor }]}>
                {item.category.replace(/_/g, " ").toUpperCase()}
              </Text>
              <View
                style={[styles.diffPill, { backgroundColor: diffColor + "22" }]}
              >
                <Text style={[styles.diffText, { color: diffColor }]}>
                  {item.difficulty}
                </Text>
              </View>
            </View>

            {/* question snippet — capped at 2 lines */}
            <Text style={styles.snippet} numberOfLines={2}>
              {item.question}
            </Text>

            {/* footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.indexLabel}>#{index + 1}</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={Colors.textSecondary}
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation],
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("practice.inbox")}</Text>
          {!listLoading && (
            <Text style={styles.subtitle}>
              {questions.length === 0
                ? t("practice.allCaughtUp")
                : t("practice.questionsWaiting", {
                    count: questions.length,
                    s: questions.length !== 1 ? "s" : "",
                  })}
            </Text>
          )}
        </View>
      </View>

      {/* ── Generate button ── */}
      <TouchableOpacity
        style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
        activeOpacity={0.8}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.generateBtnText}>{t("practice.generating")}</Text>
          </>
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={16} color="#fff" />
            <Text style={styles.generateBtnText}>{t("practice.generate")}</Text>
          </>
        )}
      </TouchableOpacity>

      {genError && <Text style={styles.inlineError}>{genError}</Text>}

      {/* ── Body ── */}
      {listLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : listError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{listError}</Text>
          <TouchableOpacity onPress={loadQuestions}>
            <Text style={styles.retryText}>{t("practice.tapRetry")}</Text>
          </TouchableOpacity>
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={52}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyHeading}>{t("practice.emptyHeading")}</Text>
          <Text style={styles.emptySubtext}>
            {t("practice.emptySubtext")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: 13,
    borderRadius: 10,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  inlineError: {
    color: Colors.error,
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  // ── Card ──
  card: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    flexShrink: 1,
    marginEnd: Spacing.sm,
  },
  diffPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  snippet: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "auto",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  indexLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  // ── States ──
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyHeading: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.xs,
    lineHeight: 21,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});
