// F2 Traffic Router. Deterministic rules only, no LLM. Must run well under 5 ms.
// Requester != audience. Unknown is never billed as human.

import registry from "@/data/seed/agent-registry.json";
import type { Campaign, Confidence, ContextProfile, Decision, DecisionStep, Page, RequestPurpose } from "../types";
import { ivtScore, declaredIdentity } from "../existing/partnerSignals";
import { evaluate } from "../context/match";
import type { TfIdf } from "../context/tfidf";
import { policyFor } from "./policies";
import { lbl, purposeLabel, sensitiveLabel, topicLeaf } from "../labels";

export interface RouteInput {
  id: string;
  ts: string; // ISO
  userAgent: string;
  headers: Record<string, string>;
  pageId: string | null;
}

export interface RouteContext {
  page?: Page | null;
  profile?: ContextProfile | null;
  campaign?: Campaign | null;
  idx?: TfIdf;
  /** Seed generator uses fixed gaps between step timestamps; live routing uses measured time. */
  stepGapMs?: number;
}

export interface RouteResult {
  purpose: RequestPurpose;
  confidence: Confidence;
  ivtScore: number;
  declaredIdentity: string;
  identityLabel: string;
  audienceExposure: string;
  decision: Omit<Decision, "id" | "requestId">;
  wba: WbaCheck;
}

type WbaCheck = { present: boolean; valid: boolean; agent?: (typeof registry.agents)[number]; problem?: string };

const lower = (h: Record<string, string>) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));

