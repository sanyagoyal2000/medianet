import type { Purpose, Tone, RequestPurpose, ProfileStatus } from "./types";

export const PURPOSES: Purpose[] = ["buying_guide", "product_comparison", "how_to", "news", "safety_report", "opinion", "entertainment", "other"];
export const TONES: Tone[] = ["upbeat", "practical", "neutral", "serious", "negative", "tragic", "satirical"];
export const SENSITIVE = ["recalls", "tragedy", "layoffs", "health", "financial_distress", "violence", "politics"] as const;

export const purposeLabel: Record<string, string> = {
  buying_guide: "Buying guide",
  product_comparison: "Comparison",
  how_to: "How-to",
  news: "News",
  safety_report: "Safety report",
  opinion: "Opinion",
  entertainment: "Entertainment",
  other: "Other",
};
export const toneLabel: Record<string, string> = {
  upbeat: "Upbeat", practical: "Practical", neutral: "Neutral", serious: "Serious",
  negative: "Negative", tragic: "Tragic", satirical: "Satirical",
};
export const sensitiveLabel: Record<string, string> = {
  recalls: "Product recalls", tragedy: "Tragedy", layoffs: "Layoffs", health: "Health conditions",
  financial_distress: "Financial distress", violence: "Violence", politics: "Politics",
};
export const statusLabel: Record<ProfileStatus, string> = {
  fresh: "Fresh", stale: "Stale", needs_review: "Needs review", unclassified: "Unclassified",
};
export const requestPurposeLabel: Record<RequestPurpose, string> = {
  human_facing: "Human-facing",
  ai_app: "AI-app request",
  crawler: "Crawler",
  buying_agent: "Buying agent",
  unknown: "Unknown",
  suspected_invalid: "Suspected invalid",
};
/** "Purpose" column wording on Traffic Intelligence. */
export const requestPurposeActivity: Record<RequestPurpose, string> = {
  human_facing: "Human audience",
  ai_app: "AI answer display",
  crawler: "Content retrieval",
  buying_agent: "Campaign planning",
  unknown: "Unknown",
  suspected_invalid: "Suspected invalid",
};

export const countryLabel: Record<string, string> = { US: "United States", GB: "United Kingdom", CA: "Canada" };

export const lbl = (map: Record<string, string>, v: string | null | undefined) => (v ? map[v] ?? v : "—");

/** "Shopping > Gifts > Holiday" -> "Shopping / Gifts" */
export const topicShort = (path: string) => path.split(" > ").slice(0, 2).join(" / ");
/** "Shopping > Gifts > Holiday" -> "Holiday gifts"-style leaf label */
export const topicLeaf = (path: string) => {
  const parts = path.split(" > ");
  if (parts.length >= 3 && parts[1] === "Gifts") return `${parts[2]} gifts`;
  return parts[parts.length - 1];
};
export const rqLabel = (id: string) => id.replace(/^RQ(\d+)/, "RQ-$1");
