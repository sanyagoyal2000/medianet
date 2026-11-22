// Demo mode: env default (live if a key exists, else cached), overridden per browser by a `demo_mode` cookie.
export type DemoMode = "live" | "cached";

export function envMode(): DemoMode {
  const m = process.env.DEMO_MODE;
  if (m === "live" || m === "cached") return m;
  return process.env.ANTHROPIC_API_KEY ? "live" : "cached";
}

export const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

export async function getDemoMode(): Promise<DemoMode> {
  let mode = envMode();
  try {
    const { cookies } = await import("next/headers");
    const c = (await cookies()).get("demo_mode")?.value;
    if (c === "live" || c === "cached") mode = c;
  } catch {
    // outside a request (scripts): env only
  }
  return mode === "live" && !hasKey() ? "cached" : mode;
}
