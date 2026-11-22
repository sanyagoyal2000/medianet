import { z } from "zod";
import { PURPOSES, TONES, SENSITIVE } from "../labels";

/** Targeting spec = campaigns.rules shape. */
export const SpecSchema = z.object({
  topics: z.array(z.string()).describe("ContextGraph topic paths, e.g. 'Shopping > Gifts'. Only use paths returned by contextgraph_topics."),
  purposes: z.array(z.enum(PURPOSES as [string, ...string[]])).describe("Page purposes to target (preference expressed as targeting)"),
  tonePreference: z.array(z.enum(TONES as [string, ...string[]])).describe("Preferred tones. Ranking only; never excludes"),
  excludeSensitive: z.array(z.enum(SENSITIVE as unknown as [string, ...string[]])).describe("HARD exclusions"),
  country: z.string().describe("ISO country code, e.g. US"),
  partnerTierMax: z.number().describe("Max publisher partner tier, 1-3"),
  maxPriceHint: z.string().optional().describe("Price hint from the brief (creative/landing-page note, not a page filter)"),
});
export type Spec = z.infer<typeof SpecSchema>;

export const DEFAULT_SPEC: Spec = {
  topics: [], purposes: [], tonePreference: [], excludeSensitive: [], country: "US", partnerTierMax: 1,
};

export function normalizeSpec(s: Partial<Spec> | undefined): Spec {
  return {
    ...DEFAULT_SPEC,
    ...(s ?? {}),
    partnerTierMax: Math.min(3, Math.max(1, Math.round(Number(s?.partnerTierMax ?? 1)))),
    country: (s?.country ?? "US").toUpperCase().slice(0, 2),
  };
}
