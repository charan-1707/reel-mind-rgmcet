import type { Reel } from "@/lib/reels";

export function Poster({ reel, className = "" }: { reel: Reel; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <div
        className="poster-drift absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 25%, hsl(${reel.hue} 85% 55% / 0.85), transparent 55%), radial-gradient(circle at 75% 80%, hsl(${(reel.hue + 55) % 360} 90% 50% / 0.7), transparent 55%), linear-gradient(140deg, hsl(${reel.hue} 40% 12%), hsl(${(reel.hue + 40) % 360} 45% 6%))`,
        }}
      />
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,.35) 0 1px, transparent 1px 4px)",
        }}
      />
    </div>
  );
}
