import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import type { Profile } from "../types";

export interface CategoryReadiness {
  category: string;
  avgScore: number;
  answerCount: number;
}

export interface ReadinessState {
  profile: Profile | null;
  categories: CategoryReadiness[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReadiness(): ReadinessState {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<CategoryReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // ── 1. Fetch profile for streak data ──────────────────────
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("id, display_name, current_streak, longest_streak")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    // ── 2. Fetch all scored answers joined with question category ──
    // Supabase resolves the FK user_answers.question_id → questions.id
    // automatically when using the related-table syntax.
    const { data: answersData, error: answersErr } = await supabase
      .from("user_answers")
      .select("score, questions(category)")
      .eq("user_id", user.id)
      .not("score", "is", null);

    if (answersErr) {
      setError(answersErr.message);
      setLoading(false);
      return;
    }

    // ── 3. Aggregate per-category client-side ──────────────────
    const map: Record<string, { total: number; count: number }> = {};
    for (const row of answersData ?? []) {
      const cat = (row.questions as unknown as { category: string } | null)
        ?.category;
      if (!cat || row.score == null) continue;
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += row.score;
      map[cat].count += 1;
    }

    const cats: CategoryReadiness[] = Object.entries(map)
      .map(([category, { total, count }]) => ({
        category,
        avgScore: Math.round(total / count),
        answerCount: count,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    setProfile(profileData as Profile);
    setCategories(cats);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { profile, categories, loading, error, refresh };
}
