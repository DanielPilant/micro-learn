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

    // ── 1. Fetch the user's preferred content language ─────────
    const { data: profileData } = await supabase
      .from("profiles")
      .select("content_language")
      .eq("id", user.id)
      .single();

    const userLang = profileData?.content_language ?? "en";

    // ── 2. Fetch the most recent concept in the user's language ─
    // Use .maybeSingle() instead of .single() — .single() throws
    // PGRST116 ("cannot coerce to JSON object") when 0 or 2+ rows match.
    const { data: conceptData, error: conceptErr } = await supabase
      .from("daily_concepts")
      .select("*")
      .eq("language", userLang)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conceptErr) {
      console.error("Fetch concept error:", conceptErr);
      setError(conceptErr.message);
      setLoading(false);
      return;
    }

    if (!conceptData) {
      console.log("No concept found for language:", userLang);
      setConcept(null);
      setProgress(null);
      setLoading(false);
      return;
    }

    console.log("Fetched concept:", conceptData.id, conceptData.title);
    setConcept(conceptData as DailyConcept);

    // ── 3. Check if user already completed this concept's quiz ─
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
