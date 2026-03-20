import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useDailyConcept } from "../hooks/useDailyConcept";
import { Colors, Spacing } from "../constants/theme";
import type { LearnScreenProps } from "../navigation/types";
import type { QuizQuestion } from "../types";

const AMBER = "#F59E0B";

// ── Quiz sub-component (one question at a time) ──────────────

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  t: (key: any, vars?: Record<string, string | number>) => string;
}

function Quiz({ questions, onComplete, t }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[currentIndex];
  const isAnswered = selectedIndex !== null;
  const isCorrect = selectedIndex === q.correct_index;
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedIndex(idx);
    if (idx === q.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      // isCorrect reflects whether the *last* answer was right. correctCount
      // tracks all *previous* correct answers (state hasn't flushed the last
      // handleSelect increment yet when this runs synchronously), so we add
      // the last question's result explicitly to get the true final score.
      const finalScore = correctCount + (isCorrect ? 1 : 0);
      setFinished(true);
      onComplete(finalScore);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedIndex(null);
  };

  if (finished) {
    return null; // parent will render the completion state
  }

  return (
    <View>
      {/* Progress indicator */}
      <View style={styles.quizProgress}>
        {questions.map((_, i) => (
          <View
            key={i}
            style={[
              styles.quizDot,
              i === currentIndex && styles.quizDotActive,
              i < currentIndex && styles.quizDotDone,
            ]}
          />
        ))}
      </View>

      <Text style={styles.quizLabel}>
        {t("learn.questionOf", {
          current: String(currentIndex + 1),
          total: String(questions.length),
        })}
      </Text>
      <Text style={styles.quizQuestionText}>{q.question}</Text>

      {/* Options */}
      {q.options.map((option, idx) => {
        let optionStyle = styles.optionDefault;
        let textStyle = styles.optionTextDefault;

        if (isAnswered) {
          if (idx === q.correct_index) {
            optionStyle = styles.optionCorrect;
            textStyle = styles.optionTextCorrect;
          } else if (idx === selectedIndex) {
            optionStyle = styles.optionWrong;
            textStyle = styles.optionTextWrong;
          }
        }

        return (
          <TouchableOpacity
            key={idx}
            style={[styles.optionButton, optionStyle]}
            onPress={() => handleSelect(idx)}
            disabled={isAnswered}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionLetter, textStyle]}>
              {String.fromCharCode(65 + idx)}.
            </Text>
            <Text style={[styles.optionText, textStyle]}>{option}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Explanation (shown after answering) */}
      {isAnswered && (
        <View style={styles.explanationBox}>
          <View style={styles.explanationHeader}>
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "close-circle"}
              size={20}
              color={isCorrect ? Colors.success : Colors.error}
            />
            <Text
              style={[
                styles.explanationVerdict,
                { color: isCorrect ? Colors.success : Colors.error },
              ]}
            >
              {isCorrect ? t("learn.correct") : t("learn.incorrect")}
            </Text>
          </View>
          <Text style={styles.explanationText}>{q.explanation}</Text>
        </View>
      )}

      {/* Next / Finish button */}
      {isAnswered && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isLast ? t("learn.seeResults") : t("learn.nextQuestion")}
          </Text>
          <Ionicons
            name={
              isLast
                ? "trophy-outline"
                : I18nManager.isRTL
                  ? "arrow-back"
                  : "arrow-forward"
            }
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Completion card ──────────────────────────────────────────

function CompletionCard({
  score,
  total,
  t,
}: {
  score: number;
  total: number;
  t: (key: any) => string;
}) {
  const color =
    score === total
      ? Colors.success
      : score >= Math.ceil(total / 2)
        ? AMBER
        : Colors.error;

  return (
    <View style={styles.completionCard}>
      <Ionicons name="checkmark-done-circle" size={48} color={color} />
      <Text style={styles.completionTitle}>{t("learn.quizComplete")}</Text>
      <Text style={[styles.completionScore, { color }]}>
        {score}/{total}
      </Text>
      <Text style={styles.completionSubtitle}>
        {score === total
          ? t("learn.perfectScore")
          : score >= Math.ceil(total / 2)
            ? t("learn.solidWork")
            : t("learn.keepLearning")}
      </Text>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────

export default function LearnScreen(_: LearnScreenProps) {
  const { signOut } = useAuth();
  const { t, lang } = useLanguage();
  const { concept, progress, loading, error, refresh, submitQuizScore } =
    useDailyConcept();
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [localScore, setLocalScore] = useState<number | null>(null);

  // Re-fetch each time the tab gains focus and reset local quiz state.
  useFocusEffect(
    useCallback(() => {
      setQuizCompleted(false);
      setLocalScore(null);
      refresh();
    }, [refresh]),
  );

  const handleQuizComplete = async (score: number) => {
    setLocalScore(score);
    setQuizCompleted(true);
    if (concept) {
      await submitQuizScore(concept.id, score);
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>{t("learn.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── No concept generated for today ─────────────────────────
  if (!concept) {
    return (
      <View style={styles.centered}>
        <Ionicons name="time-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>{t("learn.noConcept")}</Text>
        <Text style={styles.emptyBody}>
          {t("learn.noConceptBody")}
        </Text>
      </View>
    );
  }

  const alreadyCompleted = progress !== null;
  const quizQuestions = concept.quiz_data ?? [];
  const showCompletionCard =
    alreadyCompleted || (quizCompleted && localScore !== null);
  const displayScore = alreadyCompleted ? progress.score : localScore!;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>{t("learn.appName")}</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>{t("learn.signOut")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Date badge ── */}
        <Text style={styles.dateBadge}>
          {new Date(concept.date + "T00:00:00").toLocaleDateString(
            lang === "he" ? "he-IL" : "en-US",
            {
              weekday: "long",
              month: "long",
              day: "numeric",
            },
          )}
        </Text>

        {/* ── Article ── */}
        <Text style={styles.title}>{concept.title}</Text>
        <Text style={styles.content}>{concept.content}</Text>

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Quiz section ── */}
        <Text style={styles.sectionTitle}>{t("learn.knowledgeCheck")}</Text>

        {showCompletionCard ? (
          <CompletionCard score={displayScore} total={quizQuestions.length} t={t} />
        ) : (
          <Quiz questions={quizQuestions} onComplete={handleQuizComplete} t={t} />
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
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

  // ── Date badge ──
  dateBadge: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },

  // ── Article ──
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
    marginBottom: Spacing.md,
    textAlign: "auto",
  },
  content: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: Spacing.lg,
    textAlign: "auto",
  },

  // ── Section divider ──
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // ── Quiz progress dots ──
  quizProgress: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quizDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  quizDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  quizDotDone: {
    backgroundColor: Colors.success,
  },

  // ── Quiz question ──
  quizLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  quizQuestionText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    marginBottom: Spacing.md,
    textAlign: "auto",
  },

  // ── Option buttons ──
  optionButton: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  optionDefault: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  optionCorrect: {
    backgroundColor: Colors.success + "18",
    borderColor: Colors.success,
  },
  optionWrong: {
    backgroundColor: Colors.error + "18",
    borderColor: Colors.error,
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
  },
  optionTextDefault: {
    color: Colors.textPrimary,
  },
  optionTextCorrect: {
    color: Colors.success,
  },
  optionTextWrong: {
    color: Colors.error,
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  // ── Explanation ──
  explanationBox: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  explanationVerdict: {
    fontSize: 14,
    fontWeight: "700",
  },
  explanationText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "auto",
  },

  // ── Next button ──
  nextButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Completion card ──
  completionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  completionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  completionScore: {
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 52,
  },
  completionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },

  // ── Empty / error states ──
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
