import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RotateCcw } from "lucide-react";
import { REELS, TAG_LABEL } from "@/lib/reels";
import { hydrate, reset, scoreReels, topInterests, useEngine } from "@/lib/engine";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your interest graph — Reelmind" },
      {
        name: "description",
        content:
          "See how your AI tech interests evolved reel by reel, review every recommendation you rated, and understand why the engine ranks what it ranks.",
      },
      { property: "og:title", content: "Your interest graph — Reelmind" },
      {
        property: "og:description",
        content: "Interest evolution, recommendation history, and feedback in one view.",
      },
    ],
  }),
  component: Dashboard,
});

const ACTION_LABEL: Record<string, string> = {
  watched: "Watched to the end",
  liked: "Liked",
  skipped: "Skipped",
  rec_up: "Marked useful",
  rec_down: "Marked not relevant",
};

function Dashboard() {
  const state = useEngine();
  useEffect(() => hydrate(), []);

  const top = topInterests(state, 4);
  const series = useMemo(() => {
    return state.snapshots.map((s, i) => {
      const row: Record<string, number | string> = { step: i + 1 };
      top.forEach(([tag]) => {
        row[tag] = Number((s.interests[tag] ?? 0).toFixed(2));
      });
      return row;
    });
  }, [state.snapshots, top]);

  const ranked = scoreReels(state).slice(0, 6);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Your interest graph</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every watch, like, skip and rating reshapes the ranking. Here is the trail.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset profile
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-4">
          {[
            ["Reels watched", state.seen.length],
            ["Signals sent", state.events.length],
            ["Rated recs", Object.keys(state.recFeedback).length],
            ["Queued", state.queue.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
              <p className="label">{label}</p>
              <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Interest evolution</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Weight per topic across your last {series.length || 0} interactions.
          </p>
          <div className="mt-6 h-72">
            {series.length < 2 ? (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Watch a couple of reels to plot your curve.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    {top.map(([tag], i) => (
                      <linearGradient key={tag} id={`g-${tag}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors[i]} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={colors[i]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="step" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v, name) => [v, TAG_LABEL[String(name)] ?? name]}
                  />
                  {top.map(([tag], i) => (
                    <Area
                      key={tag}
                      type="monotone"
                      dataKey={tag}
                      stroke={colors[i]}
                      fill={`url(#g-${tag})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {top.map(([tag], i) => (
              <span key={tag} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: colors[i] }}
                />
                {TAG_LABEL[tag] ?? tag}
              </span>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Recommendation history</h2>
            <ul className="mt-4 divide-y divide-border">
              {state.events.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">Nothing yet.</li>
              )}
              {state.events.slice(0, 12).map((e) => {
                const r = REELS.find((x) => x.id === e.reelId);
                return (
                  <li key={e.id} className="flex items-baseline gap-3 py-3">
                    <span
                      className={`label shrink-0 ${
                        e.action === "rec_down" || e.action === "skipped"
                          ? "text-destructive"
                          : "text-primary"
                      }`}
                    >
                      {ACTION_LABEL[e.action]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{r?.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Current ranking</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              What the engine would serve you next, and why.
            </p>
            <ol className="mt-4 space-y-3">
              {ranked.map(({ reel, match, reason }, i) => (
                <li key={reel.id} className="flex gap-3">
                  <span className="font-display text-sm text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{reel.title}</span>
                    <span className="text-xs text-muted-foreground">{reason}</span>
                  </span>
                  <span className="label shrink-0 text-primary">{match}%</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}
