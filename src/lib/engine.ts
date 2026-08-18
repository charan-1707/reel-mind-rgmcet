import { REELS, type Reel } from "./reels";
import { useSyncExternalStore } from "react";

export type Action = "watched" | "liked" | "skipped" | "rec_up" | "rec_down";

export type Event = {
  id: string;
  reelId: string;
  action: Action;
  at: number;
};

export type Snapshot = { at: number; interests: Record<string, number> };

export type State = {
  interests: Record<string, number>;
  events: Event[];
  snapshots: Snapshot[];
  recFeedback: Record<string, "up" | "down">;
  queue: string[];
  seen: string[];
};

const KEY = "reelmind.state.v1";

const EMPTY: State = {
  interests: {},
  events: [],
  snapshots: [],
  recFeedback: {},
  queue: [],
  seen: [],
};

const WEIGHTS: Record<Action, number> = {
  watched: 1,
  liked: 2.5,
  skipped: -0.6,
  rec_up: 1.6,
  rec_down: -1.4,
};

let state: State = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as State) };
  } catch {
    /* ignore */
  }
  emit();
}

function set(next: State) {
  state = next;
  persist();
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const getState = () => state;
const getServerState = () => EMPTY;

export function useEngine(): State {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

function reelById(id: string): Reel | undefined {
  return REELS.find((r) => r.id === id);
}

export function record(reelId: string, action: Action) {
  const reel = reelById(reelId);
  if (!reel) return;
  const w = WEIGHTS[action];
  const interests = { ...state.interests };
  for (const tag of reel.tags) {
    const decay = tag === reel.tags[0] ? 1 : 0.6;
    interests[tag] = Math.max(-4, Math.min(12, (interests[tag] ?? 0) + w * decay));
  }
  const event: Event = {
    id: `${reelId}-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reelId,
    action,
    at: Date.now(),
  };
  const recFeedback = { ...state.recFeedback };
  if (action === "rec_up") recFeedback[reelId] = "up";
  if (action === "rec_down") recFeedback[reelId] = "down";

  set({
    ...state,
    interests,
    recFeedback,
    events: [event, ...state.events].slice(0, 200),
    snapshots: [...state.snapshots, { at: Date.now(), interests }].slice(-60),
    seen: state.seen.includes(reelId) ? state.seen : [...state.seen, reelId],
  });
}

export function enqueue(reelId: string) {
  if (state.queue.includes(reelId)) return;
  set({ ...state, queue: [reelId, ...state.queue] });
}

export function dequeue(reelId: string) {
  set({ ...state, queue: state.queue.filter((id) => id !== reelId) });
}

export function reset() {
  set({ ...EMPTY });
}

export type Scored = {
  reel: Reel;
  score: number;
  match: number;
  reason: string;
};

export function scoreReels(s: State, exclude: string[] = []): Scored[] {
  const values = Object.values(s.interests);
  const max = Math.max(1, ...values.map(Math.abs));

  return REELS.filter((r) => !exclude.includes(r.id))
    .map((reel) => {
      let raw = 0;
      let top = reel.tags[0]!;
      let topVal = -Infinity;
      reel.tags.forEach((tag, i) => {
        const v = s.interests[tag] ?? 0;
        raw += v * (i === 0 ? 1 : 0.65);
        if (v > topVal) {
          topVal = v;
          top = tag;
        }
      });
      const fb = s.recFeedback[reel.id];
      if (fb === "down") raw -= 6;
      if (fb === "up") raw += 2;
      const novelty = s.seen.includes(reel.id) ? -2.5 : 0.8;
      const score = raw / max + novelty * 0.35;
      const match = Math.round(
        Math.max(4, Math.min(99, 50 + (raw / max) * 22 + novelty * 4)),
      );
      const reason =
        fb === "down"
          ? "Down-ranked from your feedback"
          : topVal > 0.5
            ? `You keep watching ${top} reels`
            : s.events.length === 0
              ? "Popular starting point"
              : `Exploring outside your usual mix`;
      return { reel, score, match, reason };
    })
    .sort((a, b) => b.score - a.score);
}

export function topInterests(s: State, n = 6) {
  return Object.entries(s.interests)
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
