import { getNextPath, type ResolvedPath } from "@/data/journey";

/**
 * Simulates async path pick (later: Supabase).
 * Resolves after `delayMs` so E1 can show when > 400ms.
 */
export async function pickPath(
  completedPaths: number[],
  delayMs = 500,
): Promise<ResolvedPath | undefined> {
  await new Promise((r) => setTimeout(r, delayMs));
  return getNextPath(completedPaths);
}
