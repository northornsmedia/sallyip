import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudUpload,
  Copy,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  GraduationCap,
  Home,
  Layers3,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { DotmCircular7 } from "@/components/ui/dotm-circular-7";
import { ResearchLiveSectionV2 as ResearchLiveSection } from "@/components/ui/research-live-section-v2";
import { PixelImage } from "@/registry/magicui/pixel-image";
import { WarpBackground } from "@/registry/magicui/warp-background";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { GlyphMatrix } from "@/registry/magicui/glyph-matrix";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { ScrollAssembleText } from "@/components/ui/text-scroll-animation";
import ChatPage from "@/components/chat-page";
import BrainAdminPage from "@/components/brain-admin-page";
import "./brain-admin.css";
import PricingPage from "@/components/pricing-page";
import AuthPage from "@/components/auth-page";
import TransparencyPage from "@/components/transparency-page";
import HomePageRedesign from "@/components/home-page-redesign";
import LifecyclePage from "@/components/lifecycle-page";
import ModulesPage from "@/components/modules-page";
import PerformancePage from "@/components/performance-page";
import SecurityPage from "@/components/security-page";
import BenchmarksPage from "@/components/benchmarks-page";
import VoiceChatWidget from "@/components/voice-chat-widget";
import "./home-redesign.css";
import "./styles.css";
import "./brand.css";
import "./premium.css";
import "./chat-workspace.css";
import "./modern-clean-chat.css";

const jobs = [
  {
    id: "TRN-8K4M2",
    name: "Trademark Classification v2",
    model: "SallyIP 4.1 Pro",
    dataset: "EUIPO marks 2025.jsonl",
    progress: 76,
    status: "TRAINING",
    eta: "18 min",
    loss: "1.84",
  },
  {
    id: "TRN-2P9Q1",
    name: "Patent Claims Research",
    model: "SallyIP 4.1 Pro",
    dataset: "claims-corpus.csv",
    progress: 100,
    status: "COMPLETED",
    eta: "Done",
    loss: "1.21",
  },
];
const models = [
  {
    name: "Trademark Classifier",
    version: "v2.1",
    base: "Qwen2.5-7B-Instruct",
    method: "QLoRA",
    score: "91.8%",
    status: "Ready",
    date: "Aug 20, 2026",
  },
  {
    name: "Patent Claims Research",
    version: "v1.0",
    base: "Qwen2.5-7B-Instruct",
    method: "QLoRA",
    score: "88.4%",
    status: "Ready",
    date: "Aug 18, 2026",
  },
  {
    name: "Copyright Analyzer",
    version: "v0.4",
    base: "Qwen2.5-7B-Instruct",
    method: "LoRA",
    score: "—",
    status: "Evaluating",
    date: "Aug 21, 2026",
  },
];
const nav = [
  ["dashboard", "Overview"],
  ["train", "Add knowledge"],
  ["jobs", "Processing jobs"],
  ["datasets", "Sources"],
  ["models", "Collections"],
  ["points", "SallyIP Points"],
  ["transparency", "Transparency"],
];
const route = () => location.hash.slice(1) || "home";
const go = (p) => {
  location.hash = p;
  scrollTo({ top: 0, behavior: "smooth" });
};

