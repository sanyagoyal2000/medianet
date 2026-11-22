// Seed JSON is imported (bundled), never read with fs at runtime.
import advertisers from "@/data/seed/advertisers.json";
import campaigns from "@/data/seed/campaigns.json";
import pages from "@/data/seed/pages.json";
import profiles from "@/data/seed/context_profiles.json";
import corrections from "@/data/seed/corrections.json";
import requests from "@/data/seed/requests.json";
import decisions from "@/data/seed/decisions.json";
import aiOffers from "@/data/seed/ai_offers.json";
import aiRules from "@/data/seed/ai_rules.json";
import experiments from "@/data/seed/experiments.json";
import agentRuns from "@/data/seed/agent_runs.json";
import dailyTraffic from "@/data/seed/daily_traffic.json";
import automation from "@/data/seed/automation_breakdown.json";
import meta from "@/data/seed/meta.json";
import type {
  Advertiser, AgentRun, AiOffer, AiRules, AutomationRow, Campaign, ContextProfile, Correction, DailyTraffic, Decision,
  Experiment, Meta, Page, TrafficRequest,
} from "../types";

export interface SeedData {
  advertisers: Advertiser[];
  campaigns: Campaign[];
  pages: Page[];
  profiles: ContextProfile[];
  corrections: Correction[];
  requests: TrafficRequest[];
  decisions: Decision[];
  aiOffers: AiOffer[];
  aiRules: AiRules[];
  experiments: Experiment[];
  agentRuns: AgentRun[];
  dailyTraffic: DailyTraffic[];
  automation: AutomationRow[];
  meta: Meta;
}

export const SEED = {
  advertisers, campaigns, pages, profiles, corrections, requests, decisions, aiOffers, aiRules, experiments, agentRuns,
  dailyTraffic, automation, meta,
} as unknown as SeedData;

export const cloneSeed = (): SeedData => structuredClone(SEED);
