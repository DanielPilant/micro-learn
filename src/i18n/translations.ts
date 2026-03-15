const translations = {
  en: {
    // ── Tabs ──
    "tab.learn": "Learn",
    "tab.practice": "Practice",
    "tab.progress": "Progress",
    "tab.settings": "Settings",

    // ── LearnScreen ──
    "learn.appName": "micro-learn",
    "learn.signOut": "Sign out",
    "learn.knowledgeCheck": "KNOWLEDGE CHECK",
    "learn.quizComplete": "Quiz Complete!",
    "learn.perfectScore": "Perfect score! You nailed it.",
    "learn.solidWork":
      "Solid work. Review the explanations to strengthen weak spots.",
    "learn.keepLearning":
      "Keep learning! Re-read the article and try again tomorrow.",
    "learn.correct": "Correct!",
    "learn.incorrect": "Incorrect",
    "learn.seeResults": "See Results",
    "learn.nextQuestion": "Next Question",
    "learn.questionOf": "QUESTION {current} OF {total}",
    "learn.noConcept": "No Daily Bite yet",
    "learn.noConceptBody":
      "Today's concept hasn't been generated yet. Check back soon!",
    "learn.retry": "Retry",

    // ── PracticeListScreen ──
    "practice.inbox": "Practice Inbox",
    "practice.allCaughtUp": "All caught up",
    "practice.questionsWaiting": "{count} question{s} waiting",
    "practice.generate": "Generate 5 New Questions",
    "practice.generating": "AI is generating\u2026",
    "practice.genFailed": "Generation failed. Please try again.",
    "practice.emptyHeading": "Nothing left to answer!",
    "practice.emptySubtext": "Hit the button above to generate a fresh batch.",
    "practice.tapRetry": "Tap to retry",

    // ── PracticeDetailScreen ──
    "detail.practice": "Practice",
    "detail.emptyAnswer": "Empty answer",
    "detail.writeFirst": "Write something before submitting.",
    "detail.saveFailed": "Save failed",
    "detail.couldNotSave": "Could not save your answer.",
    "detail.submitAnswer": "Submit Answer",
    "detail.evaluating": "Gemini is evaluating\u2026",
    "detail.evalUnavailable":
      "Evaluation unavailable right now. Your answer has been saved.",
    "detail.backToInbox": "Back to Inbox",
    "detail.placeholder": "Type your answer here\u2026",

    // ── ReadinessScreen ──
    "progress.title": "Progress",
    "progress.dayStreak": "day streak",
    "progress.longest": "longest",
    "progress.readinessByCategory": "Readiness by Category",
    "progress.basedOn": "Based on {count} answer{s}",
    "progress.noData": "No data yet",
    "progress.noDataBody":
      "Submit and evaluate answers on the Daily tab to see your readiness scores here.",

    // ── EvaluationCard ──
    "eval.excellent": "Excellent",
    "eval.good": "Good",
    "eval.developing": "Developing",
    "eval.needsWork": "Needs Work",
    "eval.feedback": "Feedback",

    // ── SettingsScreen ──
    "settings.title": "Settings",
    "settings.contentLanguage": "CONTENT LANGUAGE",
    "settings.contentLanguageDesc":
      "Concepts, questions, and feedback will be generated in your chosen language.",
    "settings.contentLanguageNote":
      "New content generated after changing this setting will appear in the selected language. Previously generated content is unaffected.",
    "settings.saveFailed": "Could not save preference. Please try again.",
    "settings.account": "ACCOUNT",
    "settings.signOut": "Sign Out",
    "settings.restartTitle": "Restart Required",
    "settings.restartMsg":
      "Please close and re-open the app to apply the layout direction change.",
  },

  he: {
    // ── Tabs ──
    "tab.learn": "\u05DC\u05DE\u05D9\u05D3\u05D4",
    "tab.practice": "\u05EA\u05E8\u05D2\u05D5\u05DC",
    "tab.progress": "\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA",
    "tab.settings": "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA",

    // ── LearnScreen ──
    "learn.appName": "micro-learn",
    "learn.signOut": "\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA",
    "learn.knowledgeCheck": "\u05D1\u05D3\u05D9\u05E7\u05EA \u05D9\u05D3\u05E2",
    "learn.quizComplete":
      "\u05D4\u05D7\u05D9\u05D3\u05D5\u05DF \u05D4\u05D5\u05E9\u05DC\u05DD!",
    "learn.perfectScore":
      "\u05E6\u05D9\u05D5\u05DF \u05DE\u05D5\u05E9\u05DC\u05DD! \u05E2\u05D1\u05D5\u05D3\u05D4 \u05DE\u05E6\u05D5\u05D9\u05E0\u05EA.",
    "learn.solidWork":
      "\u05E2\u05D1\u05D5\u05D3\u05D4 \u05D8\u05D5\u05D1\u05D4. \u05E2\u05D9\u05D9\u05E0\u05D5 \u05D1\u05D4\u05E1\u05D1\u05E8\u05D9\u05DD \u05DB\u05D3\u05D9 \u05DC\u05D7\u05D6\u05E7 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D7\u05DC\u05E9\u05D5\u05EA.",
    "learn.keepLearning":
      "\u05D4\u05DE\u05E9\u05D9\u05DB\u05D5 \u05DC\u05DC\u05DE\u05D5\u05D3! \u05E7\u05E8\u05D0\u05D5 \u05E9\u05D5\u05D1 \u05D0\u05EA \u05D4\u05DE\u05D0\u05DE\u05E8 \u05D5\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1 \u05DE\u05D7\u05E8.",
    "learn.correct": "\u05E0\u05DB\u05D5\u05DF!",
    "learn.incorrect": "\u05DC\u05D0 \u05E0\u05DB\u05D5\u05DF",
    "learn.seeResults":
      "\u05E6\u05E4\u05D4 \u05D1\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA",
    "learn.nextQuestion": "\u05E9\u05D0\u05DC\u05D4 \u05D4\u05D1\u05D0\u05D4",
    "learn.questionOf":
      "\u05E9\u05D0\u05DC\u05D4 {current} \u05DE\u05EA\u05D5\u05DA {total}",
    "learn.noConcept":
      "\u05D0\u05D9\u05DF \u05E2\u05D3\u05D9\u05D9\u05DF \u05EA\u05D5\u05DB\u05DF \u05D9\u05D5\u05DE\u05D9",
    "learn.noConceptBody":
      "\u05D4\u05EA\u05D5\u05DB\u05DF \u05E9\u05DC \u05D4\u05D9\u05D5\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05E0\u05D5\u05E6\u05E8. \u05D1\u05D3\u05E7\u05D5 \u05E9\u05D5\u05D1 \u05D1\u05E7\u05E8\u05D5\u05D1!",
    "learn.retry": "\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1",

    // ── PracticeListScreen ──
    "practice.inbox": "\u05EA\u05D9\u05D1\u05EA \u05EA\u05E8\u05D2\u05D5\u05DC",
    "practice.allCaughtUp": "\u05D4\u05DB\u05DC \u05E0\u05E2\u05E0\u05D4",
    "practice.questionsWaiting":
      "{count} \u05E9\u05D0\u05DC\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA",
    "practice.generate":
      "\u05E6\u05D5\u05E8 5 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA",
    "practice.generating":
      "\u05D4\u05D1\u05D9\u05E0\u05D4 \u05DE\u05DC\u05D0\u05DB\u05D5\u05EA\u05D9\u05EA \u05DE\u05D9\u05D9\u05E6\u05E8\u05EA\u2026",
    "practice.genFailed":
      "\u05D4\u05D9\u05E6\u05D9\u05E8\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    "practice.emptyHeading":
      "\u05D0\u05D9\u05DF \u05E9\u05D0\u05DC\u05D5\u05EA \u05DC\u05DE\u05E2\u05E0\u05D4!",
    "practice.emptySubtext":
      "\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \u05D4\u05DB\u05E4\u05EA\u05D5\u05E8 \u05DC\u05DE\u05E2\u05DC\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05D9\u05D9\u05E6\u05E8 \u05E7\u05D1\u05D5\u05E6\u05D4 \u05D7\u05D3\u05E9\u05D4.",
    "practice.tapRetry":
      "\u05DC\u05D7\u05E6\u05D5 \u05DC\u05E0\u05E1\u05D5\u05EA \u05E9\u05D5\u05D1",

    // ── PracticeDetailScreen ──
    "detail.practice": "\u05EA\u05E8\u05D2\u05D5\u05DC",
    "detail.emptyAnswer":
      "\u05EA\u05E9\u05D5\u05D1\u05D4 \u05E8\u05D9\u05E7\u05D4",
    "detail.writeFirst":
      "\u05DB\u05EA\u05D1\u05D5 \u05DE\u05E9\u05D4\u05D5 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05E9\u05DC\u05D9\u05D7\u05D4.",
    "detail.saveFailed":
      "\u05D4\u05E9\u05DE\u05D9\u05E8\u05D4 \u05E0\u05DB\u05E9\u05DC\u05D4",
    "detail.couldNotSave":
      "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05DE\u05D5\u05E8 \u05D0\u05EA \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4.",
    "detail.submitAnswer": "\u05E9\u05DC\u05D7 \u05EA\u05E9\u05D5\u05D1\u05D4",
    "detail.evaluating": "Gemini \u05DE\u05E2\u05E8\u05D9\u05DA\u2026",
    "detail.evalUnavailable":
      "\u05D4\u05D4\u05E2\u05E8\u05DB\u05D4 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05E0\u05D4 \u05DB\u05E8\u05D2\u05E2. \u05D4\u05EA\u05E9\u05D5\u05D1\u05D4 \u05E0\u05E9\u05DE\u05E8\u05D4.",
    "detail.backToInbox":
      "\u05D7\u05D6\u05E8\u05D4 \u05DC\u05EA\u05D9\u05D1\u05D4",
    "detail.placeholder":
      "\u05DB\u05EA\u05D1\u05D5 \u05D0\u05EA \u05EA\u05E9\u05D5\u05D1\u05EA\u05DB\u05DD \u05DB\u05D0\u05DF\u2026",

    // ── ReadinessScreen ──
    "progress.title": "\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA",
    "progress.dayStreak":
      "\u05D9\u05DE\u05D9\u05DD \u05E8\u05E6\u05D5\u05E4\u05D9\u05DD",
    "progress.longest": "\u05D4\u05DB\u05D9 \u05D0\u05E8\u05D5\u05DA",
    "progress.readinessByCategory":
      "\u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05DC\u05E4\u05D9 \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4",
    "progress.basedOn":
      "\u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 {count} \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA",
    "progress.noData":
      "\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF",
    "progress.noDataBody":
      "\u05E9\u05DC\u05D7\u05D5 \u05D5\u05D4\u05E2\u05E8\u05D9\u05DB\u05D5 \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D1\u05DC\u05E9\u05D5\u05E0\u05D9\u05EA \u05D4\u05D9\u05D5\u05DE\u05D9\u05EA \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05E6\u05D9\u05D5\u05E0\u05D9 \u05D4\u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05DB\u05D0\u05DF.",

    // ── EvaluationCard ──
    "eval.excellent": "\u05DE\u05E6\u05D5\u05D9\u05DF",
    "eval.good": "\u05D8\u05D5\u05D1",
    "eval.developing": "\u05D1\u05D4\u05EA\u05E4\u05EA\u05D7\u05D5\u05EA",
    "eval.needsWork": "\u05D3\u05D5\u05E8\u05E9 \u05E9\u05D9\u05E4\u05D5\u05E8",
    "eval.feedback": "\u05DE\u05E9\u05D5\u05D1",

    // ── SettingsScreen ──
    "settings.title": "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA",
    "settings.contentLanguage": "\u05E9\u05E4\u05EA \u05EA\u05D5\u05DB\u05DF",
    "settings.contentLanguageDesc":
      "\u05EA\u05D5\u05DB\u05DF, \u05E9\u05D0\u05DC\u05D5\u05EA \u05D5\u05DE\u05E9\u05D5\u05D1 \u05D9\u05D9\u05D5\u05D5\u05E6\u05E8\u05D5 \u05D1\u05E9\u05E4\u05D4 \u05E9\u05D1\u05D7\u05E8\u05EA\u05DD.",
    "settings.contentLanguageNote":
      "\u05EA\u05D5\u05DB\u05DF \u05D7\u05D3\u05E9 \u05E9\u05D9\u05D9\u05D5\u05E6\u05E8 \u05DC\u05D0\u05D7\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9 \u05D4\u05D2\u05D3\u05E8\u05D4 \u05D6\u05D5 \u05D9\u05D5\u05E4\u05D9\u05E2 \u05D1\u05E9\u05E4\u05D4 \u05D4\u05E0\u05D1\u05D7\u05E8\u05EA. \u05EA\u05D5\u05DB\u05DF \u05E7\u05D5\u05D3\u05DD \u05DC\u05D0 \u05DE\u05D5\u05E9\u05E4\u05E2.",
    "settings.saveFailed":
      "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05DE\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D4\u05E2\u05D3\u05E4\u05D4. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.",
    "settings.account": "\u05D7\u05E9\u05D1\u05D5\u05DF",
    "settings.signOut": "\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA",
    "settings.restartTitle":
      "\u05E0\u05D3\u05E8\u05E9\u05EA \u05D4\u05E4\u05E2\u05DC\u05D4 \u05DE\u05D7\u05D3\u05E9",
    "settings.restartMsg":
      "\u05D0\u05E0\u05D0 \u05E1\u05D2\u05E8\u05D5 \u05D5\u05E4\u05EA\u05D7\u05D5 \u05DE\u05D7\u05D3\u05E9 \u05D0\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D7\u05D9\u05DC \u05D0\u05EA \u05E9\u05D9\u05E0\u05D5\u05D9 \u05DB\u05D9\u05D5\u05D5\u05DF \u05D4\u05EA\u05E6\u05D5\u05D2\u05D4.",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
export type ContentLanguage = "en" | "he";

export default translations;
