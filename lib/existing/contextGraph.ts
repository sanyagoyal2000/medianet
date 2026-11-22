// SIMULATED: stands in for Media.net's existing system
// ContextGraph: Media.net's topic taxonomy (7M+ topics in production; ~40 nodes here).
// Context Studio never changes a page's topic; it only reads it.

import type { Page } from "../types";

export const TAXONOMY: { path: string; keywords: string[] }[] = [
  { path: "Shopping", keywords: ["shopping", "buy", "store"] },
  { path: "Shopping > Gifts", keywords: ["gift", "gifts", "present", "presents", "gift guide", "gift guides"] },
  { path: "Shopping > Gifts > Holiday", keywords: ["holiday gift", "holiday", "christmas", "stocking"] },
  { path: "Shopping > Gifts > Kids", keywords: ["kids gift", "toys", "children"] },
  { path: "Shopping > Home & Office", keywords: ["desk", "home office", "office", "chair", "workspace"] },
  { path: "Shopping > Home & Kitchen", keywords: ["kitchen", "coffee maker", "appliance", "cookware"] },
  { path: "Shopping > Electronics", keywords: ["electronics", "gadget", "gadgets", "tech", "product comparisons", "comparisons"] },
  { path: "Shopping > Electronics > Chargers", keywords: ["charger", "chargers", "usb-c"] },
  { path: "Shopping > Electronics > Audio", keywords: ["earbuds", "headphones", "speaker", "audio"] },
  { path: "Shopping > Electronics > Computers", keywords: ["laptop", "computer", "black friday"] },
  { path: "Shopping > Deals", keywords: ["deal", "deals", "sale", "discount", "under $50"] },
  { path: "Shopping > Product Safety", keywords: ["recall", "safety", "hazard"] },
  { path: "Technology", keywords: ["technology"] },
  { path: "Technology > Phones", keywords: ["phone", "smartphone"] },
  { path: "Technology > Software", keywords: ["software", "app", "apps"] },
  { path: "News", keywords: ["news"] },
  { path: "News > Business", keywords: ["business", "economy"] },
  { path: "News > Business > Retail", keywords: ["retail", "retailer", "layoffs", "shipping"] },
  { path: "News > Local", keywords: ["local", "community", "fire"] },
  { path: "News > Politics", keywords: ["politics", "election"] },
  { path: "Travel", keywords: ["travel", "trip", "vacation"] },
  { path: "Travel > Flights", keywords: ["flight", "flights", "airfare", "airline"] },
  { path: "Travel > Winter Trips", keywords: ["ski", "snow", "winter trip", "cabin"] },
  { path: "Travel > Hotels", keywords: ["hotel", "hotels", "stay"] },
  { path: "Finance", keywords: ["finance", "money"] },
  { path: "Finance > Personal Budgeting", keywords: ["budget", "budgeting", "saving"] },
  { path: "Finance > Credit Cards", keywords: ["credit card", "rewards", "cashback"] },
  { path: "Finance > Debt", keywords: ["debt", "loan", "collections"] },
  { path: "Food & Drink", keywords: ["food", "cooking", "cook"] },
  { path: "Food & Drink > Baking", keywords: ["baking", "cookies", "bake"] },
  { path: "Food & Drink > Recipes", keywords: ["recipe", "recipes", "roast", "dinner"] },
  { path: "Family & Parenting", keywords: ["parenting", "family"] },
  { path: "Family & Parenting > Kids", keywords: ["kids", "screen time", "winter break"] },
  { path: "Health", keywords: ["health"] },
  { path: "Health > Conditions", keywords: ["flu", "symptoms", "doctor", "illness"] },
  { path: "Health > Fitness", keywords: ["workout", "fitness", "exercise"] },
  { path: "Home & Garden", keywords: ["garden", "gardening", "yard"] },
  { path: "Entertainment", keywords: ["entertainment"] },
  { path: "Entertainment > Humor", keywords: ["satire", "humor", "funny", "comedy"] },
  { path: "Entertainment > Movies", keywords: ["movie", "movies", "film"] },
];

export const ALL_TOPICS = TAXONOMY.map((t) => t.path);

/** Keyword match against the taxonomy. Returns topic paths, most specific first. */
export function topicsFor(query: string): string[] {
  const q = query.toLowerCase();
  const hits = TAXONOMY.filter((t) => t.keywords.some((k) => q.includes(k)) || q.includes(t.path.toLowerCase()));
  return hits.map((h) => h.path).sort((a, b) => b.split(">").length - a.split(">").length);
}

/** The topic ContextGraph already assigned to a page. */
export function topicOf(page: Pick<Page, "topicPath" | "title" | "text">): string {
  if (page.topicPath) return page.topicPath;
  return topicsFor(`${page.title} ${page.text.slice(0, 1500)}`)[0] ?? "Other";
}

export function isTopic(path: string) {
  return ALL_TOPICS.includes(path);
}
