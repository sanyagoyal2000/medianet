export const MODELS = {
  planner: "claude-sonnet-5-5", // Brief Interpreter, ShopBuddy assistant
  fast: "claude-haiku-5-5", // Context Profiler, Explainer, Placement Guard
} as const;

export const AGENT_MODELS: Record<string, string> = {
  contextProfiler: MODELS.fast,
  explainer: MODELS.fast,
  placementGuard: MODELS.fast,
  briefInterpreter: MODELS.planner,
  shopbuddy: MODELS.planner,
  trafficRouter: "rules only (no LLM)",
};
