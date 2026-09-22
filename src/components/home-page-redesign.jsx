import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import Lenis from "lenis";
import {
  ArrowRight,
  Play,
  Check,
  Shield,
  FileText,
  Search,
  Sparkles,
  Layers,
  Database,
  Mail,
  FileCode,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Lock,
  Cpu,
  CheckCircle2,
  BookmarkCheck,
  Terminal
} from "lucide-react";
import SallyTopNav from "./sally-topnav";
import ModernGradientFooter from "./modern-gradient-footer";
import "../home-redesign.css";

const LIFECYCLE_STAGES = [
  {
    id: "ideation",
    num: "01",
    label: "Ideation",
    eyebrow: "PATENT IDEATION",
    title: "Capture and evaluate novel concepts early.",
    desc: "Transform raw technical disclosures and invention memos into structured patentability insights before drafting starts.",
    checks: [
      "Rapid invention disclosure ingestion",
      "Automatic novelty & non-obviousness screening",
      "Interactive claim hypothesis generation"
    ],
    previewTag: "IDEATION LAB",
    previewTitle: "Invention Disclosure: Distributed Ledger Consensus",
    shotPng: "/shots/sallyip-chat-actions-focus.png",
    shotWebp: "/shots/sallyip-chat-actions-focus.webp",
    shotAlt: "SallyIP quick actions for prior-art search, FTO, and patent drafting",
    shotCaption: "Start from the work — prior art, FTO, drafting, or clearance.",
    docx: "Invention_Summary.docx"
  },
  {
    id: "prior-art",
    num: "02",
    label: "Prior Art",
    eyebrow: "PRIOR ART SEARCH",
    title: "Surface disqualifying art with semantic precision.",
    desc: "Search over 150M+ patents and non-patent literature using hybrid vector & keyword retrieval that understands claim scope.",
    checks: [
      "150M+ global patent records indexed",
      "Semantic similarity with citation verification",
      "Multi-jurisdiction USPTO & EPO coverage"
    ],
    previewTag: "SEARCH ENGINE",
    previewTitle: "Prior Art Analysis: Claim 1 vs US9842110B2",
    shotPng: "/shots/sallyip-chat-home.png",
    shotWebp: "/shots/sallyip-chat-home.webp",
    shotAlt: "SallyIP chat workspace with matter context and model picker",
    shotCaption: "Matter-scoped prior art search with hybrid lexical + vector retrieval.",
    docx: "Prior_Art_Report.docx"
  },
  {
    id: "drafting",
    num: "03",
    label: "Drafting",
    eyebrow: "PATENT DRAFTING",
    title: "Draft patents in hours, not weeks.",
    desc: "Generate complete, jurisdiction-compliant patent applications from invention disclosures. Claims, specifications, and abstracts—all structured and ready for review.",
    checks: [
      "Full application generation",
      "USPTO/EPO compliance checks",
      "Microsoft Word & DOCX export"
    ],
    previewTag: "DRAFTING STUDIO",
    previewTitle: "System and Method for Grounded AI Inference",
    shotPng: "/shots/sallyip-patent-drafting.png",
    shotWebp: "/shots/sallyip-patent-drafting.webp",
    shotAlt: "US Patent Drafting Workspace shell with §111 filing options",
    shotCaption: "US patent drafting workspace — §111 filing choice grounded in inventor disclosures.",
    docx: "Patent_Draft_Full.docx"
  },
  {
    id: "prosecution",
    num: "04",
    label: "Prosecution",
    eyebrow: "OFFICE ACTION RESPONSES",
    title: "Overcome rejections with grounded legal reasoning.",
    desc: "Dissect 35 U.S.C. §§ 101, 102, and 103 examiner rejections and formulate persuasive, evidence-backed response arguments in minutes.",
    checks: [
      "Automated § 101, § 102, § 103 rejection breakdown",
      "Verbatim claim-amendment comparison",
      "Case law & MPEP grounding"
    ],
    previewTag: "OFFICE ACTION DESK",
    previewTitle: "Response to Non-Final Rejection: Art. 102(a)",
    shotPng: "/shots/sallyip-patent-drafting-focus.png",
    shotWebp: "/shots/sallyip-patent-drafting-focus.webp",
    shotAlt: "Filing category choice and rejection amendment interface",
    shotCaption: "Filing choice — provisional §111(b) or nonprovisional §111(a) — before any text is generated.",
    docx: "OA_Response_Remarks.docx"
  },
  {
    id: "risk",
    num: "05",
    label: "Risk Assessment",
    eyebrow: "FREEDOM TO OPERATE",
    title: "Identify infringement risks before product launch.",
    desc: "Map active patent claims against product features to generate comprehensive Freedom-to-Operate and invalidity charts.",
    checks: [
      "Element-by-element claim charting",
      "Invalidity contention generation",
      "Competitor portfolio monitoring"
    ],
    previewTag: "FTO WORKSPACE",
    previewTitle: "Infringement Risk Matrix: Q3 Product Release",
    shotPng: "/shots/sallyip-workspaces.png",
    shotWebp: "/shots/sallyip-workspaces.webp",
    shotAlt: "Specialist Legal Workspaces modal with 8 modules",
    shotCaption: "Specialist workspaces — FTO, claim charts, prior art, trademarks, and knowledge graph.",
    docx: "FTO_Clearance_Memo.docx"
  }
];

