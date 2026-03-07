/** Core domain types – kept minimal for Step 1 */

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
  answered_at: string;
}

export interface Profile {
  id: string;
  display_name?: string;
  current_streak: number;
  longest_streak: number;
}
