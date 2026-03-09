# 🧠 Micro-Learn: FAANG Interview Prep App

Micro-Learn is a full-stack, AI-powered mobile application designed to help software engineers prepare for FAANG-level technical interviews. By delivering daily bite-sized questions and providing real-time, constructive feedback using Large Language Models (LLMs), the app accelerates learning and maintains user engagement through gamification.

## ✨ Key Features (Current Status)

- **🔐 Secure Authentication:** Full user auth flow (Sign-In / Sign-Up) powered by Supabase Auth.
- **📝 Daily Practice:** Fetches random technical questions across various categories (System Design, Algorithms, Database, etc.) and difficulty levels.
- **🤖 Real-Time AI Evaluation:** Evaluates user answers using **Gemini 2.0 Flash**. The app provides a technical score (0-100) and constructive, personalized feedback.
- **🔥 Automated Streaks:** Tracks consecutive daily learning. The streak logic is enforced securely via PostgreSQL Database Triggers, preventing client-side manipulation.
- **📊 Readiness Dashboard:** Aggregates AI-generated scores to display user readiness progress by category.

## 🛠️ Tech Stack & Architecture

### Frontend (Mobile)
- **Framework:** React Native / Expo (SDK 54+)
- **Language:** TypeScript
- **Navigation:** React Navigation (Bottom Tabs & Native Stack)
- **State Management:** React Hooks & Context API
- **UI:** Custom theme with a responsive, dark-mode-first design.

### Backend (BaaS & Database)
- **Infrastructure:** Supabase
- **Database:** PostgreSQL (with Row Level Security - RLS)
- **Functions:** PL/pgSQL for automated trigger-based data mutation (Streaks).

### AI Integration (Serverless)
- **Compute:** Supabase Edge Functions (Deno)
- **Model:** Google Gemini 2.0 Flash
- **Architecture Flow:**
  1. The React Native client securely inserts the user's raw answer into the Postgres database.
  2. The client invokes an Edge Function, passing the authenticated JWT.
  3. The Edge Function acts as a secure proxy, querying the database and sending a prompt to the Gemini API (using structured JSON mode).
  4. The result (Score & Feedback) is returned to the client and persisted in the database.

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js & npm
- Expo CLI
- Supabase CLI

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/micro-learn.git](https://github.com/YOUR_USERNAME/micro-learn.git)
   cd micro-learn
   ```

2. Install frontend dependencies:

  ```Bash
  npm install
  Set up Supabase (Local/Remote):
  ```

3. Link your Supabase project: npx supabase link --project-ref <your-project-ref>

4. Push the database schema and triggers: npx supabase db push

5. Configure Edge Function Secrets:

```Bash
npx supabase secrets set GEMINI_API_KEY=<your-google-ai-studio-key>
npx supabase functions deploy evaluate-answer --no-verify-jwt
```

6. Run the Expo app:

```Bash
npx expo start
```

🗺️ Roadmap (Next Steps)
[x] Phase 1: UI/UX & Theming

[x] Phase 2: Auth & Database Schema

[x] Phase 3: AI Evaluation via Edge Functions

[x] Phase 4: Readiness Dashboard & Streak Triggers

[ ] Phase 5: Question History & Review Screen

[ ] Phase 6: Push Notifications for Daily Reminders

[ ] Phase 7: Spaced Repetition Algorithm

Built with ❤️ using React Native, Supabase, and Gemini AI.
