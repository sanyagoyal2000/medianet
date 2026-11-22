// SIMULATED: stands in for Media.net's existing system
// ELEVATE: conversion measurement for experiments, plus a two-proportion confidence interval.

/** 95% CI (normal approximation) for p2 - p1, reported per 1,000 requests. */
export function twoProportionCI(c1: number, n1: number, c2: number, n2: number, z = 1.96) {
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const diff = p2 - p1;
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const lo = diff - z * se;
  const hi = diff + z * se;
  return {
    ratePer1kControl: p1 * 1000,
    ratePer1kTreatment: p2 * 1000,
    diffPer1k: diff * 1000,
    ciPer1k: [lo * 1000, hi * 1000] as [number, number],
    crossesZero: lo <= 0 && hi >= 0,
    relativeLift: p1 > 0 ? diff / p1 : 0,
  };
}

export function conversions(exp: { control: { conversions: number }; treatment: { conversions: number } }) {
  return { control: exp.control.conversions, treatment: exp.treatment.conversions };
}
