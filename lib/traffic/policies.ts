import type { RequestPurpose } from "../types";

export interface RoutingPolicy {
  type: RequestPurpose;
  label: string;
  decision: string;
  pill: "green" | "amber" | "red";
  billable: string;
  contentAccess: string;
  explanation: string;
}

/** F2 routing policy table (data, not code paths). */
export const ROUTING_POLICIES: RoutingPolicy[] = [
  { type: "human_facing", label: "Human-facing", decision: "Advertising checks", pill: "green", billable: "Yes, after checks", contentAccess: "n/a",
    explanation: "Run standard ad eligibility and delivery checks for human audience display." },
  { type: "ai_app", label: "AI-app request", decision: "Confirm actual display", pill: "amber", billable: "Only after display confirmation", contentAccess: "n/a",
    explanation: "Validate whether the request results in an actual ad display before billing." },
  { type: "crawler", label: "Crawler", decision: "Content policy", pill: "green", billable: "No", contentAccess: "Per publisher policy",
    explanation: "Allow content retrieval per publisher policy; do not generate an ad impression." },
  { type: "buying_agent", label: "Buying agent", decision: "Planning only", pill: "green", billable: "No", contentAccess: "No",
    explanation: "Allow content for shopping or product research; treat as planning, not ad display." },
  { type: "unknown", label: "Unknown", decision: "Configured review", pill: "amber", billable: "Never as human", contentAccess: "No",
    explanation: "Route to a configured review for classification when intent or exposure is unclear." },
  { type: "suspected_invalid", label: "Suspected invalid", decision: "Exclude", pill: "red", billable: "No", contentAccess: "No",
    explanation: "Block from ad delivery and billing when the request is invalid or policy-violating." },
];

export const policyFor = (t: RequestPurpose) => ROUTING_POLICIES.find((p) => p.type === t)!;
