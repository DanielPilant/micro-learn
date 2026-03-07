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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { Colors, Spacing } from "../constants/theme";
import EvaluationCard from "../components/EvaluationCard";
import type { Question, EvaluationResult } from "../types";
import type { DailyQuestionScreenProps } from "../navigation/types";

export default function DailyQuestionScreen(_: DailyQuestionScreenProps) {
  const { user, signOut } = useAuth();

  // ── Question state ─────────────────────────────────────────
  const [question, setQuestion] = useState<Question | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Submission state machine ───────────────────────────────
  // Phase 1 – submitting: INSERT into user_answers
  // Phase 2 – evaluating: Edge Function calling Gemini
  // Phase 3 – submitted:  result ready (or evaluation failed gracefully)
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // ── Fetch a random question ────────────────────────────────
  const fetchQuestion = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    setAnswer("");
    setSubmitted(false);
    setEvaluating(false);
    setEvaluationResult(null);
    setEvalError(null);

    const { data, error } = await supabase.from("questions").select("*");

    if (error || !data || data.length === 0) {
      setFetchError(error?.message ?? "No questions found in the database.");
      setFetchLoading(false);
      return;
    }

    const random = data[Math.floor(Math.random() * data.length)] as Question;
    setQuestion(random);
    setFetchLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // ── Submit handler (3-phase) ───────────────────────────────
  const handleSubmit = async () => {
    if (!answer.trim()) {
      Alert.alert("Empty answer", "Write something before submitting.");
      return;
    }
    if (!question || !user) return;

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
        "Save failed",
        insertError?.message ?? "Could not save your answer."
      );
      return;
    }

    // ── Phase 2: invoke the evaluation Edge Function ─────────
    setEvaluating(true);
    const { data: evalData, error: fnError } =
      await supabase.functions.invoke<EvaluationResult>("evaluate-answer", {
        body: { answer_id: savedAnswer.id },
      });
    setEvaluating(false);

    if (fnError || !evalData) {
      // Evaluation failed — show a graceful error but still let the user
      // proceed. Their answer is already saved; score will remain null.
      setEvalError(
        "Evaluation unavailable right now. Your answer has been saved."
      );
    } else {
      setEvaluationResult(evalData);
    }

    // ── Phase 3: mark as submitted regardless of eval outcome ─
    setSubmitted(true);
  };

  // ── Full-screen loading state ──────────────────────────────
  if (fetchLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Full-screen error state ────────────────────────────────
  if (fetchError || !question) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{fetchError ?? "Unknown error"}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchQuestion}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Lock input whenever a network call is in flight ────────
  const inputLocked = submitting || evaluating || submitted;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.appName}>micro-learn</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Category + difficulty ── */}
        <Text style={styles.categoryBadge}>
          {question.category.replace(/_/g, " ").toUpperCase()}
        </Text>
        <Text style={styles.difficulty}>{question.difficulty}</Text>

        {/* ── Question text ── */}
        <Text style={styles.questionText}>{question.question}</Text>

        {question.hint && (
          <Text style={styles.hint}>Hint: {question.hint}</Text>
        )}

        {/* ── Answer input ── */}
        <TextInput
          style={[styles.input, inputLocked && styles.inputDisabled]}
          placeholder="Type your answer here..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={answer}
          onChangeText={setAnswer}
          editable={!inputLocked}
        />

        {/* ── Action area: Submit → Evaluating → Result ── */}
        {evaluating ? (
          // Phase 2: Gemini is processing
          <View style={styles.evaluatingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.evaluatingText}>Gemini is evaluating…</Text>
          </View>
        ) : !submitted ? (
          // Phase 1 or idle: show submit button
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Submit Answer</Text>
            )}
          </TouchableOpacity>
        ) : (
          // Phase 3: evaluation complete (or gracefully failed)
          <View>
            {evaluationResult ? (
              <EvaluationCard {...evaluationResult} />
            ) : (
              <View style={styles.evalErrorBox}>
                <Text style={styles.evalErrorText}>{evalError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={fetchQuestion}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Next Question
              </Text>
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
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
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
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  difficulty: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.md,
    textTransform: "capitalize",
  },
  questionText: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 140,
    marginBottom: Spacing.lg,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderColor: Colors.border,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
  },
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
  evalErrorBox: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error + "44",
    marginBottom: Spacing.lg,
  },
  evalErrorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
});
