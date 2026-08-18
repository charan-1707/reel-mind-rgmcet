import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayCircle, ThumbsDown, ThumbsUp, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { TAG_LABEL } from "@/lib/reels";
import {
  computeInterests,
  rankReels,
  recFeedbackMap,
  seenReelIds,
  topInterests,
} from "@/lib/scoring";
import { useFeed } from "@/lib/feed-store";
import { useAuth } from "@/hooks/useAuth";
import { Poster } from "@/components/Poster";
import { ReelPlayer } from "@/components/ReelPlayer";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { reel?: string } =>
    typeof search["reel"] === "string" ? { reel: search["reel"] } : {},
  head: () => ({
    meta: [
      { title: "Reelmind — AI tech reels that learn what you watch" },
      {
        name: "description",
        content:
          "Watch short AI and deep-tech reels, and get recommendations you can act on: play them instantly, rate them, and watch your interest graph evolve.",
      },
      { property: "og:title", content: "Reelmind — AI tech reels that learn what you watch" },
      {
        property: "og:description",
        content:
          "A reels player with a recommendation engine you can actually talk back to: watch, rate, and steer.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { reels, interactions, queue, record, enqueue, dequeue, loading, isGuest } = useFeed();
  const { displayName } = useAuth();
  const navigate = useNavigate();
  const { reel: reelParam } = Route.useSearch();

  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const [fromQueue, setFromQueue] = useState(false);

  useEffect(() => {
    if (reels.length === 0) return;
    if (reelParam && reels.some((r) => r.id === reelParam)) {
      setCurrent(reelParam);
      setFromQueue(true);
      void navigate({ to: "/", search: {}, replace: true });
      return;
    }
    setCurrent((c) => (c && reels.some((r) => r.id === c) ? c : (reels[0]?.id ?? null)));
  }, [reels, reelParam, navigate]);

  const reel = useMemo(
    () => reels.find((r) => r.id === current) ?? reels[0],
    [reels, current],
  );

  const ranked = useMemo(
    () => rankReels({ reels, interactions, exclude: reel ? [reel.id] : [] }).slice(0, 5),
    [reels, interactions, reel],
  );
  const interests = useMemo(
    () => topInterests(computeInterests(interactions, reels), 5),
    [interactions, reels],
  );
  const feedback = useMemo(() => recFeedbackMap(interactions), [interactions]);
  const watched = useMemo(() => seenReelIds(interactions).length, [interactions]);

  const advance = useCallback(() => {
    if (!reel) return;
    const next = queue.find((id) => id !== reel.id && reels.some((r) => r.id === id));
    if (next) {
      dequeue(next);
      setCurrent(next);
      setFromQueue(true);
      setCount((i) => i + 1);
      return;
    }
    const pool = rankReels({ reels, interactions, exclude: [reel.id] });
    const pick = pool[Math.floor(Math.random() * Math.min(3, pool.length))] ?? pool[0];
    if (pick) {
      setCurrent(pick.reel.id);
      setFromQueue(false);
    }
    setCount((i) => i + 1);
  }, [reels, interactions, queue, reel, dequeue]);

  const playNow = (id: string) => {
    dequeue(id);
    setCurrent(id);
    setFromQueue(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!reel) {
    return (
      <main className="grain grid min-h-[60vh] place-items-center px-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading your feed…" : "No reels published yet."}
        </p>
      </main>
    );
  }

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:py-12">
        <section className="space-y-4">
          <h1 className="sr-only">Your AI tech reels feed</h1>
          <ReelPlayer
            reel={reel}
            queued={fromQueue}
            onComplete={() => {
              record(reel.id, "watched");
              advance();
            }}
            onLike={() => {
              record(reel.id, "liked");
              toast.success("Liked — more like this coming up");
            }}
            onSkip={() => {
              record(reel.id, "skipped");
              advance();
            }}
            onPrev={() => {
              const i = reels.findIndex((r) => r.id === reel.id);
              setCurrent(reels[(i - 1 + reels.length) % reels.length]!.id);
              setFromQueue(false);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Reel {count + 1} of an endless feed · {watched} watched · {queue.length} queued from
            recommendations
          </p>
        </section>

        <aside className="space-y-6">
          {isGuest && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
              <p className="font-medium">You're browsing as a guest.</p>
              <p className="mt-1 text-muted-foreground">
                <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                  Create an account
                </Link>{" "}
                to sync your interest graph and queue across devices.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold">
                {displayName ? `${displayName}'s signal` : "Your signal"}
              </h2>
            </div>
            {interests.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Watch a reel to the end, or like one, and the engine starts building your
                interest graph here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {interests.map(([tag, v]) => (
                  <li key={tag} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm">{TAG_LABEL[tag] ?? tag}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className={`block h-full rounded-full ${v < 0 ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (Math.abs(v) / 8) * 100)}%` }}
                      />
                    </span>
                    <span className="w-8 text-right text-xs text-muted-foreground">
                      {v > 0 ? "+" : ""}
                      {v.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">Recommended for you</h2>
              <span className="label">live ranking</span>
            </div>
            {ranked.map(({ reel: r, match, reason }) => {
              const fb = feedback[r.id];
              const queued = queue.includes(r.id);
              return (
                <article
                  key={r.id}
                  className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/60"
                >
                  <Poster reel={r} className="h-24 w-16 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label">{match}% match</span>
                      <span className="truncate text-[11px] text-muted-foreground">{reason}</span>
                    </div>
                    <h3 className="mt-1 text-sm leading-snug font-semibold">{r.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.creator} · {r.duration}s
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        onClick={() => playNow(r.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <PlayCircle className="size-3.5" aria-hidden="true" /> Watch this
                      </button>
                      <button
                        onClick={() => {
                          enqueue(r.id);
                          toast("Added to your queue");
                        }}
                        className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {queued ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="size-3" aria-hidden="true" /> Queued
                          </span>
                        ) : (
                          "Queue"
                        )}
                      </button>
                      <span className="ml-auto flex items-center gap-1">
                        <button
                          aria-label={`Mark "${r.title}" as a useful recommendation`}
                          onClick={() => {
                            record(r.id, "rec_up");
                            toast.success("Noted — boosting this kind of reel");
                          }}
                          className={`grid size-7 place-items-center rounded-full border transition-colors ${
                            fb === "up"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          <ThumbsUp className="size-3" aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Mark "${r.title}" as not relevant`}
                          onClick={() => {
                            record(r.id, "rec_down");
                            toast("Dropped — the engine will pull back on this");
                          }}
                          className={`grid size-7 place-items-center rounded-full border transition-colors ${
                            fb === "down"
                              ? "border-destructive bg-destructive text-destructive-foreground"
                              : "border-border hover:border-destructive"
                          }`}
                        >
                          <ThumbsDown className="size-3" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
