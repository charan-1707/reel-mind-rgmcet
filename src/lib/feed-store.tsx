import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { REELS, type Reel } from "./reels";
import type { Action, Interaction } from "./scoring";

const GUEST_KEY = "reelmind.guest.v2";

type GuestState = { interactions: Interaction[]; queue: string[] };

function readGuest(): GuestState {
  if (typeof window === "undefined") return { interactions: [], queue: [] };
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return { interactions: [], queue: [] };
    const parsed = JSON.parse(raw) as Partial<GuestState>;
    return { interactions: parsed.interactions ?? [], queue: parsed.queue ?? [] };
  } catch {
    return { interactions: [], queue: [] };
  }
}

function writeGuest(state: GuestState) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — stay in memory */
  }
}

type FeedValue = {
  reels: Reel[];
  interactions: Interaction[];
  queue: string[];
  loading: boolean;
  isGuest: boolean;
  record: (reelId: string, action: Action) => void;
  enqueue: (reelId: string) => void;
  dequeue: (reelId: string) => void;
  resetProfile: () => void;
  refreshReels: () => Promise<void>;
};

const FeedContext = createContext<FeedValue | null>(null);

type ReelRow = {
  id: string;
  title: string;
  creator: string;
  handle: string;
  summary: string;
  tags: string[] | null;
  duration: number;
  hue: number;
  stat: string;
};

const toReel = (row: ReelRow): Reel => ({
  id: row.id,
  title: row.title,
  creator: row.creator,
  handle: row.handle,
  summary: row.summary,
  tags: row.tags ?? [],
  duration: row.duration,
  hue: row.hue,
  stat: row.stat,
});

export function FeedProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [reels, setReels] = useState<Reel[]>(REELS);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshReels = useCallback(async () => {
    const { data, error } = await supabase
      .from("reels")
      .select("id,title,creator,handle,summary,tags,duration,hue,stat")
      .eq("published", true)
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) setReels((data as ReelRow[]).map(toReel));
  }, []);

  useEffect(() => {
    void refreshReels();
  }, [refreshReels]);

  // Personal state: database when signed in, local storage otherwise.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      const guest = readGuest();
      setInteractions(guest.interactions);
      setQueue(guest.queue);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      const [{ data: rows }, { data: queued }] = await Promise.all([
        supabase
          .from("interactions")
          .select("id,reel_id,action,created_at")
          .order("created_at", { ascending: true })
          .limit(500),
        supabase
          .from("queue_items")
          .select("reel_id,created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setInteractions(
        (rows ?? []).map((r) => ({
          id: r.id as string,
          reelId: r.reel_id as string,
          action: r.action as Action,
          at: new Date(r.created_at as string).getTime(),
        })),
      );
      setQueue((queued ?? []).map((q) => q.reel_id as string));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const record = useCallback(
    (reelId: string, action: Action) => {
      const entry: Interaction = {
        id: `${reelId}-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        reelId,
        action,
        at: Date.now(),
      };
      setInteractions((prev) => {
        const next = [...prev, entry].slice(-500);
        if (!user) writeGuest({ interactions: next, queue });
        return next;
      });
      if (user) {
        void supabase.from("interactions").insert({
          user_id: user.id,
          reel_id: reelId,
          action,
        });
      }
    },
    [user, queue],
  );

  const enqueue = useCallback(
    (reelId: string) => {
      setQueue((prev) => {
        if (prev.includes(reelId)) return prev;
        const next = [reelId, ...prev];
        if (!user) writeGuest({ interactions, queue: next });
        return next;
      });
      if (user) {
        void supabase
          .from("queue_items")
          .upsert({ user_id: user.id, reel_id: reelId }, { onConflict: "user_id,reel_id" });
      }
    },
    [user, interactions],
  );

  const dequeue = useCallback(
    (reelId: string) => {
      setQueue((prev) => {
        const next = prev.filter((id) => id !== reelId);
        if (!user) writeGuest({ interactions, queue: next });
        return next;
      });
      if (user) {
        void supabase.from("queue_items").delete().eq("reel_id", reelId);
      }
    },
    [user, interactions],
  );

  const resetProfile = useCallback(() => {
    setInteractions([]);
    setQueue([]);
    if (user) {
      void supabase.from("interactions").delete().eq("user_id", user.id);
      void supabase.from("queue_items").delete().eq("user_id", user.id);
    } else {
      writeGuest({ interactions: [], queue: [] });
    }
  }, [user]);

  const value = useMemo<FeedValue>(
    () => ({
      reels,
      interactions,
      queue,
      loading: loading || authLoading,
      isGuest: !user,
      record,
      enqueue,
      dequeue,
      resetProfile,
      refreshReels,
    }),
    [
      reels,
      interactions,
      queue,
      loading,
      authLoading,
      user,
      record,
      enqueue,
      dequeue,
      resetProfile,
      refreshReels,
    ],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed(): FeedValue {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used inside <FeedProvider>");
  return ctx;
}
