import { twoProportionCI } from "./existing/elevate";
import type { Experiment } from "./types";

/** Honest, computed experiment readout + ramp gating. */
export function readout(e: Experiment) {
  const ci = twoProportionCI(e.control.conversions, e.control.requests, e.treatment.conversions, e.treatment.requests);
  const sign = ci.diffPer1k >= 0 ? "+" : "−";
  const diff = `${sign}${Math.abs(ci.diffPer1k).toFixed(1)}`;
  const text = ci.crossesZero
    ? `${diff} observed difference · confidence interval crosses zero`
    : `${diff} per 1,000 · 95% CI ${ci.ciPer1k[0].toFixed(2)} to ${ci.ciPer1k[1].toFixed(2)}`;
  const verdict = ci.crossesZero ? "No conclusive uplift yet" : ci.diffPer1k > 0 ? "Conclusive uplift" : "Conclusive decline";
  const failing = e.guardrails.filter((g) => g.status !== "passed");
  const reasons = [
    ...(ci.crossesZero ? ["95% CI crosses zero (no conclusive uplift)"] : []),
    ...failing.map((g) => `Guardrail not passing: ${g.metric} (${g.label})`),
    ...(e.status === "paused" ? ["Pilot is paused"] : []),
  ];
  return { ci, text, verdict, canRamp: reasons.length === 0, rampBlockers: reasons };
}
