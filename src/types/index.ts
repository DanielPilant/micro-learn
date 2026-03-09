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

/** Daily Concept Learning ("Daily Bite") */

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface DailyConcept {
  id: string;
  date: string;
  title: string;
  content: string;
  quiz_data: QuizQuestion[];
}

export interface UserConceptProgress {
  id: string;
  user_id: string;
  concept_id: string;
  score: number;
  completed_at: string;
}