const HERO_TABS = [
  {
    id: "chat-home",
    label: "Chat Workspace",
    type: "image",
    png: "/shots/sallyip-chat-home.png",
    webp: "/shots/sallyip-chat-home.webp",
    alt: "SallyIP Chat Workspace showing Matter Tabs, Model Picker, and Quick Actions",
    caption: "SallyIP Chat Workspace — matter-scoped, with instant actions for prior art, FTO, and patent drafting.",
    sub: "MATTER-SCOPED · 4.2 PRO · AUDIT LOGGED"
  },
  {
    id: "workspaces",
    label: "Specialist Workspaces",
    type: "image",
    png: "/shots/sallyip-workspaces.png",
    webp: "/shots/sallyip-workspaces.webp",
    alt: "Specialist Legal Workspaces Modal showing the 8 shipped modules",
    caption: "The 8 specialized legal workspaces — drafting, review, playbooks, FTO, claim charts, prior art, trademarks, and knowledge graph.",
    sub: "8 SPECIALIZED MODULES · INSTANT LAUNCH"
  },
  {
    id: "patent-drafting",
    label: "Patent Drafting Studio",
    type: "image",
    png: "/shots/sallyip-patent-drafting.png",
    webp: "/shots/sallyip-patent-drafting.webp",
    alt: "US Patent Drafting Workspace Shell with §111 filing categories",
    caption: "US patent drafting workspace — provisional §111(b) and nonprovisional §111(a) drafting grounded in invention disclosures.",
    sub: "USPTO 35 U.S.C. § 111 COMPLIANT"
  },
  {
    id: "grounding-radar",
    label: "Live Citation Desk",
    type: "interactive",
    caption: "Exact-quote verification engine — every legal assertion tied directly to statutory authorities and cited patent passages.",
    sub: "ZERO RETENTION · HARDWARE ENCLAVE"
  }
];

const STUDIO_TABS = [
  {
    id: "claim-draft",
    label: "Claim 1 · Grounded Spec",
    matterId: "MATTER #US-98214-A",
    matterTitle: "Adaptive Neural Pipeline with Cryptographic Hardware Enclave",
    elementTitle: "[1.0] A computer-implemented method comprising:",
    elementText: "executing an isolated inference workload within an authenticated secure enclave; continuously validating cryptographic quote tokens generated by a hardware root-of-trust; and transmitting verified claims to an immutable matter ledger.",
    tags: ["§ 101 ELIGIBILITY PASS", "§ 112 SUPPORTED", "MPEP 2106 COMPLIANT"],
    citations: [
      { source: "US 10,842,912 B2 (Col. 4, L. 18-29)", note: "Hardware token generation in isolated silicon." },
      { source: "USPTO MPEP § 2106.05(a)", note: "Specific technological improvement to computer security." }
    ],
    statusScore: "100% Citation Grounded"
  },
  {
    id: "prior-art",
    label: "Prior Art Radar · 150M Corpus",
    matterId: "SEARCH #RADAR-8812",
    matterTitle: "Autonomous Prior Art Limitation Mapping",
    elementTitle: "Top Disqualifying Reference: US 2024/0192811 A1",
    elementText: "Discloses distributed consensus nodes with local hardware verification, but lacks runtime cryptographic claim-level attestation required by limitation [1.2].",
    tags: ["DISTINGUISHING OVER ART", "102(a)(1) CLEAR", "EPO ART. 54(2) NOVEL"],
    citations: [
      { source: "US 2024/0192811 A1 (Para [0084])", note: "Consensus mechanism relies on software heartbeat only." },
      { source: "IEEE Trans. Dependable Comp. 2025", note: "Silicon attestation distinct from network consensus." }
    ],
    statusScore: "Novelty Clear · 0 Blocking References"
  },
  {
    id: "office-action",
    label: "OA Rejection Breakdown · § 103",
    matterId: "EXAM #ART-UNIT-2144",
    matterTitle: "Examiner Non-Final Rejection Response & Remarks",
    elementTitle: "Examiner Assertion: Obvious over Smith in view of Chen",
    elementText: "Formulated rebuttal: Neither reference provides a teaching or suggestion to couple the dynamic secure enclave directly to claim-level cryptographic gating. Amendment introduces clarifying limitation with exact spec support.",
    tags: ["KSR MOTIVATION ABSENT", "OBJECTIVE EVIDENCE CITED", "103 REBUTTAL READY"],
    citations: [
      { source: "Application Spec, Para [0142]", note: "Explicit teaching against software-only verification." },
      { source: "In re Kahn, 441 F.3d 977", note: "Articulated reasoning with rational underpinning required." }
    ],
    statusScore: "Rebuttal Entailment: 99.4%"
  }
];

