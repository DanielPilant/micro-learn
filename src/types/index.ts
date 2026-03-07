/** Core domain types */

export interface Question {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  hint?: string;
  sample_answer?: string;
}

export interface UserAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string;
  score?: number;
  feedback?: string;
  answered_at: string;
}

export interface Profile {
  id: string;
  display_name?: string;
  current_streak: number;
  longest_streak: number;
}

/** Returned by the evaluate-answer Edge Function */
export interface EvaluationResult {
  score: number;
  feedback: string;
}
