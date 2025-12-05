export type RiskBucket = "low" | "medium" | "high";

export interface AnalysisEvent {
  kind: "analysis";
  timestamp: string;
  risk: RiskBucket;
}

export interface ChallengeEvent {
  kind: "challenge";
  timestamp: string;
  category: string;
  correct: boolean;
}

export interface LessonEvent {
  kind: "lesson";
  timestamp: string;
  topicId: string;
  event: "opened" | "completed";
}

export type AnalyticsEvent = AnalysisEvent | ChallengeEvent | LessonEvent;

const STORAGE_KEY = "pga_analytics_v1";

function loadEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore quota / private mode issues
  }
}

function addEvent(e: AnalyticsEvent) {
  const events = loadEvents();
  events.push(e);
  saveEvents(events);
}

/* ---- PUBLIC API ---- */

export function logAnalysis(riskScore: number) {
  const bucket: RiskBucket =
    riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  addEvent({
    kind: "analysis",
    timestamp: new Date().toISOString(),
    risk: bucket,
  });
}

export function logChallengeAnswer(category: string, correct: boolean) {
  addEvent({
    kind: "challenge",
    timestamp: new Date().toISOString(),
    category,
    correct,
  });
}

export function logLessonEvent(
  topicId: string,
  event: "opened" | "completed",
) {
  addEvent({
    kind: "lesson",
    timestamp: new Date().toISOString(),
    topicId,
    event,
  });
}

export function getAnalyticsSummary() {
  const events = loadEvents();

  const challengeEvents = events.filter(
    (e): e is ChallengeEvent => e.kind === "challenge",
  );
  const lessonEvents = events.filter(
    (e): e is LessonEvent => e.kind === "lesson",
  );
  const analysisEvents = events.filter(
    (e): e is AnalysisEvent => e.kind === "analysis",
  );

  const totalAnswers = challengeEvents.length;
  const correctAnswers = challengeEvents.filter((e) => e.correct).length;
  const avgScore = totalAnswers ? (correctAnswers / totalAnswers) * 100 : 0;

  const perCategory: Record<string, { total: number; correct: number }> = {};
  for (const e of challengeEvents) {
    if (!perCategory[e.category]) {
      perCategory[e.category] = { total: 0, correct: 0 };
    }
    perCategory[e.category].total += 1;
    if (e.correct) perCategory[e.category].correct += 1;
  }

  const openedLessons = new Set(
    lessonEvents.filter((e) => e.event === "opened").map((e) => e.topicId),
  );
  const completedLessons = new Set(
    lessonEvents.filter((e) => e.event === "completed").map((e) => e.topicId),
  );

  const riskCounts: Record<RiskBucket, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const e of analysisEvents) {
    riskCounts[e.risk] += 1;
  }
  const totalAnalyses = analysisEvents.length;

  return {
    challenges: {
      totalAnswers,
      correctAnswers,
      avgScore,
      perCategory,
    },
    lessons: {
      opened: openedLessons.size,
      completed: completedLessons.size,
    },
    analysis: {
      totalAnalyses,
      riskCounts,
    },
  };
}
