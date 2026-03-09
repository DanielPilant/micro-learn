import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import type { DailyConcept, UserConceptProgress } from "../types";

export interface DailyConceptState {
  concept: DailyConcept | null;
  progress: UserConceptProgress | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitQuizScore: (conceptId: string, score: number) => Promise<void>;
}

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDailyConcept(): DailyConceptState {
  const { user } = useAuth();
  const [concept, setConcept] = useState<DailyConcept | null>(null);
  const [progress, setProgress] = useState<UserConceptProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const today = todayDateString();

    // ── 1. Fetch today's concept ──────────────────────────────
    const { data: conceptData, error: conceptErr } = await supabase
      .from("daily_concepts")
      .select("id, date, title, content, quiz_data")
      .eq("date", today)
      .maybeSingle();

    if (conceptErr) {
      setError(conceptErr.message);
      setLoading(false);
      return;
    }

    if (!conceptData) {
      setConcept(null);
      setProgress(null);
      setLoading(false);
      return;
    }

    setConcept(conceptData as DailyConcept);

    // ── 2. Check if user already completed this concept's quiz ─
    const { data: progressData, error: progressErr } = await supabase
      .from("user_concept_progress")
      .select("id, user_id, concept_id, score, completed_at")
      .eq("user_id", user.id)
      .eq("concept_id", conceptData.id)
      .maybeSingle();

    if (progressErr) {
      setError(progressErr.message);
      setLoading(false);
      return;
    }

    setProgress((progressData as UserConceptProgress) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Submit quiz score ─────────────────────────────────────
  const submitQuizScore = useCallback(
    async (conceptId: string, score: number) => {
      if (!user) return;

      const { data, error: insertErr } = await supabase
        .from("user_concept_progress")
        .insert({
          user_id: user.id,
          concept_id: conceptId,
          score,
        })
        .select("id, user_id, concept_id, score, completed_at")
        .single();

      if (insertErr) {
        setError(insertErr.message);
        return;
      }

      setProgress(data as UserConceptProgress);
    },
    [user],
  );

  return { concept, progress, loading, error, refresh, submitQuizScore };
}
