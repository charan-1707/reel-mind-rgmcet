import type { Reel } from "./reels";

export type Action = "watched" | "liked" | "skipped" | "rec_up" | "rec_down";

export type Interaction = {
  id: string;
  reelId: string;
  action: Action;
  at: number;
};

export const ACTION_WEIGHTS: Record<Action, number> = {
  watched: 1,
  liked: 2.5,
  skipped: -0.6,
  rec_up: 1.6,
  rec_down: -1.4,
};

export const ACTION_LABEL: Record<Action, string> = {
  watched: "Watched to the end",
  liked: "Liked",
  skipped: "Skipped",
  rec_up: "Marked useful",
  rec_down: "Marked not relevant",
};

export const INTEREST_MIN = -4;
export const INTEREST_MAX = 12;
const SECONDARY_TAG_DECAY = 0.6;

export type Interests = Record<string, number>;

function applyInteraction(interests: Interests, reel: Reel, action: Action): Interests {
  const weight = ACTION_WEIGHTS[action];
  const next = { ...interests };
  reel.tags.forEach((tag, i) => {
    const decay = i === 0 ? 1 : SECONDARY_TAG_DECAY;
    next[tag] = Math.max(
      INTEREST_MIN,
      Math.min(INTEREST_MAX, (next[tag] ?? 0) + weight * decay),
    );
  });
  return next;
}

/** Interest weights derived from the full interaction history (oldest first). */
export function computeInterests(interactions: Interaction[], reels: Reel[]): Interests {
  const byId = new Map(reels.map((r) => [r.id, r]));
  return [...interactions]
    .sort((a, b) => a.at - b.at)
    .reduce<Interests>((acc, i) => {
      const reel = byId.get(i.reelId);
      return reel ? applyInteraction(acc, reel, i.action) : acc;
    }, {});
}

/** Cumulative interest snapshot after each interaction — used by the dashboard chart. */
export function interestTimeline(
  interactions: Interaction[],
  reels: Reel[],
): Interests[] {
  const byId = new Map(reels.map((r) => [r.id, r]));
  const out: Interests[] = [];
  let acc: Interests = {};
  for (const i of [...interactions].sort((a, b) => a.at - b.at)) {
    const reel = byId.get(i.reelId);
    if (!reel) continue;
    acc = applyInteraction(acc, reel, i.action);
    out.push(acc);
  }
  return out;
}

export function topInterests(interests: Interests, n = 6): [string, number][] {
  return Object.entries(interests)
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function recFeedbackMap(interactions: Interaction[]): Record<string, "up" | "down"> {
  const out: Record<string, "up" | "down"> = {};
  for (const i of [...interactions].sort((a, b) => a.at - b.at)) {
    if (i.action === "rec_up") out[i.reelId] = "up";
    if (i.action === "rec_down") out[i.reelId] = "down";
  }
  return out;
}

export function seenReelIds(interactions: Interaction[]): string[] {
  return [
    ...new Set(
      interactions.filter((i) => i.action !== "rec_up" && i.action !== "rec_down").map((i) => i.reelId),
    ),
  ];
}

export type Scored = {
  reel: Reel;
  score: number;
  match: number;
  reason: string;
};

export type RankInput = {
  reels: Reel[];
  interactions: Interaction[];
  exclude?: string[];
};

/** Deterministic ranking: tag affinity + explicit feedback + novelty bonus. */
export function rankReels({ reels, interactions, exclude = [] }: RankInput): Scored[] {
  const interests = computeInterests(interactions, reels);
  const feedback = recFeedbackMap(interactions);
  const seen = new Set(seenReelIds(interactions));
  const max = Math.max(1, ...Object.values(interests).map(Math.abs));

  return reels
    .filter((r) => !exclude.includes(r.id))
    .map((reel) => {
      let raw = 0;
      let top = reel.tags[0] ?? "";
      let topVal = -Infinity;
      reel.tags.forEach((tag, i) => {
        const v = interests[tag] ?? 0;
        raw += v * (i === 0 ? 1 : 0.65);
        if (v > topVal) {
          topVal = v;
          top = tag;
        }
      });
      const fb = feedback[reel.id];
      if (fb === "down") raw -= 6;
      if (fb === "up") raw += 2;
      const novelty = seen.has(reel.id) ? -2.5 : 0.8;
      const score = raw / max + novelty * 0.35;
      const match = Math.round(
        Math.max(4, Math.min(99, 50 + (raw / max) * 22 + novelty * 4)),
      );
      const reason =
        fb === "down"
          ? "Down-ranked from your feedback"
          : topVal > 0.5
            ? `You keep watching ${top} reels`
            : interactions.length === 0
              ? "Popular starting point"
              : "Exploring outside your usual mix";
      return { reel, score, match, reason };
    })
    .sort((a, b) => b.score - a.score || a.reel.id.localeCompare(b.reel.id));
}
