// ShopBuddy assistant (partner side, Sonnet). Never mentions brands, retailers, ads or sponsors.
import type Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "../ai/models";
import { PROMPTS } from "../ai/prompts";
import { callText, logRun } from "../ai/run";
import { getDemoMode } from "../ai/mode";
import { lookupCache } from "../ai/cache";

export function cannedAnswer(q: string): string {
  const t = q.toLowerCase();
  if (/recall/.test(t)) return "Check the toy's tag for the lot number and compare it with the official recall notice. If it matches, stop using it, remove the batteries and return it for a refund. Most stores accept recalled items without a receipt.";
  if (/lost (my|our) job|laid off/.test(t)) return "I'm sorry, that's a hard time. Start with a simple total you can cover without credit, then focus on low-cost gifts: homemade treats, shared experiences or a heartfelt note. Most people value the thought far more than the price.";
  if (/cook/.test(t)) return "For a sister who loves cooking: an instant-read thermometer, a sharp chef's knife, a heavy sheet pan or a set of linen kitchen towels. All are under $50 and get used every week.";
  if (/gift|present/.test(t)) return "Consider a desk organizer, insulated mug or compact charger. Each is useful every day, easy to wrap and comfortably under $50.";
  return "Happy to help! Tell me who you're shopping for and your budget, and I'll suggest a few practical ideas.";
}

export async function shopbuddyAnswer(messages: { role: "user" | "assistant"; content: string }[]) {
  const t0 = Date.now();
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const mode = await getDemoMode();
  if (mode === "live") {
    try {
      const answer = await callText({ model: MODELS.planner, system: PROMPTS.shopbuddy, messages: messages.slice(-8) as Anthropic.MessageParam[], maxTokens: 400 });
      await logRun({ agent: "shopbuddy", model: MODELS.planner, source: "partner", input: { last }, output: { answer }, latencyMs: Date.now() - t0, cached: false });
      return { answer, cached: false };
    } catch {
      // fall through to cache
    }
  }
  const hit = lookupCache("shopbuddy", { last }, { exactOnly: true });
  const answer = (hit?.output as { answer?: string } | undefined)?.answer ?? cannedAnswer(last);
  await logRun({ agent: "shopbuddy", model: MODELS.planner, source: "partner", input: { last }, output: { answer }, latencyMs: Date.now() - t0, cached: true });
  return { answer, cached: true };
}
