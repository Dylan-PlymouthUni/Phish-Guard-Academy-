export type RiskBucket = "low" | "medium" | "high";

type AnalyticsStore = {
  analysis: {
    totalAnalyses: number;
    riskCounts: Record<RiskBucket, number>;
  };
  challenges: {
    totalAnswers: number;
    correctAnswers: number;
    byCategory: Record<string, { total: number; correct: number }>;
  };
  lessons: {
    opened: number;
    completed: number;
    byTopic: Record<string, { opened: number; completed: number }>;
  };
};

const LS_KEY = "pg_analytics_v1";

function getDefaultStore(): AnalyticsStore {
  return {
    analysis: {
      totalAnalyses: 0,
      riskCounts: { low: 0, medium: 0, high: 0 },
    },
    challenges: {
      totalAnswers: 0,
      correctAnswers: 0,
      byCategory: {},
    },
    lessons: {
      opened: 0,
      completed: 0,
      byTopic: {},
    },
  };
}

function loadStore(): AnalyticsStore {
  if (typeof window === "undefined") return getDefaultStore();
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return getDefaultStore();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultStore(),
      ...(parsed || {}),
    };
  } catch {
    return getDefaultStore();
  }
}

function saveStore(store: AnalyticsStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

/* ---------- Public logging API ---------- */

export function logAnalysis(risk: number) {
  const store = loadStore();
  const bucket: RiskBucket =
    risk >= 70 ? "high" : risk >= 40 ? "medium" : "low";

  store.analysis.totalAnalyses += 1;
  store.analysis.riskCounts[bucket] =
    (store.analysis.riskCounts[bucket] || 0) + 1;

  saveStore(store);
}

export function logChallengeAnswer(category: string, correct: boolean) {
  const store = loadStore();
  const cat = category || "Uncategorised";

  store.challenges.totalAnswers += 1;
  if (correct) store.challenges.correctAnswers += 1;

  if (!store.challenges.byCategory[cat]) {
    store.challenges.byCategory[cat] = { total: 0, correct: 0 };
  }
  store.challenges.byCategory[cat].total += 1;
  if (correct) store.challenges.byCategory[cat].correct += 1;

  saveStore(store);
}

export function logLessonEvent(topicId: string, event: "opened" | "completed") {
  const store = loadStore();
  const id = topicId || "unknown";
  if (!store.lessons.byTopic[id]) {
    store.lessons.byTopic[id] = { opened: 0, completed: 0 };
  }

  if (event == "opened") {
    store.lessons.opened += 1;
    store.lessons.byTopic[id].opened += 1;
  } else if (event == "completed") {
    store.lessons.completed += 1;
    store.lessons.byTopic[id].completed += 1;
  }

  saveStore(store);
}

/* ---------- Aggregated summary for UI ---------- */

export function getAnalyticsSummary() {
  const store = loadStore();

  const { totalAnswers, correctAnswers, byCategory } = store.challenges;
  const avgScore =
    totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  const categoryBreakdown = Object.entries(byCategory).map(
    ([cat, { total, correct }]) => ({
      category: cat,
      total,
      correct,
      pct: total > 0 ? +( (correct / total) * 100 ).toFixed(1) : 0,
    })
  );

  return {
    analysis: {
      totalAnalyses: store.analysis.totalAnalyses,
      riskCounts: store.analysis.riskCounts,
    },
    challenges: {
      totalAnswers,
      correctAnswers,
      avgScore,
      byCategory: categoryBreakdown,
    },
    lessons: {
      opened: store.lessons.opened,
      completed: store.lessons.completed,
      byTopic: store.lessons.byTopic,
    },
  };
}
