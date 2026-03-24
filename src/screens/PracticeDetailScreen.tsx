import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  I18nManager,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  Colors,
  Spacing,
  DifficultyColor,
  CategoryColor,
  CATEGORY_FALLBACK_COLOR,
} from "../constants/theme";
import { formatCategory } from "../utils/formatting";
import EvaluationCard from "../components/EvaluationCard";
import type { EvaluationResult } from "../types";
import type { PracticeDetailScreenProps } from "../navigation/types";

export default function PracticeDetailScreen({
  route,
  navigation,
}: PracticeDetailScreenProps) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { question } = route.params;

  const catColor = CategoryColor[question.category] ?? CATEGORY_FALLBACK_COLOR;
  const diffColor =
    DifficultyColor[question.difficulty] ?? Colors.textSecondary;

  // ── Streak ─────────────────────────────────────────────────
  const [streak, setStreak] = useState<number | null>(null);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("current_streak")
      .eq("id", user.id)
      .single();
    if (data) setStreak(data.current_streak);
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  // ── Teach Me state ─────────────────────────────────────────
  const [isTeaching, setIsTeaching] = useState(false);
  const [teachMeExplanation, setTeachMeExplanation] = useState<string | null>(
    null,
  );
  const [teachError, setTeachError] = useState<string | null>(null);

  const handleTeachMe = async () => {
    setIsTeaching(true);
    setTeachError(null);
    const { data, error } = await supabase.functions.invoke<{
      explanation: string;
    }>("teach-me", {
      body: { question_text: question.question, language: lang },
    });
    setIsTeaching(false);
    if (error || !data?.explanation) {
      setTeachError(t("detail.teachFailed"));
    } else {
      setTeachMeExplanation(data.explanation);
    }
  };

  // ── Submission state machine ───────────────────────────────
  // Phase 1 – submitting:  INSERT into user_answers
  // Phase 2 – evaluating:  Edge Function → Gemini
  // Phase 3 – submitted:   result ready (or graceful failure)
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // ── Submit handler ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!answer.trim()) {
      Alert.alert(t("detail.emptyAnswer"), t("detail.writeFirst"));
      return;
    }
    if (!user) return;

    // ── Phase 1: persist the raw answer ─────────────────────
    setSubmitting(true);
    const { data: savedAnswer, error: insertError } = await supabase
      .from("user_answers")
      .insert({
        user_id: user.id,
        question_id: question.id,
        answer_text: answer.trim(),
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (insertError || !savedAnswer) {
      Alert.alert(
        t("detail.saveFailed"),
        insertError?.message ?? t("detail.couldNotSave"),
      );
      return;
    }

    // DB trigger updates the streak synchronously inside the INSERT
    // transaction, so fetching right after gives the updated value.
    fetchStreak();

    // ── Phase 2: invoke the evaluation Edge Function ─────────
    setEvaluating(true);
    const { data: evalData, error: fnError } =
      await supabase.functions.invoke<EvaluationResult>("evaluate-answer", {
        body: { answer_id: savedAnswer.id },
      });
    setEvaluating(false);

    if (fnError || !evalData) {
      // Graceful failure — answer is saved, score stays null
      setEvalError(t("detail.evalUnavailable"));
    } else {
      setEvaluationResult(evalData);
    }

    // ── Phase 3: mark submitted regardless of eval outcome ───
    setSubmitted(true);
  };

  const inputLocked = submitting || evaluating || submitted;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={I18nManager.isRTL ? "arrow-forward" : "arrow-back"}
              size={20}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>{t("detail.practice")}</Text>

          {streak !== null && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={13} color={Colors.amber} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </View>

        {/* ── Category + difficulty badges ── */}
        <View style={styles.badgeRow}>
          <View
            style={[styles.categoryBadge, { backgroundColor: catColor + "22" }]}
          >
            <Text style={[styles.categoryText, { color: catColor }]}>
              {formatCategory(question.category).toUpperCase()}
            </Text>
          </View>
          <View
            style={[styles.diffBadge, { backgroundColor: diffColor + "22" }]}
          >
            <Text style={[styles.diffText, { color: diffColor }]}>
              {question.difficulty}
            </Text>
          </View>
        </View>

        {/* ── Question text ── */}
        <Text style={styles.questionText}>{question.question}</Text>

        {/* ── Hint ── */}
        {question.hint ? (
          <View style={styles.hintBox}>
            <Ionicons
              name="bulb-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.hintText}>{question.hint}</Text>
          </View>
        ) : null}

        {/* ── Teach Me ── */}
        {!submitted && (
          <>
            {/* Loading state */}
            {isTeaching && (
              <View style={styles.teachLoadingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.teachLoadingText}>
                  {t("detail.teaching")}
                </Text>
              </View>
            )}

            {/* Explanation card (shown once explanation arrives) */}
            {!isTeaching && teachMeExplanation !== null && (
              <View style={styles.teachCard}>
                <View style={styles.teachCardHeader}>
                  <Ionicons
                    name="school-outline"
                    size={15}
                    color={Colors.primary}
                  />
                  <Text style={styles.teachCardLabel}>
                    {t("detail.conceptExplainer")}
                  </Text>
                </View>
                <Text style={styles.teachCardBody}>{teachMeExplanation}</Text>
                <TouchableOpacity
                  style={styles.gotItBtn}
                  onPress={() => setTeachMeExplanation(null)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.gotItText}>{t("detail.gotIt")}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error state */}
            {!isTeaching && teachError !== null && (
              <Text style={styles.teachErrorText}>{teachError}</Text>
            )}

            {/* Teach Me trigger button — hidden once explanation is visible */}
            {!isTeaching && teachMeExplanation === null && (
              <TouchableOpacity
                style={styles.teachMeBtn}
                onPress={handleTeachMe}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="bulb-outline"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.teachMeBtnText}>
                  {t("detail.teachMe")}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Answer input (hidden after submission) ── */}
        {!submitted && (
          <TextInput
            style={[styles.input, inputLocked && styles.inputDisabled]}
            placeholder={t("detail.placeholder")}
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={answer}
            onChangeText={setAnswer}
            editable={!inputLocked}
          />
        )}

        {/* ── Action area ── */}
        {evaluating ? (
          // Phase 2
          <View style={styles.evaluatingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.evaluatingText}>{t("detail.evaluating")}</Text>
          </View>
        ) : !submitted ? (
          // Phase 1 / idle
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{t("detail.submitAnswer")}</Text>
            )}
          </TouchableOpacity>
        ) : (
          // Phase 3
          <View>
            {evaluationResult ? (
              <EvaluationCard
                score={evaluationResult.score}
                feedback={evaluationResult.feedback}
              />
            ) : (
              <View style={styles.evalErrorBox}>
                <Text style={styles.evalErrorText}>{evalError}</Text>
              </View>
            )}

            {/* Back to Inbox — useFocusEffect on the list will re-fetch,
                so this question disappears automatically */}
            <TouchableOpacity
              style={styles.backToInboxBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  I18nManager.isRTL
                    ? "arrow-forward-circle-outline"
                    : "arrow-back-circle-outline"
                }
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.backToInboxText}>{t("detail.backToInbox")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 80,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: 2,
  },
  topBarTitle: {
    flex: 1,
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 3,
  },
  streakText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Badges ──
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  diffBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // ── Question ──
  questionText: {
    color: Colors.textPrimary,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: "600",
    marginBottom: Spacing.md,
    textAlign: "auto",
  },

  // ── Hint ──
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  hintText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: "italic",
    textAlign: "auto",
  },

  // ── Input ──
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 150,
    marginBottom: Spacing.lg,
    textAlign: "auto",
  },
  inputDisabled: {
    opacity: 0.5,
  },

  // ── Submit button ──
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Evaluating box ──
  evaluatingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evaluatingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // ── Eval error ──
  evalErrorBox: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error + "44",
    marginBottom: Spacing.md,
  },
  evalErrorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Back to Inbox ──
  backToInboxBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backToInboxText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Teach Me button ──
  teachMeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
    backgroundColor: Colors.primary + "0D",
    marginBottom: Spacing.md,
  },
  teachMeBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Teach Me loading ──
  teachLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  teachLoadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // ── Concept Explainer card ──
  teachCard: {
    backgroundColor: Colors.primary + "0D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  teachCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  teachCardLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  teachCardBody: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "auto",
    marginBottom: Spacing.md,
  },

  // ── Got it button ──
  gotItBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
  },
  gotItText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Teach error ──
  teachErrorText: {
    color: Colors.error,
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
});
