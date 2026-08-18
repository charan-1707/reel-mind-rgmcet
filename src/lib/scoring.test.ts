import { describe, expect, it } from "vitest";
import type { Reel } from "./reels";
import {
  ACTION_WEIGHTS,
  INTEREST_MAX,
  INTEREST_MIN,
  computeInterests,
  interestTimeline,
  rankReels,
  recFeedbackMap,
  seenReelIds,
  topInterests,
  type Interaction,
} from "./scoring";

const reel = (id: string, tags: string[]): Reel => ({
  id,
  title: `Reel ${id}`,
  creator: "Creator",
  handle: "@creator",
  summary: "Summary",
  tags,
  duration: 20,
  hue: 150,
  stat: "1k views",
});

const REELS: Reel[] = [
  reel("a", ["llm", "agents"]),
  reel("b", ["robotics"]),
  reel("c", ["llm"]),
];

let clock = 0;
const act = (reelId: string, action: Interaction["action"]): Interaction => ({
  id: `${reelId}-${action}-${clock}`,
  reelId,
  action,
  at: ++clock,
});

describe("computeInterests", () => {
  it("returns an empty vector with no interactions", () => {
    expect(computeInterests([], REELS)).toEqual({});
  });

  it("weights the primary tag fully and secondary tags with decay", () => {
    const interests = computeInterests([act("a", "liked")], REELS);
    expect(interests["llm"]).toBeCloseTo(ACTION_WEIGHTS.liked);
    expect(interests["agents"]).toBeCloseTo(ACTION_WEIGHTS.liked * 0.6);
  });

  it("subtracts weight for skips and downvotes", () => {
    const interests = computeInterests([act("b", "skipped"), act("b", "rec_down")], REELS);
    expect(interests["robotics"]).toBeLessThan(0);
  });

  it("clamps interest between the configured bounds", () => {
    const many = Array.from({ length: 50 }, () => act("c", "liked"));
    expect(computeInterests(many, REELS)["llm"]).toBe(INTEREST_MAX);
    const negatives = Array.from({ length: 50 }, () => act("b", "rec_down"));
    expect(computeInterests(negatives, REELS)["robotics"]).toBe(INTEREST_MIN);
  });

  it("ignores interactions pointing at unknown reels", () => {
    expect(computeInterests([act("missing", "liked")], REELS)).toEqual({});
  });

  it("is order independent because it sorts by timestamp", () => {
    const a = act("a", "liked");
    const b = act("c", "skipped");
    expect(computeInterests([a, b], REELS)).toEqual(computeInterests([b, a], REELS));
  });
});

describe("interestTimeline", () => {
  it("emits one cumulative snapshot per known interaction", () => {
    const timeline = interestTimeline(
      [act("a", "watched"), act("missing", "liked"), act("c", "liked")],
      REELS,
    );
    expect(timeline).toHaveLength(2);
    expect(timeline[1]!["llm"]).toBeGreaterThan(timeline[0]!["llm"]!);
  });
});

describe("topInterests", () => {
  it("drops zeroes, sorts descending and respects the limit", () => {
    const top = topInterests({ llm: 3, agents: 0, rag: 5, chips: 1 }, 2);
    expect(top).toEqual([
      ["rag", 5],
      ["llm", 3],
    ]);
  });
});

describe("recFeedbackMap", () => {
  it("keeps only the latest explicit feedback per reel", () => {
    const map = recFeedbackMap([act("a", "rec_up"), act("a", "rec_down"), act("b", "rec_up")]);
    expect(map).toEqual({ a: "down", b: "up" });
  });
});

describe("seenReelIds", () => {
  it("counts watch signals but not recommendation feedback", () => {
    const seen = seenReelIds([act("a", "watched"), act("a", "liked"), act("b", "rec_up")]);
    expect(seen).toEqual(["a"]);
  });
});

describe("rankReels", () => {
  it("ranks reels matching learned interests first", () => {
    const ranked = rankReels({ reels: REELS, interactions: [act("a", "liked")] });
    expect(ranked[0]!.reel.id).toBe("c");
  });

  it("excludes requested ids", () => {
    const ranked = rankReels({ reels: REELS, interactions: [], exclude: ["a", "b"] });
    expect(ranked.map((r) => r.reel.id)).toEqual(["c"]);
  });

  it("pushes down-voted reels to the bottom and explains why", () => {
    const ranked = rankReels({ reels: REELS, interactions: [act("b", "rec_down")] });
    const last = ranked.at(-1)!;
    expect(last.reel.id).toBe("b");
    expect(last.reason).toBe("Down-ranked from your feedback");
  });

  it("keeps the match score inside a human-readable range", () => {
    for (const s of rankReels({ reels: REELS, interactions: [act("a", "liked")] })) {
      expect(s.match).toBeGreaterThanOrEqual(4);
      expect(s.match).toBeLessThanOrEqual(99);
    }
  });

  it("labels the cold start state", () => {
    expect(rankReels({ reels: REELS, interactions: [] })[0]!.reason).toBe(
      "Popular starting point",
    );
  });

  it("is deterministic for equal scores via id tie-break", () => {
    const a = rankReels({ reels: REELS, interactions: [] }).map((r) => r.reel.id);
    const b = rankReels({ reels: [...REELS].reverse(), interactions: [] }).map((r) => r.reel.id);
    expect(a).toEqual(b);
  });
});
