// Prompts are Markdown, bundled as strings at build time (webpack asset/source; scripts/register-md.mjs for tsx).
import contextProfiler from "./contextProfiler.md";
import explainer from "./explainer.md";
import briefInterpreter from "./briefInterpreter.md";
import placementGuard from "./placementGuard.md";
import shopbuddy from "./shopbuddy.md";

export const PROMPTS = { contextProfiler, explainer, briefInterpreter, placementGuard, shopbuddy };
