import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, PlayCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { TAG_LABEL } from "@/lib/reels";
import { rankReels } from "@/lib/scoring";
import { useFeed } from "@/lib/feed-store";
import { Poster } from "@/components/Poster";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore every AI tech reel — Reelmind" },
      {
        name: "description",
        content:
          "Search and filter the full Reelmind catalogue by topic — agents, RAG, robotics, silicon and more — then queue or play any reel instantly.",
      },
      { property: "og:title", content: "Explore every AI tech reel — Reelmind" },
      {
        property: "og:description",
        content: "Search and filter the whole catalogue by topic, then queue or watch instantly.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { reels, interactions, queue, enqueue, dequeue } = useFeed();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () => [...new Set(reels.flatMap((r) => r.tags))].sort(),
    [reels],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = reels.filter((r) => {
      const matchesTag = !tag || r.tags.includes(tag);
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.creator.toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });
    return rankReels({ reels: filtered, interactions });
  }, [reels, interactions, query, tag]);

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:py-12">
        <header>
          <h1 className="font-display text-3xl font-semibold">Explore the catalogue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything published on Reelmind, re-ranked live against your interest graph.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="reel-search" className="sr-only">
              Search reels
            </label>
            <input
              id="reel-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, creators or topics"
              className="w-full rounded-full border border-input bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTag(null)}
              aria-pressed={tag === null}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                tag === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All topics
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t === tag ? null : t)}
                aria-pressed={tag === t}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  tag === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAG_LABEL[t] ?? t}
              </button>
            ))}
          </div>
        </div>

        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reels match that search yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ reel, match, reason }) => {
              const queued = queue.includes(reel.id);
              return (
                <li
                  key={reel.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
                >
                  <Poster reel={reel} className="h-36 w-full" />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label">{match}% match</span>
                      <span className="truncate text-[11px] text-muted-foreground">{reason}</span>
                    </div>
                    <h2 className="text-sm leading-snug font-semibold">{reel.title}</h2>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{reel.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {reel.creator} · {reel.duration}s
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <button
                        onClick={() => navigate({ to: "/", search: { reel: reel.id } })}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <PlayCircle className="size-3.5" aria-hidden="true" /> Watch this
                      </button>
                      <button
                        onClick={() => {
                          if (queued) {
                            dequeue(reel.id);
                            toast("Removed from your queue");
                          } else {
                            enqueue(reel.id);
                            toast("Added to your queue");
                          }
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
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
