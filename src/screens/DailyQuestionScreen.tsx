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
import type { Question } from "../types";
import type { DailyQuestionScreenProps } from "../navigation/types";

export default function DailyQuestionScreen(_: DailyQuestionScreenProps) {
  const { user, signOut } = useAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Fetch a random question from Supabase ──────────────────
  const fetchQuestion = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    setAnswer("");
    setSubmitted(false);

    const { data, error } = await supabase.from("questions").select("*");

    if (error || !data || data.length === 0) {
      setFetchError(error?.message ?? "No questions found in the database.");
      setFetchLoading(false);
      return;
    }

    // Pick a random question from the returned rows.
    const random = data[Math.floor(Math.random() * data.length)] as Question;
    setQuestion(random);
    setFetchLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // ── Persist answer to Supabase ────────────────────────────
  const handleSubmit = async () => {
    if (!answer.trim()) {
      Alert.alert("Empty answer", "Write something before submitting.");
      return;
    }
    if (!question || !user) return;

    setSubmitting(true);
    const { error } = await supabase.from("user_answers").insert({
      user_id: user.id,
      question_id: question.id,
      answer_text: answer.trim(),
    });
    setSubmitting(false);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    setSubmitted(true);
  };

  // ── Loading state ─────────────────────────────────────────
  if (fetchLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Error state ───────────────────────────────────────────
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

  // ── Main render ───────────────────────────────────────────
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

        {/* ── Header ── */}
        <Text style={styles.categoryBadge}>
          {question.category.replace(/_/g, " ").toUpperCase()}
        </Text>
        <Text style={styles.difficulty}>{question.difficulty}</Text>

        {/* ── Question ── */}
        <Text style={styles.questionText}>{question.question}</Text>

        {question.hint && (
          <Text style={styles.hint}>Hint: {question.hint}</Text>
        )}

        {/* ── Answer Input ── */}
        <TextInput
          style={[
            styles.input,
            (submitted || submitting) && styles.inputDisabled,
          ]}
          placeholder="Type your answer here..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={answer}
          onChangeText={setAnswer}
          editable={!submitted && !submitting}
        />

        {/* ── Action Button ── */}
        {!submitted ? (
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
          <View>
            <Text style={styles.successText}>
              Answer saved! AI evaluation coming in Step 3.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={fetchQuestion}
            >
              <Text style={styles.buttonText}>Next Question</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────
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
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  successText: {
    color: Colors.success,
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
});