export default function HomePageRedesign({
  onNavigate,
  onOpenChat,
  onOpenAuth,
  onOpenPricing,
  onOpenBenchmarks,
  onOpenTransparency
}) {
  const [activeStage, setActiveStage] = useState("drafting");
  const [activeStudioTab, setActiveStudioTab] = useState("claim-draft");
  const [activeHeroTab, setActiveHeroTab] = useState("chat-home");

  const stageData = LIFECYCLE_STAGES.find((s) => s.id === activeStage) || LIFECYCLE_STAGES[2];
  const studioData = STUDIO_TABS.find((t) => t.id === activeStudioTab) || STUDIO_TABS[0];
  const currentHeroTab = HERO_TABS.find((t) => t.id === activeHeroTab) || HERO_TABS[0];

  // Section Refs for scroll tracking & bidirectional parallax
  const heroRef = useRef(null);
  const lifecycleRef = useRef(null);
  const modulesRef = useRef(null);
  const metricsRef = useRef(null);
  const testimonialsRef = useRef(null);
  const securityRef = useRef(null);
  const lenisRef = useRef(null);

  // Initialize Lenis butter-smooth inertial scroll for continuous bidirectional response
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Global Scroll Progress (tracks both scroll down and scroll up smoothly)
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // 1. Hero Parallax: Text floats up with subtle fade, Studio floats down with 3D scale
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroProgress, [0, 1], [0, -75]);
  const heroTextOpacity = useTransform(heroProgress, [0, 0.7], [1, 0.15]);
  const heroStudioY = useTransform(heroProgress, [0, 1], [0, 85]);
  const heroStudioScale = useTransform(heroProgress, [0, 1], [1, 0.94]);
  const heroStudioRotate = useTransform(heroProgress, [0, 1], [0, 2]);
  const smoothHeroStudioY = useSpring(heroStudioY, { stiffness: 90, damping: 25 });
  const smoothHeroStudioScale = useSpring(heroStudioScale, { stiffness: 90, damping: 25 });

  // 2. Lifecycle Section Parallax (Multi-plane depth separation)
  const { scrollYProgress: lifecycleProgress } = useScroll({
    target: lifecycleRef,
    offset: ["start end", "end start"],
  });
  const lifecycleHeaderY = useTransform(lifecycleProgress, [0, 1], [40, -35]);
  const featureLeftY = useTransform(lifecycleProgress, [0, 1], [25, -20]);
  const featureRightY = useTransform(lifecycleProgress, [0, 1], [60, -50]);
  const smoothFeatureRightY = useSpring(featureRightY, { stiffness: 90, damping: 25 });

  // 3. Modules Bento Grid Parallax (Staggered floating depth planes)
  const { scrollYProgress: modulesProgress } = useScroll({
    target: modulesRef,
    offset: ["start end", "end start"],
  });
  const modulesHeaderY = useTransform(modulesProgress, [0, 1], [35, -25]);
  const modCard1Y = useTransform(modulesProgress, [0, 1], [35, -35]);
  const modCard2Y = useTransform(modulesProgress, [0, 1], [60, -45]);
  const modCard3Y = useTransform(modulesProgress, [0, 1], [20, -25]);
  const modCard4Y = useTransform(modulesProgress, [0, 1], [50, -40]);
  const modCard5Y = useTransform(modulesProgress, [0, 1], [15, -35]);
  const smoothModCard1Y = useSpring(modCard1Y, { stiffness: 90, damping: 25 });
  const smoothModCard2Y = useSpring(modCard2Y, { stiffness: 90, damping: 25 });
  const smoothModCard3Y = useSpring(modCard3Y, { stiffness: 90, damping: 25 });
  const smoothModCard4Y = useSpring(modCard4Y, { stiffness: 90, damping: 25 });
  const smoothModCard5Y = useSpring(modCard5Y, { stiffness: 90, damping: 25 });

  // 4. Massive Metrics Parallax (Numbers drift on opposing planes)
  const { scrollYProgress: metricsProgress } = useScroll({
    target: metricsRef,
    offset: ["start end", "end start"],
  });
  const metricOddY = useTransform(metricsProgress, [0, 1], [30, -30]);
  const metricEvenY = useTransform(metricsProgress, [0, 1], [60, -50]);
  const smoothMetricOddY = useSpring(metricOddY, { stiffness: 85, damping: 24 });
  const smoothMetricEvenY = useSpring(metricEvenY, { stiffness: 85, damping: 24 });

  // 5. Testimonials Parallax
  const { scrollYProgress: testProgress } = useScroll({
    target: testimonialsRef,
    offset: ["start end", "end start"],
  });
  const testCard1Y = useTransform(testProgress, [0, 1], [25, -25]);
  const testCard2Y = useTransform(testProgress, [0, 1], [50, -45]);
  const testCard3Y = useTransform(testProgress, [0, 1], [15, -20]);
  const smoothTestCard1Y = useSpring(testCard1Y, { stiffness: 85, damping: 24 });
  const smoothTestCard2Y = useSpring(testCard2Y, { stiffness: 85, damping: 24 });
  const smoothTestCard3Y = useSpring(testCard3Y, { stiffness: 85, damping: 24 });

  // 6. Security & Integrations Parallax
  const { scrollYProgress: secProgress } = useScroll({
    target: securityRef,
    offset: ["start end", "end start"],
  });
  const secColLeftY = useTransform(secProgress, [0, 1], [25, -25]);
  const secColRightY = useTransform(secProgress, [0, 1], [45, -35]);
  const smoothSecColLeftY = useSpring(secColLeftY, { stiffness: 85, damping: 24 });
  const smoothSecColRightY = useSpring(secColRightY, { stiffness: 85, damping: 24 });

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(el, { offset: -60, duration: 1.2 });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavPricing = () => {
    if (onNavigate) {
      onNavigate("pricing");
    } else if (onOpenPricing) {
      onOpenPricing();
    } else {
      window.location.hash = "pricing";
    }
  };

  const handleNavBenchmarks = () => {
    if (onNavigate) {
      onNavigate("benchmarks");
    } else if (onOpenBenchmarks) {
      onOpenBenchmarks();
    } else {
      window.location.hash = "benchmarks";
    }
  };

  return (
    <div className="sally-home">
      {/* ---------------- Top Global Scroll Progress Bar ---------------- */}
      <motion.div className="sh-scroll-progress" style={{ scaleX }} />

      {/* ---------------- Topnav ---------------- */}
      <SallyTopNav
        activePage="home"
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else if (page === 'pricing') handleNavPricing();
          else if (page === 'benchmarks') handleNavBenchmarks();
          else if (page === 'chat') onOpenChat ? onOpenChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onOpenAuth ? onOpenAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
        onOpenChat={onOpenChat}
        onOpenAuth={onOpenAuth}
      />

      <main>
        {/* ---------------- Hero Section (Edge-to-Edge Apple Minimal Parallax) ---------------- */}
        <section ref={heroRef} className="sh-hero">
          <div className="sh-hero-content">
            <motion.div
              style={{ y: heroTextY, opacity: heroTextOpacity }}
              className="sh-hero-text-wrap"
            >
              <div className="sh-hero-badge">
                <span className="sh-badge-pill">SALLYIP 2026</span>
                <span>Grounded Legal Intelligence · Zero Dangling Citations</span>
              </div>

              <h1 className="sh-hero-title">
                <span className="sh-title-line">IP intelligence,</span>
                <span className="sh-title-line">from creation to <span className="sh-gradient-text">enforcement.</span></span>
              </h1>

              <p className="sh-hero-subtitle">
                An Apple-grade, verification-first platform for patent attorneys and IP teams.
                Every assertion is backed by retrieved statutory evidence.
              </p>

              <div className="sh-hero-ctas">
                <button className="sh-btn-apple" onClick={onOpenChat}>
                  Launch SallyIP Studio <ArrowRight size={14} />
                </button>
                <button className="sh-btn-minimal" onClick={handleNavPricing}>
                  View Transparent Pricing
                </button>
              </div>
            </motion.div>

            {/* Interactive Live Studio Preview (Apple-Grade Pro Parallax Showcase) */}
            <motion.div
              style={{
                y: smoothHeroStudioY,
                scale: smoothHeroStudioScale,
                rotateX: heroStudioRotate,
              }}
              className="sh-hero-studio"
            >
              <div className="sh-studio-topbar">
                <div className="sh-studio-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="sh-studio-titlebar">
                  SallyIP Studio Pro v4.2 · Confidential Matter Vault
                </div>
                <div className="sh-studio-status">
                  <span className="live-dot" />
                  <span>Hardware Isolation Active</span>
                </div>
              </div>

              <div className="sh-studio-tabs">
                {HERO_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHeroTab(tab.id)}
                    className={`sh-studio-tab-btn ${activeHeroTab === tab.id ? 'active' : ''}`}
                    type="button"
                  >
                    <BookmarkCheck size={13} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {currentHeroTab.type === "image" ? (
                <div className="sh-studio-shot-view">
                  <button
                    type="button"
                    className="sh-studio-shot-clickable"
                    onClick={onOpenChat}
                    aria-label={`${currentHeroTab.label} screenshot. Click to launch live workspace.`}
                  >
                    <picture>
                      <source srcSet={currentHeroTab.webp} type="image/webp" />
                      <img
                        src={currentHeroTab.png}
                        alt={currentHeroTab.alt}
                        className="sh-studio-shot-img"
                        width={1424}
                        height={749}
                        loading="eager"
                        decoding="async"
                      />
                    </picture>
                    <div className="sh-studio-shot-overlay" />
                    <span className="sh-studio-shot-hover-hint">
                      Launch Interactive Studio <ArrowRight size={12} />
                    </span>
                  </button>
                  <div className="sh-studio-shot-footer">
                    <div className="sh-studio-shot-caption">
                      <Shield size={14} color="#10b981" />
                      <span>{currentHeroTab.caption}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "11px", color: "#71717a", fontFamily: "ui-monospace, monospace" }}>
                        {currentHeroTab.sub}
                      </span>
                      <button
                        type="button"
                        className="sh-btn-minimal"
                        style={{ padding: "5px 12px", fontSize: "11px", gap: 6 }}
                        onClick={onOpenChat}
                      >
                        Launch Studio <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ background: "#0b0c11", borderBottom: "1px solid var(--sh-border-subtle)", padding: "8px 16px", display: "flex", gap: 8 }}>
                    {STUDIO_TABS.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setActiveStudioTab(st.id)}
                        className={`sh-studio-tab-btn ${activeStudioTab === st.id ? 'active' : ''}`}
                        style={{ padding: "6px 14px", fontSize: "11px", borderRadius: "6px" }}
                      >
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="sh-studio-body">
                    <div className="sh-studio-left">
                      <div className="sh-studio-matter-header">
                        <span className="sh-studio-matter-id">{studioData.matterId}</span>
                        <span className="sh-stat-tag blue">LIVE INSPECTION</span>
                      </div>
                      <h4 className="sh-studio-matter-heading">{studioData.matterTitle}</h4>

                      <div className="sh-claim-element-box">
                        <div className="sh-claim-meta">
                          <span>CLAIM ELEMENT BREAKDOWN</span>
                          <span>USPTO 37 CFR § 1.75</span>
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                          {studioData.elementTitle}
                        </div>
                        <p className="sh-claim-text">{studioData.elementText}</p>
                        <div className="sh-claim-statutory-row">
                          {studioData.tags.map((tag, idx) => (
                            <span key={idx} className="sh-stat-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="sh-studio-right">
                      <div>
                        <div className="sh-studio-panel-title">
                          <Terminal size={14} color="#60a5fa" />
                          <span>Retrieved Evidence & Grounding Trails</span>
                        </div>

                        <div className="sh-citation-list">
                          {studioData.citations.map((c, i) => (
                            <div key={i} className="sh-citation-item">
                              <div className="sh-citation-header">
                                <span>{c.source}</span>
                                <CheckCircle2 size={13} color="#10b981" />
                              </div>
                              <p className="sh-citation-excerpt">“{c.note}”</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="sh-studio-verify-bar">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Shield size={14} color="#10b981" />
                          <span style={{ color: "#d4d4d8", fontWeight: 500 }}>{studioData.statusScore}</span>
                        </div>
                        <button
                          type="button"
                          className="sh-btn-minimal"
                          style={{ padding: "4px 10px", fontSize: "11px" }}
                          onClick={onOpenChat}
                        >
                          Audit in Studio →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Understated Minimalist Client / Partner Trust Strip */}
            <div className="sh-hero-trust">
              <div className="sh-trust-label">
                Trusted by leading patent boutiques and corporate IP departments
              </div>
              <div className="sh-trust-logos">
                <span className="sh-trust-logo">ELLIUM IP</span>
                <span className="sh-trust-logo">COLGATE-PALMOLIVE</span>
                <span className="sh-trust-logo">MORGAN LEWIS</span>
                <span className="sh-trust-logo">BRAKE HUGHES BELLERMANN</span>
                <span className="sh-trust-logo">FINNEGAN</span>
                <span className="sh-trust-logo">LEECH TISHMAN</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Patent Lifecycle (Apple Dark Titanium Parallax) ---------------- */}
        <section id="lifecycle" ref={lifecycleRef} className="sh-lifecycle-section">
          <div className="sh-lifecycle-inner">
            <motion.div style={{ y: lifecycleHeaderY }}>
              <div className="sh-eyebrow-apple">
                <span className="dot" />
                PATENT LIFECYCLE
              </div>

              <h2 className="sh-lifecycle-title">
                One platform.
                <br />
                Zero disconnects.
              </h2>

              <p className="sh-lifecycle-desc">
                A secure, end-to-end legal intelligence platform that connects people, prior art,
                and statutory reasoning across the patent lifecycle—keeping teams in sync and decisions grounded.
              </p>

              {/* 5-Step Horizontal Navigation Bar */}
              <div className="sh-lifecycle-tabs">
                {LIFECYCLE_STAGES.map((s) => {
                  const isActive = s.id === activeStage;
                  return (
                    <button
                      key={s.id}
                      className={`sh-lifecycle-tab ${isActive ? "active" : ""}`}
                      onClick={() => setActiveStage(s.id)}
                    >
                      <span className="sh-tab-num">{s.num}</span>
                      <span className="sh-tab-label">{s.label}</span>
                      {isActive && <div className="sh-tab-dot" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Feature Showcase Split Card with Multi-Plane Parallax */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stageData.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="sh-feature-card"
              >
                <motion.div style={{ y: featureLeftY }} className="sh-feature-left">
                  <div className="sh-sub-eyebrow">
                    <span className="dot" />
                    {stageData.eyebrow}
                  </div>
                  <h3 className="sh-feature-heading">{stageData.title}</h3>
                  <p className="sh-feature-p">{stageData.desc}</p>

                  <div className="sh-feature-list">
                    {stageData.checks.map((c, i) => (
                      <div className="sh-feature-item" key={i}>
                        <span className="sh-check-icon">
                          <Check size={11} />
                        </span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>

                  <button className="sh-link-arrow" onClick={onOpenChat}>
                    Open in Studio <ArrowRight size={14} />
                  </button>
                </motion.div>

                <motion.div style={{ y: smoothFeatureRightY }} className="sh-feature-preview">
                  <div>
                    <div className="sh-preview-badge">
                      <span className="dot" />
                      {stageData.previewTag}
                    </div>
                    <div className="sh-feature-shot-wrap">
                      <picture>
                        <source srcSet={stageData.shotWebp} type="image/webp" />
                        <img
                          src={stageData.shotPng}
                          alt={stageData.shotAlt}
                          className="sh-feature-shot-img"
                          loading="lazy"
                          decoding="async"
                        />
                      </picture>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#a1a1aa", lineHeight: 1.5, marginTop: 4 }}>
                      {stageData.shotCaption}
                    </div>
                  </div>

                  <div className="sh-preview-footer">
                    <span className="sh-docx-tag">
                      <FileText size={13} /> {stageData.docx}
                    </span>
                    <span style={{ fontSize: "11px", color: "#71717a" }}>
                      Auto-verified matter export
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ---------------- Built For Patent Professionals (Apple Bento Grid Parallax) ---------------- */}
        <section id="modules" ref={modulesRef} className="sh-modules-section">
          <div className="sh-modules-inner">
            <motion.div style={{ y: modulesHeaderY }}>
              <div className="sh-eyebrow-apple">
                <span className="dot" />
                SPECIALIZED CAPABILITIES
              </div>

              <h2 className="sh-modules-title">
                Engineered for
                <br />
                patent practice.
              </h2>

              <p className="sh-modules-desc">
                Designed around the exact statutory realities of patent practice—not adapted to them.
              </p>
            </motion.div>

            <div className="sh-modules-grid">
              {/* Card 01 (Span 2) */}
              <motion.div className="sh-module-card span-2" style={{ y: smoothModCard1Y }}>
                <div>
                  <div className="sh-card-num">MODULE 01</div>
                  <h3 className="sh-card-title">Patent drafting & claim architecture</h3>
                  <p className="sh-card-text">
                    Generate complete patent applications from invention disclosures. Independent and dependent claims, technical specifications, and abstracts—fully structured and USPTO/EPO compliant.
                  </p>

                  <div className="sh-module-preview-shot">
                    <picture>
                      <source srcSet="/shots/sallyip-patent-drafting.webp" type="image/webp" />
                      <img src="/shots/sallyip-patent-drafting.png" alt="US Patent Drafting Workspace" loading="lazy" decoding="async" />
                    </picture>
                  </div>

                  <div className="sh-bar-stack">
                    <div className="sh-bar-item">
                      <div className="sh-bar-meta">
                        <span>First-Action Acceptance Readiness</span>
                        <b>92%</b>
                      </div>
                      <div className="sh-bar-track">
                        <div className="sh-bar-fill blue" style={{ width: "92%" }} />
                      </div>
                    </div>

                    <div className="sh-bar-item">
                      <div className="sh-bar-meta">
                        <span>Drafting Time Reduction</span>
                        <b>78%</b>
                      </div>
                      <div className="sh-bar-track">
                        <div className="sh-bar-fill orange" style={{ width: "78%" }} />
                      </div>
                    </div>

                    <div className="sh-bar-item">
                      <div className="sh-bar-meta">
                        <span>Outside Counsel Efficiency Gain</span>
                        <b>65%</b>
                      </div>
                      <div className="sh-bar-track">
                        <div className="sh-bar-fill gray" style={{ width: "65%" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Explore Drafting Studio →
                  </button>
                </div>
              </motion.div>

              {/* Card 02 */}
              <motion.div className="sh-module-card" style={{ y: smoothModCard2Y }}>
                <div>
                  <div className="sh-card-num">MODULE 02</div>
                  <h3 className="sh-card-title">Office action defense</h3>
                  <p className="sh-card-text">
                    Dissect 35 U.S.C. §§ 101, 102, 103, and 112 examiner rejections with automated case law citations and persuasive response drafting.
                  </p>
                  <div className="sh-module-preview-shot">
                    <picture>
                      <source srcSet="/shots/sallyip-patent-drafting-focus.webp" type="image/webp" />
                      <img src="/shots/sallyip-patent-drafting-focus.png" alt="Office Action Response Matrix" loading="lazy" decoding="async" />
                    </picture>
                  </div>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Explore OA Rebuttal →
                  </button>
                </div>
              </motion.div>

              {/* Card 03 */}
              <motion.div className="sh-module-card" style={{ y: smoothModCard3Y }}>
                <div>
                  <div className="sh-card-num">MODULE 03</div>
                  <h3 className="sh-card-title">150M+ Prior art radar</h3>
                  <p className="sh-card-text">
                    Search across 150M+ global patents with semantic understanding. Surface limitation-level prior art with exact passage quotes.
                  </p>
                  <div className="sh-module-preview-shot">
                    <picture>
                      <source srcSet="/shots/sallyip-chat-actions-focus.webp" type="image/webp" />
                      <img src="/shots/sallyip-chat-actions-focus.png" alt="Prior Art Search Quick Actions" loading="lazy" decoding="async" />
                    </picture>
                  </div>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Explore Prior Art →
                  </button>
                </div>
              </motion.div>

              {/* Card 04 */}
              <motion.div className="sh-module-card" style={{ y: smoothModCard4Y }}>
                <div>
                  <div className="sh-card-num">MODULE 04</div>
                  <h3 className="sh-card-title">Patentability assessment</h3>
                  <p className="sh-card-text">
                    Evaluate novelty and non-obviousness before filing. Receive structured statutory assessments with confidence scoring and evidence links.
                  </p>
                  <div className="sh-module-preview-shot">
                    <picture>
                      <source srcSet="/shots/sallyip-chat-home.webp" type="image/webp" />
                      <img src="/shots/sallyip-chat-home.png" alt="Patentability Evaluation Workspace" loading="lazy" decoding="async" />
                    </picture>
                  </div>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Explore Novelty →
                  </button>
                </div>
              </motion.div>

              {/* Card 05 */}
              <motion.div className="sh-module-card" style={{ y: smoothModCard5Y }}>
                <div>
                  <div className="sh-card-num">MODULE 05</div>
                  <h3 className="sh-card-title">Freedom to operate & FTO</h3>
                  <p className="sh-card-text">
                    Identify infringement risks prior to product launch. Map target claims against competitor technology to construct robust clearance charts.
                  </p>
                  <div className="sh-module-preview-shot">
                    <picture>
                      <source srcSet="/shots/sallyip-workspaces.webp" type="image/webp" />
                      <img src="/shots/sallyip-workspaces.png" alt="Specialist Legal Workspaces FTO" loading="lazy" decoding="async" />
                    </picture>
                  </div>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Explore FTO Clearance →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------- Metrics Section (Apple Massive Numbers Parallax) ---------------- */}
        <section id="metrics" ref={metricsRef} className="sh-metrics-section">
          <div className="sh-metrics-inner">
            <div className="sh-metrics-grid">
              <motion.div className="sh-metric-box" style={{ y: smoothMetricOddY }}>
                <div className="sh-metric-val">150M+</div>
                <div className="sh-metric-sub">Global patent records indexed & searchable</div>
              </motion.div>

              <motion.div className="sh-metric-box" style={{ y: smoothMetricEvenY }}>
                <div className="sh-metric-val">25k+</div>
                <div className="sh-metric-sub">Applications drafted with verifiable provenance</div>
              </motion.div>

              <motion.div className="sh-metric-box" style={{ y: smoothMetricOddY }}>
                <div className="sh-metric-val blue">
                  <sup>up to</sup> 70%
                </div>
                <div className="sh-metric-sub">Reduction in first-draft drafting cycle time</div>
              </motion.div>

              <motion.div className="sh-metric-box" style={{ y: smoothMetricEvenY }}>
                <div className="sh-metric-val blue">2h+</div>
                <div className="sh-metric-sub">Hours saved per attorney, every single day</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------- Testimonials (Minimalist Apple Grid Parallax) ---------------- */}
        <section ref={testimonialsRef} className="sh-testimonials-section">
          <div className="sh-testimonials-inner">
            <div className="sh-test-header">
              <div className="sh-eyebrow-apple" style={{ justifyContent: "center" }}>
                <span className="dot" />
                PRACTITIONER TESTIMONIALS
              </div>
              <h2 className="sh-lifecycle-title" style={{ margin: "14px 0 0" }}>
                Trusted by IP professionals.
              </h2>
            </div>

            <div className="sh-testimonials-grid">
              <motion.div className="sh-quote-card" style={{ y: smoothTestCard1Y }}>
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    SallyIP excels in providing quoted citations linked directly to their sources.
                    Whether drafting applications or OA responses, it analyzes complex technical material accurately without hallucinating legal authority.
                  </p>
                </div>
                <div className="sh-quote-author">Partner · Global IP Practice Group</div>
              </motion.div>

              <motion.div className="sh-quote-card" style={{ y: smoothTestCard2Y }}>
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    Our team loves the flexibility and seamless workflow integration enabled by the Microsoft Word & DOCX export.
                    It has become an indispensable copilot for our patent engineering staff.
                  </p>
                </div>
                <div className="sh-quote-author">Chief IP Counsel · High-Tech Enterprise</div>
              </motion.div>

              <motion.div className="sh-quote-card" style={{ y: smoothTestCard3Y }}>
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    During our evaluation period across multiple generative tools, SallyIP was the only one that achieved a 0% dangling citation rate.
                    The legal reasoning is disciplined and verifiable.
                  </p>
                </div>
                <div className="sh-quote-author">Senior Patent Attorney · Life Sciences Firm</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------- Security & Integrations (Multi-Plane Parallax) ---------------- */}
        <section id="security" ref={securityRef} className="sh-sec-int-section">
          <div className="sh-sec-int-inner">
            {/* Left: Security */}
            <motion.div className="sh-sec-col" style={{ y: smoothSecColLeftY }}>
              <div className="sh-eyebrow-apple">
                <span className="dot" />
                CONFIDENTIALITY & SECURITY
              </div>

              <h2 className="sh-sec-title">
                Enterprise-grade
                <br />
                isolation.
              </h2>

              <p className="sh-sec-desc">
                Your patent disclosures and trade secrets are protected by bank-level security.
                Zero training on customer data, ephemeral inference, and customer-managed encryption keys.
              </p>

              <div className="sh-badges-grid">
                <div className="sh-cert-badge">
                  <Shield size={14} /> Zero Data Retention
                </div>
                <div className="sh-cert-badge">
                  <Shield size={14} /> SOC 2 Type II
                </div>
                <div className="sh-cert-badge">
                  <Shield size={14} /> ISO 27001
                </div>
                <div className="sh-cert-badge">
                  <Lock size={14} /> GDPR Compliant
                </div>
                <div className="sh-cert-badge">
                  <Shield size={14} /> ABA Rule 1.6 Privilege
                </div>
              </div>

              <div>
                <button
                  className="sh-card-link"
                  onClick={onOpenTransparency}
                >
                  View Security Architecture & Verification Desk →
                </button>
              </div>
            </motion.div>

            {/* Right: Integrations */}
            <motion.div style={{ y: smoothSecColRightY }}>
              <div className="sh-eyebrow-apple">
                <span className="dot" />
                WORKFLOW INTEGRATIONS
              </div>

              <div className="sh-int-grid">
                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <FileText size={16} />
                  </div>
                  <div className="sh-int-title">Microsoft Word</div>
                  <p className="sh-int-text">
                    Draft, amend, and review patent claims directly within your native Word environment.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <Mail size={16} />
                  </div>
                  <div className="sh-int-title">Outlook & Mail</div>
                  <p className="sh-int-text">
                    Monitor office action deadlines and receive instant statutory response outlines.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <Database size={16} />
                  </div>
                  <div className="sh-int-title">Docketing Platforms</div>
                  <p className="sh-int-text">
                    Two-way synchronization with leading IP management systems and matter vaults.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <FileCode size={16} />
                  </div>
                  <div className="sh-int-title">REST API & SDK</div>
                  <p className="sh-int-text">
                    Automate custom patentability pipelines with comprehensive serverless APIs.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ---------------- Modern Minimalist Footer ---------------- */}
      <ModernGradientFooter
        onDemoClick={onOpenChat}
        onNavigate={(target) => {
          if (onNavigate) {
            onNavigate(target);
          } else if (target === "pricing") {
            handleNavPricing();
          } else if (target === "benchmarks") {
            handleNavBenchmarks();
          } else if (target === "home") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            window.location.hash = target;
          }
        }}
      />
    </div>
  );
}