function BrandMark({ className = "" }) {
  return (
    <span className={"brandMark " + className}>
      <img src="/sallyip-logo.png" alt="" />
    </span>
  );
}
function Logo({ light = false }) {
  return (
    <button
      className={"logo " + (light ? "light" : "")}
      onClick={() => go("home")}
    >
      <BrandMark />
      <b>SallyIP</b>
      <em>Labs</em>
    </button>
  );
}
function Reveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
function Pill({ children }) {
  return <span className="pill">{children}</span>;
}
function Landing() {
  const [faq, setFaq] = useState(0);
  return (
    <div className="landing">
      <header className="topnav">
        <Logo />
        <nav>
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#research">Research</a>
          <a href="#security">Security</a>
          <a onClick={() => go("pricing")}>Pricing</a>
        </nav>
        <div className="navActions">
          <button className="textBtn" onClick={() => go("auth")}>
            Sign in
          </button>
          <button className="darkBtn" onClick={() => go("chat")}>
            Open Labs <ArrowRight />
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="heroGlow" />
          <div className="heroGlyph">
            <GlyphMatrix
              glyphs="01·•+*/\\&lt;&gt;=§¶"
              cellSize={18}
              mutationRate={0.035}
              interval={90}
              fadeBottom={0.68}
              color="#ffffff"
            />
          </div>
          <div className="heroMatrix">
            <DotmCircular7 size={620} dotSize={52} speed={0.7} />
          </div>
          <Reveal>
            <h1>
              Build IP intelligence.
              <br />
              <span>Shape what comes next.</span>
            </h1>
            <p>
              A research platform for creating specialized intellectual-property
              AI—without managing models, GPU queues, or training scripts.
            </p>
            <div className="heroCtas">
              <button className="darkBtn big" onClick={() => go("train")}>
                Add knowledge <ArrowRight />
              </button>
              <button className="ghostBtn big" onClick={() => go("chat")}>
                Explore SallyIP 4.1 Pro
              </button>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="heroProduct">
            <div className="browserBar">
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>sallyip.com/labs/train</span>
              <MoreHorizontal />
            </div>
            <div className="productBody">
              <SideMini />
              <div className="trainPreview">
                <div className="previewHead">
                  <div>
                    <small>ADD PRIVATE KNOWLEDGE</small>
                    <h3>Teach SallyIP something new.</h3>
                    <p>
                      Upload a rights-cleared source. Sally handles the rest.
                    </p>
                  </div>
                  <span className="modelTag">SallyIP 4.1 Pro</span>
                </div>
                <div className="drop">
                  <CloudUpload />
                  <b>Drop your legal PDF here</b>
                  <span>PDF, JSONL, CSV or TXT · up to 2 GB</span>
                </div>
                <div className="trainSteps">
                  <span className="active">01 Source</span>
                  <i />
                  <span>02 Configure</span>
                  <i />
                  <span>03 Review</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
        <MagicNumbers />
        <section className="trust">
          <span>Built for ambitious research teams</span>
          <div>
            <b>LEXFORD</b>
            <b>Northstar University</b>
            <b>INSTITUTE / 04</b>
            <b>FORMA LEGAL</b>
            <b>ARC RESEARCH</b>
          </div>
        </section>
        <section id="platform" className="section split">
          <Reveal>
            <Pill>THE PLATFORM</Pill>
            <ScrollAssembleText text="Private legal knowledge, made remarkably useful." />
          </Reveal>
          <Reveal>
            <p className="lead">
              SallyIP Labs turns carefully prepared legal knowledge into useful
              model adaptations. You bring the expertise. We orchestrate
              validation, indexing, retrieval evaluation, and provenance.
            </p>
          </Reveal>
        </section>
        <section className="featureGrid">
          <Reveal className="featureCard large">
            <div className="cardTop">
              <span>01</span>
              <FlaskConical />
            </div>
            <h3>From source to cited intelligence.</h3>
            <p>
              Choose SallyIP 4.1 Pro, upload a legally usable dataset, and
              index it into a private, citation-ready collection in minutes.
            </p>
            <TrainingAnimation />
          </Reveal>
          <Reveal className="featureCard">
            <div className="cardTop">
              <span>02</span>
              <Gauge />
            </div>
            <h3>Watch learning happen.</h3>
            <p>
              Live extraction, indexing, retrieval quality, source status, and
              an ETA based on observed processing speed.
            </p>
            <LiveLossChart />
          </Reveal>
          <Reveal className="featureCard">
            <div className="cardTop">
              <span>03</span>
              <ShieldCheck />
            </div>
            <h3>Transparent by design.</h3>
            <p>
              Every model carries its base-model identity, dataset provenance,
              license, configuration, and evaluation record.
            </p>
            <div className="provenance">
              <div>
                <Check />
                <span>
                  <b>Rights verified</b>
                  <small>Owner confirmation</small>
                </span>
              </div>
              <div>
                <Check />
                <span>
                  <b>License recorded</b>
                  <small>Apache 2.0</small>
                </span>
              </div>
              <div>
                <Check />
                <span>
                  <b>Evaluation complete</b>
                  <small>8 checks passed</small>
                </span>
              </div>
            </div>
          </Reveal>
        </section>
        <section id="workflow" className="darkSection">
          <Reveal>
            <Pill>HOW IT WORKS</Pill>
            <h2>
              Your expertise in.
              <br />
              <span>A capable model out.</span>
            </h2>
          </Reveal>
          <div className="steps">
            {[
              [
                "01",
                "Curate",
                "Bring rights-cleared IP documents or structured examples.",
              ],
              [
                "02",
                "Train",
                "Recommended settings adapt SallyIP 4.1 Pro securely.",
              ],
              [
                "03",
                "Evaluate",
                "Automatic checks measure quality and surface limitations.",
              ],
              [
                "04",
                "Contribute",
                "Keep your model private and earn SallyIP Points.",
              ],
            ].map((s, i) => (
              <Reveal className="step" delay={i * 0.08} key={s[0]}>
                <b>{s[0]}</b>
                <div className="stepIcon">
                  {i === 0 ? (
                    <Database />
                  ) : i === 1 ? (
                    <Zap />
                  ) : i === 2 ? (
                    <BarChart3 />
                  ) : (
                    <Trophy />
                  )}
                </div>
                <h3>{s[1]}</h3>
                <p>{s[2]}</p>
              </Reveal>
            ))}
          </div>
        </section>
        <section id="research" className="section center">
          <Reveal>
            <Pill>RESEARCH ECOSYSTEM</Pill>
            <h2>
              Built for knowledge
              <br />
              that deserves rigor.
            </h2>
            <p className="lead">
              From individual researchers to university labs, SallyIP creates a
              responsible contribution loop around specialized legal AI.
            </p>
          </Reveal>
          <div className="audience">
            {[
              [
                GraduationCap,
                "Universities",
                "Private projects, student contributions, and shared benchmarks.",
              ],
              [
                BookOpen,
                "Researchers",
                "Reproducible source records and transparent retrieval evaluation.",
              ],
              [
                Layers3,
                "IP teams",
                "Private knowledge collections that preserve organizational research.",
              ],
            ].map(([I, t, p], i) => (
              <Reveal className="audCard" delay={i * 0.08} key={t}>
                <I />
                <h3>{t}</h3>
                <p>{p}</p>
                <ChevronRight />
              </Reveal>
            ))}
          </div>
        </section>
        <section id="security" className="quote">
          <Reveal>
            <ShieldCheck />
            <h2>
              “Progress without provenance
              <br />
              isn’t progress.”
            </h2>
            <p>
              Every upload remains private by default. SallyIP records rights
              confirmations and never equates publicly available with permitted
              for private retrieval.
            </p>
            <button className="ghostBtn big" onClick={() => go("transparency")}>
              Read our transparency approach <ArrowRight />
            </button>
          </Reveal>
        </section>
        <section className="faq">
          <Reveal>
            <Pill>QUESTIONS</Pill>
            <h2>What teams ask us.</h2>
          </Reveal>
          <div>
            {[
              [
                "What is SallyIP Labs?",
                "A research workspace that lets approved users give Sally private, legally usable sources with traceable citations.",
              ],
              [
                "Do I need machine-learning experience?",
                "No. Sally automatically extracts, chunks, embeds, validates, and stores each approved source for retrieval.",
              ],
              [
                "Does my dataset become public?",
                "Never automatically. Datasets and models are private by default, with controlled university and public options.",
              ],
              [
                "What does SallyIP actually contribute?",
                "The retrieval pipeline, evaluation, IP-specific sources, safety systems, and model orchestration. Provider details remain visible on the transparency page.",
              ],
            ].map((x, i) => (
              <div
                className={"faqItem " + (faq === i ? "open" : "")}
                onClick={() => setFaq(faq === i ? -1 : i)}
                key={x[0]}
              >
                <button>
                  <span>{x[0]}</span>
                  <Plus />
                </button>
                <AnimatePresence>
                  {faq === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {x[1]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
        <section className="finalCta">
          <Reveal>
            <BrandMark className="largeMark" />
            <h2>
              Turn your research
              <br />
              into intelligence.
            </h2>
            <p>Start with SallyIP 4.1 Pro. No infrastructure required.</p>
            <button className="lightBtn big" onClick={() => go("train")}>
              Open SallyIP Labs <ArrowRight />
            </button>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SideMini() {
  return (
    <div className="sideMini">
      <Logo />
      <div>
        <span className="selected">
          <FlaskConical /> Train
        </span>
        <span>
          <BarChart3 /> Overview
        </span>
        <span>
          <Database /> Datasets
        </span>
        <span>
          <Layers3 /> Models
        </span>
      </div>
    </div>
  );
}
function TrainingAnimation() {
  return (
    <div className="trainingAnim">
      <div className="flowAtmosphere">
        <i />
        <i />
        <i />
      </div>
      <div className="trainingTopline">
        <span>
          <i /> PIPELINE ACTIVE
        </span>
        <b>TRN-8K4M2</b>
      </div>
      <div className="nodes">
        <span className="dataNode">
          <em>01</em>
          <Database />
          <small>24.1M tokens</small>
        </span>
        <i className="flowLine">
          <b />
          <b />
          <b />
        </i>
        <span className="coreNode">
          <span className="pulse" />
          <span className="pulse pulseTwo" />
          <img
            className="pipeline-logo"
            src="/sallyip-logo.png"
            alt="SallyIP"
          />
          <strong>76%</strong>
          <small>INDEX</small>
        </span>
        <i className="flowLine reverse">
          <b />
          <b />
          <b />
        </i>
        <span className="modelNode">
          <em>03</em>
          <Layers3 />
          <small>168 MB</small>
        </span>
      </div>
      <div className="labels">
        <span>
          <Check /> Dataset validated
        </span>
        <span>
          <Zap /> Indexing · batch 2/3
        </span>
        <span>
          <ShieldCheck /> Private collection
        </span>
      </div>
      <div className="trainingMetrics">
        <span>
          <small>RETRIEVAL</small>
          <b>
            1.84 <em>↓ 38%</em>
          </b>
        </span>
        <span>
          <small>PASSAGES</small>
          <b>
            H100 <em>68%</em>
          </b>
        </span>
        <span>
          <small>ETA</small>
          <b>
            18 min <em>live</em>
          </b>
        </span>
      </div>
    </div>
  );
}
function LiveLossChart() {
  const initial = [
    3.12, 3.02, 2.94, 2.79, 2.62, 2.66, 2.49, 2.35, 2.39, 2.22, 2.16, 2.08,
  ];
  const [points, setPoints] = useState(initial);
  useEffect(() => {
    const timer = setInterval(
      () =>
        setPoints((current) => {
          if (current.length > 30) return initial;
          const last = current[current.length - 1],
            noise = (Math.random() - 0.42) * 0.18,
            next = Math.max(1.18, Math.min(3.2, last - 0.055 + noise));
          return [...current, next];
        }),
      1100,
    );
    return () => clearInterval(timer);
  }, []);
  const width = 360,
    height = 135,
    pad = 8,
    min = 1,
    max = 3.35;
  const coords = points.map((value, index) => [
    pad + (index / Math.max(1, points.length - 1)) * (width - pad * 2),
    pad + ((max - value) / (max - min)) * (height - pad * 2),
  ]);
  const path = coords
    .map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${coords.at(-1)[0]} ${height} L ${coords[0][0]} ${height} Z`;
  const loss = points.at(-1),
    change = Math.max(0, ((initial[0] - loss) / initial[0]) * 100);
  const rising = points.length > 1 && loss > points.at(-2);
  return (
    <div className="metricViz liveMetric">
      <div className="metricHeader">
        <span>
          <i /> LIVE INDEXING
        </span>
        <small>STEP {8420 + (points.length - initial.length) * 120}</small>
      </div>
      <small>RETRIEVAL ERROR</small>
      <b>
        <motion.span
          key={loss.toFixed(2)}
          initial={{ opacity: 0, y: rising ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {loss.toFixed(2)}
        </motion.span>
        <em className={rising ? "rising" : ""}>
          {rising ? "↑" : "↓"} {change.toFixed(1)}%
        </em>
      </b>
      <div className="liveChart">
        <div className="chartGuides">
          <i />
          <i />
          <i />
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b8ff5c" stopOpacity=".25" />
              <stop offset="1" stopColor="#b8ff5c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            className="areaPath"
            animate={{ d: area }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.path
            className="lossPath"
            animate={{ d: path }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.circle
            className="liveDot"
            animate={{ cx: coords.at(-1)[0], cy: coords.at(-1)[1] }}
            r="4"
            transition={{ duration: 0.6 }}
          />
        </svg>
      </div>
      <div className="chartFooter">
        <span>EPOCH 2 / 3</span>
        <span>
          {(18.4 + (points.length - initial.length) * 0.17).toFixed(1)}M TOKENS
        </span>
      </div>
    </div>
  );
}
function MagicNumbers() {
  return (
    <>
      <section className="magicNumbers">
        {[
          ["24.1M", "indexed tokens"],
          ["91.8%", "evaluation score"],
          ["94.2%", "citation coverage"],
          ["12,480", "research points"],
        ].map(([n, l], i) => (
          <Reveal className="magicStat" delay={i * 0.07} key={l}>
            <span>0{i + 1}</span>
            <strong>{n}</strong>
            <small>{l}</small>
          </Reveal>
        ))}
      </section>
      <PixelStory />
      <ResearchLiveSection />
      <ProgressShowcase />
      <BackgroundPaths
        title="Build the future of IP intelligence"
        eyebrow="RESEARCH WITHOUT INFRASTRUCTURE"
        buttonLabel="Train SallyIP now"
        onAction={() => go("train")}
      />
    </>
  );
}
function PixelStory() {
  return (
    <section className="pixelStory">
      <div className="pixelCopy">
        <span>KNOWLEDGE, STRUCTURED</span>
        <h2>
          Documents in.
          <br />
          <em>Intelligence emerges.</em>
        </h2>
        <p>
          Every page becomes a traceable signal—cleaned, segmented, validated,
          and transformed into specialist capability.
        </p>
        <div className="pixelMeta">
          <div>
            <b>02.4B</b>
            <small>tokens processed</small>
          </div>
          <div>
            <b>99.7%</b>
            <small>pipeline uptime</small>
          </div>
        </div>
      </div>
      <PixelImage
        className="logoPixel"
        src="/sallyip-logo.png"
        alt="SallyIP brand mark"
        customGrid={{ rows: 4, cols: 6 }}
        grayscaleAnimation
      />
    </section>
  );
}
function WarpMilestone() {
  return (
    <WarpBackground className="warpMilestone">
      <Reveal>
        <Card className="milestoneCard">
          <CardContent>
            <div className="milestoneTop">
              <span>
                <Check />
              </span>
              <small>INDEXING COMPLETE · IDX-8K4M2</small>
            </div>
            <CardTitle>
              Trademark intelligence,
              <br />
              ready for research.
            </CardTitle>
            <CardDescription>
              Your knowledge collection passed 8 retrieval checks and is now
              available to Sally inside this private workspace.
            </CardDescription>
            <div className="milestoneStats">
              <span>
                <b>91.8%</b>
                <small>MACRO F1</small>
              </span>
              <span>
                <b>1.72</b>
                <small>RETRIEVAL ERROR</small>
              </span>
              <span>
                <b>168 MB</b>
                <small>PASSAGES</small>
              </span>
            </div>
            <button className="lightBtn big" onClick={() => go("model")}>
              Explore the model <ArrowRight />
            </button>
          </CardContent>
        </Card>
      </Reveal>
    </WarpBackground>
  );
}
function ProgressShowcase() {
  const [value, setValue] = useState(12);
  useEffect(() => {
    const timer = setInterval(
      () => setValue((v) => (v >= 100 ? 12 : Math.min(100, v + 11))),
      1600,
    );
    return () => clearInterval(timer);
  }, []);
  const stage =
    value < 35
      ? "Document understanding"
      : value < 65
        ? "Citation accuracy"
        : value < 90
          ? "IP classification"
          : "Safety verification";
  return (
    <section className="progressShowcase">
      <Reveal className="progressCopy">
        <span>AUTOMATIC EVALUATION</span>
        <h2>
          Proof of progress.
          <br />
          <em>Not empty promises.</em>
        </h2>
        <p>
          Every knowledge collection moves through defined evaluation gates before it
          reaches your registry.
        </p>
      </Reveal>
      <div className="progressVisual">
        <AnimatedCircularProgressBar
          value={value}
          gaugePrimaryColor="#b8ff5c"
          gaugeSecondaryColor="rgba(255,255,255,.07)"
          label="evaluated"
        />
        <div className="evaluationStage">
          <span>
            <i /> RUNNING NOW
          </span>
          <h3>{stage}</h3>
          <div>
            <small>Benchmark suite</small>
            <b>SallyIP IP Research v1</b>
          </div>
          <div>
            <small>Checks passed</small>
            <b>{Math.max(1, Math.floor(value / 13))} / 8</b>
          </div>
        </div>
      </div>
    </section>
  );
}
function Footer() {
  return (
    <footer>
      <div>
        <Logo />
        <p>
          Responsible infrastructure for
          <br />
          specialized intellectual-property AI.
        </p>
      </div>
      <div>
        <b>Platform</b>
        <a onClick={() => go("train")}>Add knowledge</a>
        <a onClick={() => go("models")}>Knowledge collections</a>
        <a onClick={() => go("points")}>SallyIP Points</a>
      </div>
      <div>
        <b>Resources</b>
        <a onClick={() => go("transparency")}>Transparency</a>
        <a>Documentation</a>
        <a>Security</a>
      </div>
      <div>
        <b>Company</b>
        <a>About SallyIP</a>
        <a>Privacy</a>
        <a>Terms</a>
      </div>
      <small>© 2026 SallyIP. Research tools, not legal advice.</small>
    </footer>
  );
}

function AppShell({ page }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="app">
      <aside className={menu ? "shown" : ""}>
        <div className="asideHead">
          <Logo />
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <div className="asideQuick">
          <button onClick={() => go("home")}>
            <Home /> Home
          </button>
          <button onClick={() => go("chat")}>
            <MessageSquare /> Chat
          </button>
        </div>
        <nav>
          {nav.map(([r, t], i) => {
            const I = [
              BarChart3,
              FlaskConical,
              Clock3,
              Database,
              Layers3,
              Trophy,
              ShieldCheck,
            ][i];
            return (
              <button
                className={page === r ? "active" : ""}
                onClick={() => go(r)}
                key={r}
              >
                <I />
                {t}
              </button>
            );
          })}
        </nav>
        <div className="asideFoot">
          <div className="miniUser">CN</div>
          <div>
            <b>Carlos Northon</b>
            <small>Research workspace</small>
          </div>
          <MoreHorizontal />
        </div>
      </aside>
      <div className="appMain">
        <header className="appTop">
          <button className="menuBtn" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div className="search">
            <Search />
            <span>Search SallyIP Labs</span>
            <kbd>⌘ K</kbd>
          </div>
          <div>
            <button className="iconBtn">
              <CircleHelp />
            </button>
            <button className="darkBtn" onClick={() => go("train")}>
              <Plus /> Add knowledge
            </button>
            <div className="avatar">CN</div>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.main
            key={page}
            className={
              page === "transparency" ? "page transparencyPageShell" : "page"
            }
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {page === "dashboard" ? (
              <Dashboard />
            ) : page === "train" ? (
              <Train />
            ) : page === "jobs" ? (
              <Jobs />
            ) : page === "job" ? (
              <Job />
            ) : page === "datasets" ? (
              <Datasets />
            ) : page === "models" ? (
              <Models />
            ) : page === "model" ? (
              <Model />
            ) : page === "points" ? (
              <Points />
            ) : (
              <TransparencyPage />
            )}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
const PageHead = ({ eyebrow, title, text, children }) => (
  <div className="pageHead">
    <div>
      <small>{eyebrow}</small>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
    {children}
  </div>
);
function Dashboard() {
  return (
    <>
      <PageHead eyebrow="FRIDAY, AUGUST 21" title="Good afternoon, Carlos.">
        <button className="darkBtn" onClick={() => go("train")}>
          <FlaskConical /> Add knowledge
        </button>
      </PageHead>
      <div className="statGrid">
        {[
          ["SallyIP Points", "12,480", "+820 this month", Trophy],
          ["Sources processing", "1", "76% indexed", Zap],
          ["Knowledge collections", "8", "3 shared with lab", Layers3],
          ["Research impact", "94.2", "Contribution score", BarChart3],
        ].map(([a, b, c, I]) => (
          <div className="stat">
            <div>
              <span>{a}</span>
              <I />
            </div>
            <b>{b}</b>
            <small>{c}</small>
          </div>
        ))}
      </div>
      <div className="dashGrid">
        <section className="panel span2">
          <PanelTitle title="Active processing" action="View all" />
          <div className="activeJob" onClick={() => go("job")}>
            <div className="jobIcon">
              <Sparkles />
            </div>
            <div className="grow">
              <div className="row">
                <b>Trademark Classification v2</b>
                <Pill>INDEXING</Pill>
              </div>
              <small>SallyIP 4.1 Pro · EUIPO marks 2025.jsonl</small>
              <div className="progress">
                <i style={{ width: "76%" }} />
              </div>
              <div className="row muted">
                <span>1,824 of 2,410 passages indexed</span>
                <span>76% · about 18 min</span>
              </div>
            </div>
            <ChevronRight />
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Retrieval health" />
          <div className="gauge">
            <div>
              <b>68%</b>
              <span>in use</span>
            </div>
          </div>
          <div className="row muted">
            <span>1 active worker</span>
            <span>H100 80GB</span>
          </div>
        </section>
        <section className="panel span2">
          <PanelTitle title="Recent models" action="Open registry" />
          <Table
            rows={models
              .slice(0, 3)
              .map((m) => [m.name, m.version, m.method, m.score, m.status])}
            heads={["Model", "Version", "Method", "Evaluation", "Status"]}
            click={() => go("model")}
          />
        </section>
        <section className="panel">
          <PanelTitle title="Contribution mix" />
          <div className="donutWrap">
            <div className="donut" />
            <div className="legend">
              <span>
                <i className="violet" />
                Datasets <b>52%</b>
              </span>
              <span>
                <i className="green" />
                Evaluation <b>29%</b>
              </span>
              <span>
                <i className="gray" />
                Annotation <b>19%</b>
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function PanelTitle({ title, action }) {
  return (
    <div className="panelTitle">
      <h3>{title}</h3>
      {action && (
        <button>
          {action}
          <ChevronRight />
        </button>
      )}
    </div>
  );
}
function Train() {
  const [method, setMethod] = useState("Balanced");
  const [file, setFile] = useState(null);
  const [rights, setRights] = useState(false);
  const [started, setStarted] = useState(false);
  if (started)
    return (
      <div className="success">
        <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }}>
          <Check />
        </motion.div>
        <small>KNOWLEDGE JOB CREATED</small>
        <h1>Your source is being indexed.</h1>
        <p>
          Sally is extracting, chunking, embedding, and validating your source.
          It will become searchable after processing succeeds.
        </p>
        <button className="darkBtn big" onClick={() => go("job")}>
          View live progress <ArrowRight />
        </button>
      </div>
    );
  return (
    <>
      <PageHead
        eyebrow="PRIVATE KNOWLEDGE"
        title="Add knowledge to Sally"
        text="Turn a rights-cleared document into cited, searchable evidence."
      />
      <div className="trainLayout">
        <div className="formStack">
          <section className="formCard">
            <div className="formNum">1</div>
            <div className="grow">
              <h3>Knowledge workspace</h3>
              <p>Sally remains the only assistant and uses this source privately.</p>
              <div className="modelSelect">
                <span className="logoMark">
                  <i />
                  <i />
                  <i />
                </span>
                <div>
                  <b>SallyIP 4.1 Pro</b>
                  <small>
                    Private retrieval · Recommended for IP research
                  </small>
                </div>
                <Pill>ACTIVE</Pill>
              </div>
              <div className="disclosure">
                <ShieldCheck />
                <span>
                  <b>Sally orchestration</b>
                  <small>
                    Weighted reasoning · Liquid LFM retrieval · Nemotron reranking
                  </small>
                </span>
              </div>
            </div>
          </section>
          <section className="formCard">
            <div className="formNum">2</div>
            <div className="grow">
              <h3>Add your source</h3>
              <p>Start with a searchable or scanned PDF. More formats can follow.</p>
              <label className={"upload " + (file ? "hasFile" : "")}>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <>
                    <FileText />
                    <b>{file.name}</b>
                    <span>
                      {(file.size / 1024).toFixed(1)} KB · Ready to validate
                    </span>
                  </>
                ) : (
                  <>
                    <CloudUpload />
                    <b>
                      Drop your PDF here, or <u>browse</u>
                    </b>
                    <span>PDF only · Maximum file size 25 MB</span>
                  </>
                )}
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={rights}
                  onChange={(e) => setRights(e.target.checked)}
                />
                <i>{rights && <Check />}</i>
                <span>
                  I confirm I have the legal rights or permission to use this
                  source for private retrieval and analysis.
                </span>
              </label>
            </div>
          </section>
          <section className="formCard">
            <div className="formNum">3</div>
            <div className="grow">
              <h3>Indexing profile</h3>
              <p>Choose how Sally should prepare and retrieve this source.</p>
              <div className="methodGrid">
                {["Balanced", "Precise", "Broad", "Custom"].map((x, i) => (
                  <button
                    className={method === x ? "chosen" : ""}
                    onClick={() => setMethod(x)}
                  >
                    <span>
                      {i === 0 && <Sparkles />}
                      {x}
                    </span>
                    <small>
                      {
                        [
                          "Best default retrieval",
                          "Smaller evidence chunks",
                          "Wider contextual passages",
                          "Configure chunking",
                        ][i]
                      }
                    </small>
                    {method === x && <Check />}
                  </button>
                ))}
              </div>
              {method === "Custom" && (
                <motion.div
                  className="advanced"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <label>
                    Chunk size <input defaultValue="900" />
                  </label>
                  <label>
                    Overlap <input defaultValue="150" />
                  </label>
                  <label>
                    Results/query <input defaultValue="8" />
                  </label>
                </motion.div>
              )}
            </div>
          </section>
        </div>
        <aside className="summary">
          <h3>Knowledge summary</h3>
          <div>
            <span>Model</span>
            <b>SallyIP 4.1 Pro</b>
          </div>
          <div>
            <span>Indexing</span>
            <b>{method}</b>
          </div>
          <div>
            <span>Source</span>
            <b>{file?.name || "Not uploaded"}</b>
          </div>
          <div>
            <span>Visibility</span>
            <b>Private</b>
          </div>
          <hr />
          <div>
            <span>Estimated points</span>
            <b>Calculated after evaluation</b>
          </div>
          <button
            disabled={!file || !rights}
            className="darkBtn big full"
            onClick={() => setStarted(true)}
          >
            Process source <ArrowRight />
          </button>
          <small>
            Sally extracts text, creates Liquid LFM embeddings, and stores the
            private index in your workspace. Uploaded files are never executed.
          </small>
        </aside>
      </div>
    </>
  );
}
function Jobs() {
  return (
    <>
      <PageHead
        eyebrow="ACTIVITY"
        title="Processing jobs"
        text="Track source extraction, indexing, validation, and availability."
      >
        <button className="darkBtn" onClick={() => go("train")}>
          <Plus /> Add knowledge
        </button>
      </PageHead>
      <section className="panel">
        <Table
          heads={["Job", "Model", "Dataset", "Progress", "Status", "ETA"]}
          rows={jobs.map((j) => [
            j.name,
            j.model,
            j.dataset,
            j.progress + "%",
            j.status,
            j.eta,
          ])}
          click={() => go("job")}
        />
      </section>
    </>
  );
}
function Job() {
  const [progress, setProgress] = useState(76);
  useEffect(() => {
    const t = setInterval(() => setProgress((x) => Math.min(94, x + 1)), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <PageHead
        eyebrow="TRAINING JOB · TRN-8K4M2"
        title="Trademark research collection"
        text="SallyIP 4.1 Pro · Liquid LFM private index"
      >
        <button className="outlineBtn">Cancel processing</button>
      </PageHead>
      <div className="jobHero">
        <div className="orb">
          <span />
          <Sparkles />
        </div>
        <div className="grow">
          <div className="row">
            <Pill>INDEXING</Pill>
            <span className="live">
              <i /> LIVE
            </span>
          </div>
          <h2>{progress}%</h2>
          <div className="progress huge">
            <i style={{ width: progress + "%" }} />
          </div>
          <div className="row muted">
            <span>Epoch 2 / 3 · Step 8,420 / 11,000</span>
            <span>Estimated completion: 18 minutes</span>
          </div>
        </div>
      </div>
      <div className="statGrid four">
        {[
          ["Training loss", "1.84", "↓ 0.12"],
          ["Tokens processed", "18.4M", "of 24.1M"],
          ["GPU", "H100 80GB", "68% utilized"],
          ["Elapsed", "47m 12s", "Started 2:14 PM"],
        ].map((x) => (
          <div className="stat">
            <span>{x[0]}</span>
            <b>{x[1]}</b>
            <small>{x[2]}</small>
          </div>
        ))}
      </div>
      <div className="dashGrid">
        <section className="panel span2">
          <PanelTitle title="Indexing throughput" />
          <div className="chart">
            <div className="chartGrid" />
            <svg viewBox="0 0 800 230">
              <path d="M0 20 C80 45 120 40 170 85 S260 70 330 120 S430 108 500 158 S620 145 800 205" />
            </svg>
            <div className="chartLabels">
              <span>0</span>
              <span>2,750</span>
              <span>5,500</span>
              <span>8,250</span>
              <span>11,000 steps</span>
            </div>
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Pipeline" />
          <div className="pipeline">
            {[
              ["Source validation", "done"],
              ["Data processing", "done"],
              ["Embedding generation", "active"],
              ["Evaluation", "next"],
              ["Collection publish", "next"],
            ].map(([x, s]) => (
              <div className={s}>
                <i>
                  {s === "done" ? <Check /> : s === "active" ? <span /> : ""}
                </i>
                <span>
                  {x}
                  <small>
                    {s === "done"
                      ? "Completed"
                      : s === "active"
                        ? "In progress"
                        : "Waiting"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel span3">
          <PanelTitle title="Live logs" />
          <pre className="logs">
            14:54:08 step 8420/11000 · epoch 2.29 · loss 1.840 · lr 8.2e-5{`\n`}
            14:54:12 tokens 18,421,760 · samples/sec 2.84 · gpu memory 61.4GB
            {`\n`}14:54:16 checkpoint scheduled at step 8500{`\n`}
            <span>14:54:20 training continues...</span>
          </pre>
        </section>
      </div>
    </>
  );
}
function Datasets() {
  const rows = [
    ["EUIPO marks 2025", "JSONL", "482 MB", "1.24M", "94 / 100", "Private"],
    ["Patent claims corpus", "CSV", "1.1 GB", "880K", "89 / 100", "University"],
    ["Copyright opinions", "PDF", "218 MB", "2,410", "86 / 100", "Private"],
  ];
  return (
    <>
      <PageHead
        eyebrow="RESEARCH ASSETS"
        title="Sources"
        text="Manage the rights-cleared evidence Sally can retrieve and cite."
      >
        <button className="darkBtn" onClick={() => go("train")}>
          <CloudUpload /> Upload source
        </button>
      </PageHead>
      <div className="callout">
        <ShieldCheck />
        <div>
          <b>Private by default</b>
          <p>
            No source is published or shared without an explicit visibility
            change.
          </p>
        </div>
      </div>
      <section className="panel">
        <Table
          heads={[
            "Source",
            "Type",
            "Size",
            "Examples",
            "Quality",
            "Visibility",
          ]}
          rows={rows}
        />
      </section>
    </>
  );
}
function Models() {
  return (
    <>
      <PageHead
        eyebrow="PRIVATE KNOWLEDGE"
        title="Knowledge collections"
        text="Traceable, searchable collections available to Sally."
      />
      <div className="modelCards">
        {models.map((m) => (
          <div className="registryCard" onClick={() => go("model")}>
            <div className="row">
              <span className="modelCube">
                <Layers3 />
              </span>
              <Pill>{m.status.toUpperCase()}</Pill>
            </div>
            <h3>{m.name}</h3>
            <span>
              {m.version} · {m.method}
            </span>
            <div className="score">
              <small>EVALUATION SCORE</small>
              <b>{m.score}</b>
            </div>
            <div className="row muted">
              <span>{m.base}</span>
              <ChevronRight />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function Model() {
  return (
    <>
      <PageHead
        eyebrow="MODEL REGISTRY · V2.1"
        title="Trademark research collection"
        text="A private, rights-cleared knowledge collection managed by Carlos Northon."
      >
        <button className="darkBtn">
          <Play /> Open in playground
        </button>
      </PageHead>
      <div className="callout successCall">
        <Check />
        <div>
          <b>Evaluation complete · 91.8%</b>
          <p>
            Passed 8 automated checks. Scores measure the defined evaluation
            set, not legal correctness.
          </p>
        </div>
      </div>
      <div className="detailGrid">
        <section className="panel span2">
          <PanelTitle title="Collection overview" />
          <div className="details">
            {[
              ["SallyIP model", "SallyIP 4.1 Pro"],
              ["Architecture", "Sally weighted intelligence stack"],
              ["Indexing model", "Liquid LFM 2.5 Embedding 350M"],
              ["Primary source", "EUIPO marks 2025"],
              ["Indexed passages", "18,420"],
              ["Visibility", "Private"],
            ].map((x) => (
              <div>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <PanelTitle title="Artifacts" />
          <div className="artifacts">
            {[
              "source_manifest.json",
              "rights_record.json",
              "chunking_profile.json",
              "retrieval_evaluation.json",
            ].map((x) => (
              <div>
                <FileText />
                <span>{x}</span>
                <ChevronRight />
              </div>
            ))}
          </div>
        </section>
        <section className="panel span3">
          <PanelTitle title="Evaluation metrics" />
          <div className="evalGrid">
            {[
              ["Retrieval precision", "91.8%"],
              ["Citation coverage", "94.2%"],
              ["Grounding score", "90.7%"],
              ["Passages", "18,420"],
              ["Processing time", "14m 08s"],
              ["Visibility", "Private"],
            ].map((x) => (
              <div>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
function Points() {
  const tx = [
    ["Dataset quality contribution", "EUIPO marks 2025", "+640", "Aug 20"],
    ["Evaluation contribution", "Trademark benchmark", "+180", "Aug 20"],
    ["SallyIP AI usage", "Research session", "−45", "Aug 19"],
    ["Annotation contribution", "Patent claims set", "+220", "Aug 18"],
  ];
  return (
    <>
      <PageHead
        eyebrow="CONTRIBUTIONS"
        title="SallyIP Points"
        text="A transparent ledger of your contribution to responsible IP intelligence."
      />
      <div className="pointsHero">
        <div>
          <small>AVAILABLE BALANCE</small>
          <b>12,480</b>
          <span>SallyIP Points</span>
        </div>
        <div>
          {[
            ["Datasets", "7,920"],
            ["Evaluation", "2,840"],
            ["Annotation", "1,720"],
          ].map((x) => (
            <p>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </p>
          ))}
        </div>
      </div>
      <section className="panel">
        <PanelTitle title="Contribution history" />
        <Table heads={["Activity", "Source", "Points", "Date"]} rows={tx} />
      </section>
    </>
  );
}
function Transparency() {
  return (
    <>
      <PageHead
        eyebrow="MODEL CARD"
        title="SallyIP 4.1 Pro"
        text="Capabilities, provenance, licenses, and limitations—without the fine print hiding the important parts."
      />
      <div className="transHero">
        <div className="orb">
          <Sparkles />
        </div>
        <div>
          <Pill>SUPPORTED MODEL</Pill>
          <h2>SallyIP 4.1 Pro</h2>
          <p>
            A SallyIP-orchestrated model configuration for intellectual-property
            research and specialized adapter training.
          </p>
        </div>
      </div>
      <div className="detailGrid">
        <section className="panel span2">
          <h3>Identity & provenance</h3>
          <div className="details">
            {[
              ["SallyIP model name", "SallyIP 4.1 Pro"],
              ["Architecture", "Sally weighted intelligence stack"],
              ["Retrieval model", "Liquid LFM 2.5 Embedding 350M"],
              ["Model disclosure", "Available on the transparency page"],
              ["Training method", "QLoRA / LoRA adapters"],
              ["Verification date", "August 21, 2026"],
            ].map((x) => (
              <div>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>SallyIP contributions</h3>
          <ul className="cleanList">
            {[
              "Training pipeline",
              "IP-specific datasets",
              "Evaluation framework",
              "Safety systems",
              "Model routing & orchestration",
            ].map((x) => (
              <li>
                <Check />
                {x}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel span3 warning">
          <ShieldCheck />
          <div>
            <h3>Important limitations</h3>
            <p>
              Evaluation scores are not proof of legally correct advice. SallyIP
              Labs is a research tool and does not replace qualified legal
              counsel. Generated output should be verified against authoritative
              sources.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
function Table({ heads, rows, click }) {
  return (
    <div className="table">
      <div className="tr th">
        {heads.map((x) => (
          <span>{x}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div className="tr" onClick={click} key={i}>
          {r.map((x, j) => (
            <span className={j === 0 ? "primary" : ""}>
              {x}
              {j === 0 && i === 0 ? <small>ID · 8K4M2</small> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
function App() {
  const [page, setPage] = useState(route());
  useEffect(() => {
    const h = () => setPage(route());
    addEventListener("hashchange", h);
    return () => removeEventListener("hashchange", h);
  }, []);
  return (
    <>
      {page === "home" ? (
        <HomePageRedesign
          onOpenChat={() => go("chat")}
          onOpenAuth={() => go("auth")}
          onOpenPricing={() => go("pricing")}
          onOpenTransparency={() => go("transparency")}
        />
      ) : page === "lifecycle" ? (
        <LifecyclePage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} onPricing={() => go("pricing")} />
      ) : page === "modules" ? (
        <ModulesPage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} onPricing={() => go("pricing")} />
      ) : page === "performance" ? (
        <PerformancePage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} onPricing={() => go("pricing")} />
      ) : page === "security" ? (
        <SecurityPage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} onPricing={() => go("pricing")} />
      ) : page === "benchmarks" ? (
        <BenchmarksPage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} onPricing={() => go("pricing")} />
      ) : page === "accessadmin" ? (
        <BrainAdminPage onHome={() => go("home")} />
      ) : page === "auth" ? (
        <AuthPage
          onHome={() => go("home")}
          onSuccess={(u) => {
            if (u) {
              try { localStorage.setItem("sallyip-user", JSON.stringify(u)); } catch {}
            }
            go("chat");
          }}
        />
      ) : page === "chat" ? (
        <ChatPage onHome={() => go("home")} onAuthRequired={() => go("auth")} />
      ) : page === "pricing" ? (
        <PricingPage onHome={() => go("home")} onChat={() => go("chat")} onAuth={() => go("auth")} />
      ) : (
        <ProtectedAppShell page={page} />
      )}
      <VoiceChatWidget />
    </>
  );
}
function ProtectedAppShell({page}){
  const [ready,setReady]=useState(false)
  useEffect(()=>{let cancelled=false;fetch('/api/auth').then(response=>{if(!response.ok)throw new Error('auth');if(!cancelled)setReady(true)}).catch(()=>{if(!cancelled)go('auth')});return()=>{cancelled=true}},[])
  return ready?<AppShell page={page}/>:<div className="authPage"><div className="authEyebrow">VERIFYING SESSION…</div></div>
}
createRoot(document.getElementById("root")).render(<App />);
