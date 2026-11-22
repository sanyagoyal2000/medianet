// Domain types shared by the repo, agents, API routes and UI.

export type Purpose =
  | "buying_guide" | "product_comparison" | "how_to" | "news" | "safety_report" | "opinion" | "entertainment" | "other";
export type Tone = "upbeat" | "practical" | "neutral" | "serious" | "negative" | "tragic" | "satirical";
export type Sensitive = "recalls" | "tragedy" | "layoffs" | "health" | "financial_distress" | "violence" | "politics";
export type ProfileStatus = "fresh" | "stale" | "needs_review" | "unclassified";

export interface Advertiser { id: string; name: string }

export interface CampaignRules {
  topics: string[];
  purposes: string[];
  tonePreference: string[];
  excludeSensitive: string[];
  country: string;
  partnerTierMax: number;
  maxPriceHint?: string;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  status: "draft" | "in_review" | "live";
  source: "ui" | "mcp";
  brief: string;
  rules: CampaignRules;
  budget?: string;
  flight?: string;
  bidCpm: number;
  aiChannels: boolean;
  dealRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  url: string;
  site: string;
  title: string;
  text: string;
  topicPath: string;
  partnerTier: number;
  country: string;
  trafficPerDay: number;
  shortTitle?: string;
}

export interface Evidence { field: "purpose" | "tone"; quote: string }

export interface ContextProfile {
  pageId: string;
  purpose: Purpose | null;
  tone: Tone | null;
  confidence: number;
  sensitive: Sensitive[];
  evidence: Evidence[];
  status: ProfileStatus;
  classifiedAt: string;
  version: number;
  cached?: boolean;
}

export interface Correction {
  id: string;
  pageId: string;
  field: "purpose" | "tone";
  from: string;
  to: string;
  note: string;
  status: "open" | "approved" | "rejected";
  createdAt: string;
}

export type RequestPurpose =
  | "human_facing" | "ai_app" | "crawler" | "buying_agent" | "unknown" | "suspected_invalid";
export type Confidence = "High" | "Medium" | "Low";

export interface TrafficRequest {
  id: string;
  ts: string;
  source: string;
  pageId: string | null;
  userAgent: string;
  headers: Record<string, string>;
  ivtScore: number;
  declaredIdentity: string;
  purpose: RequestPurpose;
  confidence: Confidence;
  audienceExposure: string;
  channel: "Web" | "ShopBuddy" | "MCP";
  kind?: string;
  contextLabel?: string;
  simulated?: boolean;
  review?: { status: "open" | "confirmed_unknown" | "reclassified"; to?: RequestPurpose; note?: string } | null;
}

export interface DecisionStep { label: string; at: string; ok: boolean; detail?: string }

export interface Decision {
  id: string;
  requestId: string;
  campaignId: string | null;
  outcome: string;
  steps: DecisionStep[];
  appliedRule: RequestPurpose;
  billable: boolean;
  contentAccess: string;
  adDisplayed: string;
  reasonBuyer: string;
  reasonReader: string;
  routedMs: number;
}

export interface AiOffer {
  id: string;
  appId: string;
  scenario: string;
  turnSummary: string;
  campaignId: string | null;
  displayToken: string | null;
  returned: boolean;
  displayed: boolean;
  clicked: boolean;
  reasonReader: string;
  reason?: string | null;
  checks?: { label: string; ok: boolean }[];
  requestId?: string | null;
  createdAt: string;
}

export interface AiRules {
  appId: string;
  format: string;
  contextsAllowed: string[];
  frequency: string;
  approvedAssetsOnly: boolean;
  disclosure: string;
  sensitivePolicy: string;
}

export interface Experiment {
  id: string;
  name: string;
  status: "running" | "paused";
  from: string;
  to: string;
  control: { requests: number; conversions: number; cpa: number; filtered: number; fill: number };
  treatment: { requests: number; conversions: number; cpa: number; filtered: number; fill: number; p99Ms: number; severe: number };
  guardrails: { metric: string; control: string; treatment: string; status: "passed" | "watch"; label: string }[];
  reconciliation: { label: string; amount: number; detail: string }[];
  rollout: { stage: "Shadow" | "Pilot" | "Ramp"; state: "done" | "current" | "pending" }[];
}

export interface AgentRun {
  id: string;
  agent: string;
  model: string;
  source: "ui" | "mcp" | "partner" | "script";
  input: unknown;
  output: unknown;
  latencyMs: number;
  cached: boolean;
  createdAt: string;
}

export interface DailyTraffic { date: string; humanFacing: number; automated: number; unknown: number }
export interface AutomationRow { type: string; requests: number; share: number }

/** Baselines that represent Media.net's wider inventory (the seeded pages are a sample of it). */
export interface Meta {
  coverageBaseline: { fresh: number; stale: number; unclassified: number; needs_review: number };
  aiFunnelBaseline: { requests: number; offers: number; displays: number; clicks: number };
  contextualDelivery: { rows: { context: string; share: number }[]; trend: { date: string; share: number }[] };
  activeCampaignsBaseline: number;
}