/** Web Bot Auth: check header structure + registry only ("verification simulated"). */
export function checkWebBotAuth(headers: Record<string, string>): WbaCheck {
  const h = lower(headers);
  const agentHdr = h["signature-agent"], input = h["signature-input"], sig = h["signature"];
  if (!agentHdr && !input && !sig) return { present: false, valid: false };
  if (!agentHdr || !input || !sig) return { present: true, valid: false, problem: "Missing Web Bot Auth header" };
  const label = input.match(/^([a-z0-9_-]+)=\(/i)?.[1];
  const keyid = input.match(/keyid="([^"]+)"/)?.[1];
  const tagOk = /tag="web-bot-auth"/.test(input);
  const sigOk = !!label && new RegExp(`^${label}=:[A-Za-z0-9+/=_-]+:$`).test(sig.trim());
  if (!label || !keyid || !tagOk || !sigOk) return { present: true, valid: false, problem: "Malformed signature headers" };
  const agentUrl = agentHdr.replace(/"/g, "");
  const agent = registry.agents.find((a) => a.keyId === keyid && a.signatureAgent === agentUrl);
  if (!agent) return { present: true, valid: false, problem: "Agent not in registry" };
  return { present: true, valid: true, agent };
}

const isBrowserUA = (ua: string) => /Mozilla\/5\.0 .*(Chrome|Safari|Firefox|Edg)\//.test(ua) && !/Headless|bot|crawler|spider|python|curl|Go-http/i.test(ua);

export function classify(input: RouteInput) {
  const h = lower(input.headers);
  const ivt = ivtScore(input);
  const identity = declaredIdentity(input);
  const wba = checkWebBotAuth(input.headers);
  const app = h["x-ai-app-id"] ? registry.aiApps.find((a) => a.appId === h["x-ai-app-id"]) : undefined;

  let purpose: RequestPurpose;
  let confidence: Confidence;
  let identityLabel: string;
  if (ivt > 0.8) {
    purpose = "suspected_invalid"; confidence = ivt >= 0.9 ? "High" : "Medium"; identityLabel = "Suspected automation";
  } else if (wba.valid && wba.agent) {
    purpose = wba.agent.type === "buying_agent" ? "buying_agent" : "crawler"; confidence = "High";
    identityLabel = wba.agent.type === "buying_agent" ? "Declared buying agent" : "Declared crawler";
  } else if (app) {
    purpose = "ai_app"; confidence = "Medium"; identityLabel = `Registered AI app (${app.name})`;
  } else if (isBrowserUA(input.userAgent) && ivt < 0.3 && !h["x-automation"] && !wba.present && h["accept-language"]) {
    purpose = "human_facing"; confidence = ivt <= 0.1 && h["sec-fetch-mode"] ? "High" : "Medium"; identityLabel = "Browser (no agent declared)";
  } else {
    purpose = "unknown"; confidence = "Low"; identityLabel = wba.problem ? `Unverified (${wba.problem.toLowerCase()})` : "None declared";
  }
  return { purpose, confidence, ivt, identity, identityLabel, wba, app };
}

const EXPOSURE: Record<RequestPurpose, string> = {
  human_facing: "Observed (browser render)",
  ai_app: "Pending display confirmation",
  crawler: "Not observed",
  buying_agent: "Not observed (planning)",
  unknown: "Unverified",
  suspected_invalid: "Not credible",
};

export function route(input: RouteInput, ctx: RouteContext = {}): RouteResult {
  const t0 = performance.now();
  const c = classify(input);
  const base = Date.parse(input.ts);
  const steps: DecisionStep[] = [];
  const gap = ctx.stepGapMs;
  const add = (label: string, ok: boolean, detail?: string) => {
    const offset = gap != null ? steps.length * gap : Math.max(0, performance.now() - t0) + steps.length * 0.05;
    steps.push({ label, ok, detail, at: new Date(base + offset).toISOString() });
  };
  const policy = policyFor(c.purpose);

  add("Identity assessed", c.purpose !== "suspected_invalid" && c.purpose !== "unknown",
    `${c.identityLabel} · IVT ${c.ivt.toFixed(2)} (existing verification partner)${c.wba.present ? " · Web Bot Auth: verification simulated" : ""}`);

  let outcome = "", billable = false, contentAccess = "No", adDisplayed = "No";
  let reasonBuyer = "", reasonReader = "";
  let campaignId: string | null = null;
  const page = ctx.page, profile = ctx.profile, campaign = ctx.campaign;
  const ctxLabel = page ? `${topicLeaf(page.topicPath)} · ${lbl(purposeLabel, profile?.purpose)}` : "No page context";

  switch (c.purpose) {
    case "human_facing": {
      add("Request purpose: human-facing", true, "Browser render, low IVT, no automation flags");
      if (page && campaign) {
        campaignId = campaign.id;
        const m = evaluate(page, profile, campaign, "context_studio", { idx: ctx.idx });
        add("Context matched", true, ctxLabel);
        if (m.outcome === "eligible") {
          add("Advertising checks passed", true, m.whyMatches.join(" · "));
          add("Ad displayed · billable impression", true, "Human-facing display confirmed by render beacon");
          outcome = "Ad displayed"; billable = true; adDisplayed = "Yes";
          reasonBuyer = `Eligible: ${m.whyMatches.slice(0, 2).join("; ")}.`;
          reasonReader = `Shown because this page is about ${topicLeaf(page.topicPath).toLowerCase()}. Paid placement.`;
        } else {
          add("Advertising checks", false, m.reasons[0]);
          add("Campaign excluded · no impression", true, "Other campaigns may still compete");
          outcome = "Campaign excluded"; adDisplayed = "No (campaign excluded)";
          const sens = profile?.sensitive?.[0];
          reasonBuyer = `Excluded: ${m.reasons[0]}${sens ? ` (page is ${lbl(sensitiveLabel, sens).toLowerCase()})` : ""}.`;
          reasonReader = "No ad from this campaign was shown on this page.";
        }
      } else {
        add("Context matched", !!page, ctxLabel);
        add("Advertising checks passed", true, "No campaign candidate in this demo request");
        outcome = "Ad displayed"; billable = true; adDisplayed = "Yes";
        reasonBuyer = "Eligible human-facing request."; reasonReader = "Shown because of this page's content. Paid placement.";
      }
      contentAccess = "n/a";
      break;
    }
    case "ai_app": {
      add("Request purpose: AI-app request", true, "Registered partner app via x-ai-app-id");
      add("Placement guard: consent, context, frequency", true, "Turn summary only, never the full conversation");
      add("Awaiting display confirmation", true, "Offer returned; not an impression until displayed");
      outcome = "Awaiting display"; adDisplayed = "Pending confirmation"; contentAccess = "n/a";
      campaignId = campaign?.id ?? null;
      reasonBuyer = "Offer returned to AI app; billable only after display confirmation.";
      reasonReader = "Matched to this shopping question. Paid placement.";
      break;
    }
    case "crawler": {
      add("Context matched", true, ctxLabel);
      add("Publisher access policy checked", true, "Content retrieval allowed per publisher policy");
      add("Advertising billing excluded", true, "Crawler identity is not a human audience");
      outcome = "No ad impression"; contentAccess = "Follow publisher policy";
      campaignId = campaign?.id ?? null;
      reasonBuyer = `No ad impression: ${c.wba.agent?.name ?? "crawler"} is retrieving content, not displaying ads.`;
      reasonReader = "";
      break;
    }
    case "buying_agent": {
      add("Request purpose: campaign planning", true, `${c.wba.agent?.name ?? "Buying agent"} via MCP · read & draft only`);
      add("Planning only · no ad display", true, "Agent identity does not establish human exposure");
      add("Advertising billing excluded", true);
      outcome = "Planning only"; contentAccess = "No";
      reasonBuyer = "Planning request from a buyer's agent; not an ad opportunity.";
      break;
    }
    case "unknown": {
      add("Request purpose unclear", false, "No browser signals and no registered identity");
      add("Routed to configured review", true, "Unknown does not mean human");
      add("Advertising billing excluded", true, "Never billed as human");
      outcome = "Review required";
      reasonBuyer = "Unknown requester; held for configured review and never billed as human.";
      break;
    }
    case "suspected_invalid": {
      add("Invalid traffic signal", false, `IVT ${c.ivt.toFixed(2)} > 0.80 threshold`);
      add("Excluded from ad delivery", true);
      add("Advertising billing excluded", true);
      outcome = "Excluded";
      reasonBuyer = `Excluded: suspected invalid traffic (IVT ${c.ivt.toFixed(2)}).`;
      break;
    }
  }

  const routedMs = Number((performance.now() - t0).toFixed(2));
  return {
    purpose: c.purpose,
    confidence: c.confidence,
    ivtScore: c.ivt,
    declaredIdentity: c.identity,
    identityLabel: c.identityLabel,
    audienceExposure: EXPOSURE[c.purpose],
    wba: c.wba,
    decision: {
      campaignId,
      outcome,
      steps,
      appliedRule: c.purpose,
      billable,
      contentAccess,
      adDisplayed,
      reasonBuyer: reasonBuyer || policy.explanation,
      reasonReader,
      routedMs: Math.max(routedMs, 0.05),
    },
  };
}
