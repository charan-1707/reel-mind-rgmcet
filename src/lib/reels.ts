export type Reel = {
  id: string;
  title: string;
  creator: string;
  handle: string;
  summary: string;
  tags: string[];
  duration: number; // seconds
  hue: number;
  stat: string;
};

export const ALL_TAGS = [
  "llm",
  "agents",
  "rag",
  "diffusion",
  "robotics",
  "chips",
  "devtools",
  "security",
  "research",
  "product",
] as const;

export const TAG_LABEL: Record<string, string> = {
  llm: "LLMs",
  agents: "Agents",
  rag: "Retrieval",
  diffusion: "Generative media",
  robotics: "Robotics",
  chips: "Silicon",
  devtools: "Dev tooling",
  security: "AI security",
  research: "Research",
  product: "Product",
};

export const REELS: Reel[] = [
  {
    id: "r1",
    title: "Why your RAG pipeline forgets the middle",
    creator: "Nadia Okafor",
    handle: "@contextwindow",
    summary:
      "A 40-second teardown of positional bias: models retrieve the head and tail of context and quietly drop the middle. Fix it with reranking, not bigger windows.",
    tags: ["rag", "llm", "research"],
    duration: 22,
    hue: 152,
    stat: "128k context, 12% recall",
  },
  {
    id: "r2",
    title: "Agents that write their own tools",
    creator: "Miles Trent",
    handle: "@loopbuilder",
    summary:
      "Watch an agent hit a missing API, generate a typed client for it, test it, and keep going. The whole run takes 90 seconds.",
    tags: ["agents", "devtools", "llm"],
    duration: 26,
    hue: 96,
    stat: "9 tools synthesized",
  },
  {
    id: "r3",
    title: "One prompt injection, three compromised agents",
    creator: "Dr. Ilse Rahman",
    handle: "@redteam.ai",
    summary:
      "A poisoned webpage cascades through a multi-agent crew. The lesson: treat every tool output as untrusted input, always.",
    tags: ["security", "agents"],
    duration: 19,
    hue: 12,
    stat: "3/3 agents breached",
  },
  {
    id: "r4",
    title: "Diffusion transformers, explained with paint",
    creator: "Kenji Aoyama",
    handle: "@latentkenji",
    summary:
      "Noise schedules visualized as pigment dissolving in water, then reversed. The clearest 30 seconds on DiT you'll watch today.",
    tags: ["diffusion", "research"],
    duration: 30,
    hue: 300,
    stat: "1000 steps → 8",
  },
  {
    id: "r5",
    title: "The memory wall is the real bottleneck",
    creator: "Priya Sundaram",
    handle: "@siliconpriya",
    summary:
      "FLOPs are cheap, bandwidth isn't. A whiteboard walk through HBM economics and why inference clusters look nothing like training ones.",
    tags: ["chips", "research"],
    duration: 28,
    hue: 45,
    stat: "3.2 TB/s per stack",
  },
  {
    id: "r6",
    title: "Teaching a quadruped to fall gracefully",
    creator: "Bruno Kessler",
    handle: "@gaitlab",
    summary:
      "Reward shaping for recovery instead of avoidance. The robot stops fearing the ground and gets 4x more resilient.",
    tags: ["robotics", "research"],
    duration: 24,
    hue: 200,
    stat: "4.1x recovery rate",
  },
  {
    id: "r7",
    title: "Eval-driven development for LLM features",
    creator: "Sam Ortega",
    handle: "@shipevals",
    summary:
      "Stop shipping vibes. Build a 40-case golden set before the prompt, and let regressions fail your CI like any other test.",
    tags: ["devtools", "product", "llm"],
    duration: 21,
    hue: 168,
    stat: "40 cases, 6 min CI",
  },
  {
    id: "r8",
    title: "Speculative decoding on a laptop",
    creator: "Wen Li",
    handle: "@tinyinference",
    summary:
      "A 0.5B draft model feeding a 8B verifier. Same output distribution, 2.4x faster tokens, zero cloud spend.",
    tags: ["llm", "chips", "devtools"],
    duration: 18,
    hue: 78,
    stat: "2.4x tok/s",
  },
  {
    id: "r9",
    title: "Retrieval is a product problem",
    creator: "Amara Bell",
    handle: "@amarabuilds",
    summary:
      "Users don't ask questions, they gesture at them. How query rewriting driven by session context beat a fancier embedding model.",
    tags: ["rag", "product"],
    duration: 25,
    hue: 130,
    stat: "+31% answer rate",
  },
  {
    id: "r10",
    title: "Video models are becoming world simulators",
    creator: "Kenji Aoyama",
    handle: "@latentkenji",
    summary:
      "Object permanence, gravity, occlusion — emergent physics inside a generative video model, tested with adversarial prompts.",
    tags: ["diffusion", "research", "robotics"],
    duration: 27,
    hue: 268,
    stat: "7/10 physics probes",
  },
  {
    id: "r11",
    title: "The agent handoff protocol nobody agreed on",
    creator: "Miles Trent",
    handle: "@loopbuilder",
    summary:
      "Four competing standards for passing state between agents, benchmarked on the same task. One of them silently drops tool errors.",
    tags: ["agents", "devtools", "product"],
    duration: 23,
    hue: 108,
    stat: "4 specs, 1 leak",
  },
  {
    id: "r12",
    title: "Fine-tuning is back (for narrow tasks)",
    creator: "Nadia Okafor",
    handle: "@contextwindow",
    summary:
      "When a 3B tuned model beats a frontier model on your one task, at 1/60th the cost. The decision tree for tune vs prompt.",
    tags: ["llm", "product", "research"],
    duration: 20,
    hue: 186,
    stat: "1/60th cost",
  },
  {
    id: "r13",
    title: "Sandboxing code interpreters properly",
    creator: "Dr. Ilse Rahman",
    handle: "@redteam.ai",
    summary:
      "Network egress, syscall filtering, and time limits. A checklist for letting a model run code without letting it run your infra.",
    tags: ["security", "devtools"],
    duration: 22,
    hue: 24,
    stat: "0 egress by default",
  },
  {
    id: "r14",
    title: "On-device robotics policies under 100MB",
    creator: "Bruno Kessler",
    handle: "@gaitlab",
    summary:
      "Distilling a vision-language-action model down to something that runs on the arm's own controller, at 40Hz.",
    tags: ["robotics", "chips"],
    duration: 26,
    hue: 210,
    stat: "40Hz on-device",
  },
  {
    id: "r15",
    title: "Analog compute for attention",
    creator: "Priya Sundaram",
    handle: "@siliconpriya",
    summary:
      "An in-memory compute prototype doing matrix multiply in the analog domain — 20x energy savings, with an accuracy asterisk.",
    tags: ["chips", "research"],
    duration: 29,
    hue: 55,
    stat: "20x J/token",
  },
];
