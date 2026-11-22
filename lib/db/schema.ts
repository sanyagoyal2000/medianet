// Drizzle Postgres schema (Neon). Column keys match the TS domain types in lib/types.ts.
import { pgTable, text, integer, doublePrecision, boolean, jsonb } from "drizzle-orm/pg-core";

export const advertisers = pgTable("advertisers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  advertiserId: text("advertiser_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  source: text("source").notNull(),
  brief: text("brief").notNull().default(""),
  rules: jsonb("rules").notNull(),
  budget: text("budget"),
  flight: text("flight"),
  bidCpm: doublePrecision("bid_cpm").notNull(),
  aiChannels: boolean("ai_channels").notNull().default(false),
  dealRequestId: text("deal_request_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pages = pgTable("pages", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  site: text("site").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  topicPath: text("topic_path").notNull(),
  partnerTier: integer("partner_tier").notNull(),
  country: text("country").notNull(),
  trafficPerDay: integer("traffic_per_day").notNull(),
  shortTitle: text("short_title"),
});

export const contextProfiles = pgTable("context_profiles", {
  pageId: text("page_id").primaryKey(),
  purpose: text("purpose"),
  tone: text("tone"),
  confidence: doublePrecision("confidence").notNull(),
  sensitive: jsonb("sensitive").notNull(),
  evidence: jsonb("evidence").notNull(),
  status: text("status").notNull(),
  classifiedAt: text("classified_at").notNull(),
  version: integer("version").notNull(),
  cached: boolean("cached"),
});

export const corrections = pgTable("corrections", {
  id: text("id").primaryKey(),
  pageId: text("page_id").notNull(),
  field: text("field").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  note: text("note").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const requests = pgTable("requests", {
  id: text("id").primaryKey(),
  ts: text("ts").notNull(),
  source: text("source").notNull(),
  pageId: text("page_id"),
  userAgent: text("user_agent").notNull(),
  headers: jsonb("headers").notNull(),
  ivtScore: doublePrecision("ivt_score").notNull(),
  declaredIdentity: text("declared_identity").notNull(),
  purpose: text("purpose").notNull(),
  confidence: text("confidence").notNull(),
  audienceExposure: text("audience_exposure").notNull(),
  channel: text("channel").notNull(),
  kind: text("kind"),
  contextLabel: text("context_label"),
  simulated: boolean("simulated"),
  review: jsonb("review"),
});

export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull(),
  campaignId: text("campaign_id"),
  outcome: text("outcome").notNull(),
  steps: jsonb("steps").notNull(),
  appliedRule: text("applied_rule").notNull(),
  billable: boolean("billable").notNull(),
  contentAccess: text("content_access").notNull(),
  adDisplayed: text("ad_displayed").notNull(),
  reasonBuyer: text("reason_buyer").notNull(),
  reasonReader: text("reason_reader").notNull(),
  routedMs: doublePrecision("routed_ms").notNull(),
});

export const aiOffers = pgTable("ai_offers", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull(),
  scenario: text("scenario").notNull(),
  turnSummary: text("turn_summary").notNull(),
  campaignId: text("campaign_id"),
  displayToken: text("display_token"),
  returned: boolean("returned").notNull(),
  displayed: boolean("displayed").notNull(),
  clicked: boolean("clicked").notNull(),
  reasonReader: text("reason_reader").notNull(),
  reason: text("reason"),
  checks: jsonb("checks"),
  requestId: text("request_id"),
  createdAt: text("created_at").notNull(),
});

export const aiRules = pgTable("ai_rules", {
  appId: text("app_id").primaryKey(),
  format: text("format").notNull(),
  contextsAllowed: jsonb("contexts_allowed").notNull(),
  frequency: text("frequency").notNull(),
  approvedAssetsOnly: boolean("approved_assets_only").notNull(),
  disclosure: text("disclosure").notNull(),
  sensitivePolicy: text("sensitive_policy").notNull(),
});

export const experiments = pgTable("experiments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  control: jsonb("control").notNull(),
  treatment: jsonb("treatment").notNull(),
  guardrails: jsonb("guardrails").notNull(),
  reconciliation: jsonb("reconciliation").notNull(),
  rollout: jsonb("rollout").notNull(),
});

export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),
  agent: text("agent").notNull(),
  model: text("model").notNull(),
  source: text("source").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  latencyMs: integer("latency_ms").notNull(),
  cached: boolean("cached").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dailyTraffic = pgTable("daily_traffic", {
  date: text("date").primaryKey(),
  humanFacing: integer("human_facing").notNull(),
  automated: integer("automated").notNull(),
  unknown: integer("unknown").notNull(),
});

export const automationBreakdown = pgTable("automation_breakdown", {
  type: text("type").primaryKey(),
  requests: integer("requests").notNull(),
  share: doublePrecision("share").notNull(),
});

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
