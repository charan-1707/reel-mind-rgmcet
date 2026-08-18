CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TYPE public.app_role AS ENUM ('admin', 'curator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.reels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  handle TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  duration INTEGER NOT NULL DEFAULT 20,
  hue INTEGER NOT NULL DEFAULT 150,
  stat TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_select_published" ON public.reels FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "reels_admin_write" ON public.reels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'curator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'curator'));

CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('watched','liked','skipped','rec_up','rec_down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX interactions_user_created_idx ON public.interactions (user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.interactions TO authenticated;
GRANT ALL ON public.interactions TO service_role;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interactions_select_own" ON public.interactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "interactions_insert_own" ON public.interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "interactions_delete_own" ON public.interactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reel_id)
);
GRANT SELECT, INSERT, DELETE ON public.queue_items TO authenticated;
GRANT ALL ON public.queue_items TO service_role;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_select_own" ON public.queue_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "queue_insert_own" ON public.queue_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue_delete_own" ON public.queue_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.reels (id, title, creator, handle, summary, tags, duration, hue, stat) VALUES
  ('r1', 'Why your RAG pipeline forgets the middle', 'Nadia Okafor', '@contextwindow', 'A 40-second teardown of positional bias: models retrieve the head and tail of context and quietly drop the middle. Fix it with reranking, not bigger windows.', ARRAY['rag','llm','research'], 22, 152, '128k context, 12% recall'),
  ('r2', 'Agents that write their own tools', 'Miles Trent', '@loopbuilder', 'Watch an agent hit a missing API, generate a typed client for it, test it, and keep going. The whole run takes 90 seconds.', ARRAY['agents','devtools','llm'], 26, 96, '9 tools synthesized'),
  ('r3', 'One prompt injection, three compromised agents', 'Dr. Ilse Rahman', '@redteam.ai', 'A poisoned webpage cascades through a multi-agent crew. The lesson: treat every tool output as untrusted input, always.', ARRAY['security','agents'], 19, 12, '3/3 agents breached'),
  ('r4', 'Diffusion transformers, explained with paint', 'Kenji Aoyama', '@latentkenji', 'Noise schedules visualized as pigment dissolving in water, then reversed. The clearest 30 seconds on DiT you''ll watch today.', ARRAY['diffusion','research'], 30, 300, '1000 steps → 8'),
  ('r5', 'The memory wall is the real bottleneck', 'Priya Sundaram', '@siliconpriya', 'FLOPs are cheap, bandwidth isn''t. A whiteboard walk through HBM economics and why inference clusters look nothing like training ones.', ARRAY['chips','research'], 28, 45, '3.2 TB/s per stack'),
  ('r6', 'Teaching a quadruped to fall gracefully', 'Bruno Kessler', '@gaitlab', 'Reward shaping for recovery instead of avoidance. The robot stops fearing the ground and gets 4x more resilient.', ARRAY['robotics','research'], 24, 200, '4.1x recovery rate'),
  ('r7', 'Eval-driven development for LLM features', 'Sam Ortega', '@shipevals', 'Stop shipping vibes. Build a 40-case golden set before the prompt, and let regressions fail your CI like any other test.', ARRAY['devtools','product','llm'], 21, 168, '40 cases, 6 min CI'),
  ('r8', 'Speculative decoding on a laptop', 'Wen Li', '@tinyinference', 'A 0.5B draft model feeding a 8B verifier. Same output distribution, 2.4x faster tokens, zero cloud spend.', ARRAY['llm','chips','devtools'], 18, 78, '2.4x tok/s'),
  ('r9', 'Retrieval is a product problem', 'Amara Bell', '@amarabuilds', 'Users don''t ask questions, they gesture at them. How query rewriting driven by session context beat a fancier embedding model.', ARRAY['rag','product'], 25, 130, '+31% answer rate'),
  ('r10', 'Video models are becoming world simulators', 'Kenji Aoyama', '@latentkenji', 'Object permanence, gravity, occlusion — emergent physics inside a generative video model, tested with adversarial prompts.', ARRAY['diffusion','research','robotics'], 27, 268, '7/10 physics probes'),
  ('r11', 'The agent handoff protocol nobody agreed on', 'Miles Trent', '@loopbuilder', 'Four competing standards for passing state between agents, benchmarked on the same task. One of them silently drops tool errors.', ARRAY['agents','devtools','product'], 23, 108, '4 specs, 1 leak'),
  ('r12', 'Fine-tuning is back (for narrow tasks)', 'Nadia Okafor', '@contextwindow', 'When a 3B tuned model beats a frontier model on your one task, at 1/60th the cost. The decision tree for tune vs prompt.', ARRAY['llm','product','research'], 20, 186, '1/60th cost'),
  ('r13', 'Sandboxing code interpreters properly', 'Dr. Ilse Rahman', '@redteam.ai', 'Network egress, syscall filtering, and time limits. A checklist for letting a model run code without letting it run your infra.', ARRAY['security','devtools'], 22, 24, '0 egress by default'),
  ('r14', 'On-device robotics policies under 100MB', 'Bruno Kessler', '@gaitlab', 'Distilling a vision-language-action model down to something that runs on the arm''s own controller, at 40Hz.', ARRAY['robotics','chips'], 26, 210, '40Hz on-device'),
  ('r15', 'Analog compute for attention', 'Priya Sundaram', '@siliconpriya', 'An in-memory compute prototype doing matrix multiply in the analog domain — 20x energy savings, with an accuracy asterisk.', ARRAY['chips','research'], 29, 55, '20x J/token');