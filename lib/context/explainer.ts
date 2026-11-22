// F4 Explainer (Haiku, cached). Reader-facing text never references the person.
import { z } from "zod";
import { runAgent, type AgentResult } from "../ai/run";
import { MODELS } from "../ai/models";
import { PROMPTS } from "../ai/prompts";
import type { Campaign, ContextProfile, Page } from "../types";
import type { MatchResult } from "./match";
import { lbl, purposeLabel, sensitiveLabel, toneLabel, topicLeaf } from "../labels";

export const ExplainSchema = z.object({ buyer: z.string(), reader: z.string() });
export type Explanation = z.infer<typeof ExplainSchema>;

export const PERSON_REF = /you visited|your history|based on you|near you|your location|your device|you recently/i;

const readerNoun = (p: Page, prof?: ContextProfile | null) => {
  const leaf = topicLeaf(p.topicPath).toLowerCase();
  if (prof?.purpose === "buying_guide") return leaf.endsWith(" gifts") ? `a ${leaf.replace(/ gifts$/, " gift")} guide` : `a ${leaf} buying guide`;
  if (prof?.purpose === "product_comparison") return `a ${leaf} product comparison`;
  return `about ${leaf}`;
};

/** Deterministic template (used offline and as the last-resort fallback). */
export function templateExplanation(page: Page, profile: ContextProfile | null | undefined, campaign: Pick<Campaign, "name">, m: Pick<MatchResult, "outcome" | "reasons" | "whyMatches">): Explanation {
  const noun = readerNoun(page, profile);
  if (m.outcome === "eligible") {
    return {
      buyer: `Eligible for ${campaign.name}: ${lbl(purposeLabel, profile?.purpose).toLowerCase()} on ${topicLeaf(page.topicPath).toLowerCase()}, ${lbl(toneLabel, profile?.tone).toLowerCase()} tone, no hard exclusion.`,
      reader: `Shown because this page is ${noun}. Paid placement.`,
    };
  }
  const sens = profile?.sensitive?.[0];
  const reason = m.reasons[0] ?? "Excluded";
  return {
    buyer: sens && reason.startsWith("Hard exclusion")
      ? `Excluded: page is ${lbl(sensitiveLabel, sens).toLowerCase().replace("product recalls", "a product recall")}; campaign excludes ${lbl(sensitiveLabel, sens).toLowerCase()}.`
      : `${m.outcome === "partner_tier" ? "Not served" : "Excluded"}: ${reason.toLowerCase()}.`,
    reader: `No ad from this campaign appears on this page because of its subject. Paid placements follow the page's context only.`,
  };
}

export async function explainDecision(
  args: { page: Page; profile: ContextProfile | null | undefined; campaign: Campaign; match: MatchResult },
  source: "ui" | "mcp" | "partner" = "ui",
): Promise<AgentResult<Explanation>> {
  const { page, profile, campaign, match } = args;
  const input = {
    page: { title: page.title, topic: page.topicPath, purpose: profile?.purpose ?? null, tone: profile?.tone ?? null, sensitive: profile?.sensitive ?? [] },
    campaign: { name: campaign.name, excludes: campaign.rules.excludeSensitive },
    outcome: match.outcome,
    reasons: match.outcome === "eligible" ? match.whyMatches : match.reasons,
  };
  const template = templateExplanation(page, profile, campaign, match);
  const call = () =>
    runAgent({
      agent: "explainer", model: MODELS.fast, system: PROMPTS.explainer, input, schema: ExplainSchema, source,
      fallback: () => template,
    });
  let res = await call();
  if (PERSON_REF.test(res.data.reader) && !res.cached) res = await call();
  if (PERSON_REF.test(res.data.reader)) res = { ...res, data: { ...res.data, reader: `Shown because this page is about ${topicLeaf(page.topicPath).toLowerCase()}. Paid placement.` } };
  return res;
}
