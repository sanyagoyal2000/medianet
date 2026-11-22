// SIMULATED: stands in for Media.net's existing system
// Deals Desk: reach forecasts and the deal-request queue. Context Studio only ever files DRAFT requests.

export const FILL_RATE = 0.82;
export const FORECAST_BASIS = "Historical estimate, not guaranteed delivery";

export function forecast(spec: { pages: { trafficPerDay: number }[]; days?: number }) {
  const days = spec.days ?? 7;
  const point = spec.pages.reduce((s, p) => s + p.trafficPerDay, 0) * days * FILL_RATE;
  return {
    point: Math.round(point),
    low: Math.round(point * 0.9),
    high: Math.round(point * 1.1),
    days,
    basis: FORECAST_BASIS,
  };
}

let counter = 0;
/** Files a draft deal request. Nothing activates spend; a human approves in Deals Desk. */
export function createDealRequest(draft: { campaignId: string; name: string }) {
  counter += 1;
  const n = 4100 + ((Date.now() / 1000) % 800 | 0) + counter;
  return { dealRequestId: `DR-${n}`, status: "draft" as const, campaignId: draft.campaignId, name: draft.name };
}

export function fmtReach(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
