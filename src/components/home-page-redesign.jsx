import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Cpu
} from "lucide-react";
import SallyTopNav from "./sally-topnav";
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
    previewLines: [
      { w: "w-80", accent: true },
      { w: "w-90" },
      { w: "w-60" }
    ],
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
    previewLines: [
      { w: "w-90", accent: true },
      { w: "w-80" },
      { w: "w-60" }
    ],
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
    previewLines: [
      { w: "w-90", accent: true },
      { w: "w-80" },
      { w: "w-60" }
    ],
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
    previewLines: [
      { w: "w-80", accent: true },
      { w: "w-90" },
      { w: "w-60" }
    ],
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
    previewLines: [
      { w: "w-90", accent: true },
      { w: "w-80" },
      { w: "w-60" }
    ],
    docx: "FTO_Clearance_Memo.docx"
  }
];

export default function HomePageRedesign({
  onOpenChat,
  onOpenAuth,
  onOpenPricing,
  onOpenTransparency
}) {
  const [activeStage, setActiveStage] = useState("drafting");
  const stageData = LIFECYCLE_STAGES.find((s) => s.id === activeStage) || LIFECYCLE_STAGES[2];

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="sally-home">
      {/* ---------------- Topnav ---------------- */}
      <SallyTopNav
        activePage="home"
        onNavigate={(page) => {
          if (page === 'pricing') onOpenPricing ? onOpenPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onOpenChat ? onOpenChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onOpenAuth ? onOpenAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
        onOpenChat={onOpenChat}
        onOpenAuth={onOpenAuth}
      />

      <main>
        {/* ---------------- Hero Section (Image 1) ---------------- */}
        <section className="sh-hero">
          <div className="sh-hero-ambient-glow" />

          <div className="sh-hero-content">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="sh-hero-badge"
            >
              <span className="sh-badge-pill">2026</span>
              <span>Grounded Patent Intelligence — Zero Dangling Citations</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="sh-hero-title"
            >
              Patent intelligence,
              <br />
              from idea to
              <br />
              <span className="sh-gradient-text">enforcement.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="sh-hero-subtitle"
            >
              Integrated, reliable, secure.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="sh-hero-ctas"
            >
              <button className="sh-btn-white" onClick={onOpenChat}>
                Launch SallyIP Studio
              </button>
              <button className="sh-btn-glass" onClick={() => handleScrollTo("lifecycle")}>
                <Play size={14} fill="currentColor" /> Watch overview
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="sh-hero-trust"
            >
              <div className="sh-trust-label">
                Trusted by leading patent firms and IP departments
              </div>
              <div className="sh-trust-logos">
                <span className="sh-trust-logo">ellium</span>
                <span className="sh-trust-logo">COLGATE-PALMOLIVE</span>
                <span className="sh-trust-logo"><span>Morgan Lewis</span></span>
                <span className="sh-trust-logo">Brake Hughes Bellermann LLP</span>
                <span className="sh-trust-logo">LEECH | TISHMA</span>
                <span className="sh-trust-logo">FINNEGAN</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------- Patent Lifecycle (Light Sand Section) (Image 2) ---------------- */}
        <section id="lifecycle" className="sh-lifecycle-section">
          <div className="sh-lifecycle-inner">
            <div className="sh-eyebrow-light">
              <span className="dot" />
              PATENT LIFECYCLE
            </div>

            <h2 className="sh-lifecycle-title">
              One platform.
              <br />
              Zero disconnects.
            </h2>

            <p className="sh-lifecycle-desc">
              A secure, end-to-end AI platform that connects people, insights, and execution across the patent lifecycle—keeping teams in sync, decisions grounded in context, and work moving forward without friction.
            </p>

            {/* 5-Step Horizontal Bar */}
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
                    <span className="sh-tab-dot" />
                  </button>
                );
              })}
            </div>

            {/* Feature Showcase Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stageData.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="sh-feature-card"
              >
                <div className="sh-feature-left">
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
                          <Check size={12} />
                        </span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>

                  <button className="sh-link-arrow" onClick={onOpenChat}>
                    Learn more →
                  </button>
                </div>

                <div className="sh-feature-preview">
                  <div className="sh-preview-glow" />
                  <div>
                    <div className="sh-preview-badge">
                      <span className="dot" />
                      {stageData.previewTag}
                    </div>
                    <div className="sh-preview-doc">
                      <div className="sh-doc-title">{stageData.previewTitle}</div>
                      {stageData.previewLines.map((line, idx) => (
                        <div
                          key={idx}
                          className={`sh-doc-line ${line.w} ${line.accent ? "accent" : ""}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="sh-preview-footer">
                    <span className="sh-docx-tag">
                      <FileText size={14} /> {stageData.docx}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      Auto-saved to Library
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ---------------- Built For Patent Professionals (Dark Bento Grid) (Image 3) ---------------- */}
        <section id="modules" className="sh-modules-section">
          <div className="sh-modules-inner">
            <div className="sh-eyebrow-dark">
              <span className="dot" />
              MODULES
            </div>

            <h2 className="sh-modules-title">
              Built for patent
              <br />
              professionals.
            </h2>

            <p className="sh-modules-desc">
              Designed around the realities of patent practice—not adapted to them.
            </p>

            <div className="sh-modules-grid">
              {/* Card 01 (Span 2) */}
              <div className="sh-module-card span-2">
                <div>
                  <div className="sh-card-num">01</div>
                  <h3 className="sh-card-title">Patent drafting</h3>
                  <p className="sh-card-text">
                    Generate complete patent applications from invention disclosures. Claims, specifications, and abstracts—structured and USPTO-compliant.
                  </p>

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
                    Learn more →
                  </button>
                </div>
              </div>

              {/* Card 02 */}
              <div className="sh-module-card">
                <div>
                  <div className="sh-card-num">02</div>
                  <h3 className="sh-card-title">Office action responses</h3>
                  <p className="sh-card-text">
                    Analyze examiner rejections and generate structured responses with relevant case law citations.
                  </p>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Learn more →
                  </button>
                </div>
              </div>

              {/* Card 03 */}
              <div className="sh-module-card">
                <div>
                  <div className="sh-card-num">03</div>
                  <h3 className="sh-card-title">Prior art search</h3>
                  <p className="sh-card-text">
                    Search across 120M+ patents with semantic understanding. Surface relevant prior art in minutes, not hours.
                  </p>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Learn more →
                  </button>
                </div>
              </div>

              {/* Card 04 */}
              <div className="sh-module-card">
                <div>
                  <div className="sh-card-num">04</div>
                  <h3 className="sh-card-title">Patentability assessment</h3>
                  <p className="sh-card-text">
                    Evaluate novelty and non-obviousness before filing. Get a structured assessment with confidence scores.
                  </p>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Learn more →
                  </button>
                </div>
              </div>

              {/* Card 05 */}
              <div className="sh-module-card">
                <div>
                  <div className="sh-card-num">05</div>
                  <h3 className="sh-card-title">Risk assessment</h3>
                  <p className="sh-card-text">
                    Identify potential infringement risks before product launch. Map claims against your technology to ensure freedom-to-operate.
                  </p>
                </div>
                <div className="sh-card-actions">
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Learn more about FTO →
                  </button>
                  <button className="sh-card-link" onClick={onOpenChat}>
                    Learn more about Invalidity →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Metrics Banner (Light Sand) (Image 4) ---------------- */}
        <section id="metrics" className="sh-metrics-section">
          <div className="sh-metrics-inner">
            <div className="sh-metrics-grid">
              <div className="sh-metric-box">
                <div className="sh-metric-val">150M+</div>
                <div className="sh-metric-sub">Patents indexed and searchable on SallyIP</div>
              </div>

              <div className="sh-metric-box">
                <div className="sh-metric-val">25k+</div>
                <div className="sh-metric-sub">Patent applications drafted with SallyIP</div>
              </div>

              <div className="sh-metric-box">
                <div className="sh-metric-val blue">
                  <sup>up to</sup> 70%
                </div>
                <div className="sh-metric-sub">Drafting time reduction on a full patent application</div>
              </div>

              <div className="sh-metric-box">
                <div className="sh-metric-val blue">2h+</div>
                <div className="sh-metric-sub">Saved per attorney, per day</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Testimonials (Light Sand Section) (Image 4) ---------------- */}
        <section className="sh-testimonials-section">
          <div className="sh-testimonials-inner">
            <div className="sh-test-header">
              <div className="sh-eyebrow-light" style={{ justifyContent: "center" }}>
                <span className="dot" />
                WHAT THEY SAY
              </div>
              <h2 className="sh-lifecycle-title" style={{ margin: "16px 0 0" }}>
                Trusted by IP professionals.
              </h2>
            </div>

            <div className="sh-testimonials-grid">
              <div className="sh-quote-card">
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    SallyIP excels in terms of its structured multi-step model for analyzing materials and providing quoted citations linked to their sources. Whether drafting applications or Responses, it analyzes complex material quickly and accurately.
                  </p>
                </div>
                <div className="sh-quote-author">Partner · Global IP Practice Group</div>
              </div>

              <div className="sh-quote-card">
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    SLW is proud to be at the forefront of innovation by leveraging cutting-edge technology like SallyIP. In particular, our lawyers like the tool's flexibility and seamless integration into our workflow, enabled by the Microsoft Word & DOCX export.
                  </p>
                </div>
                <div className="sh-quote-author">Chief IP Counsel · High-Tech Enterprise</div>
              </div>

              <div className="sh-quote-card">
                <div>
                  <div className="sh-quote-mark">“</div>
                  <p className="sh-quote-text">
                    During our trial period, when we were testing different tools, we observed an approximately 20% improvement in efficiency for drafting and prosecution with zero hallucinated or dangling citations.
                  </p>
                </div>
                <div className="sh-quote-author">Senior Patent Attorney · Life Sciences Firm</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Security & Integrations (Dark Split Section) (Image 5) ---------------- */}
        <section id="security" className="sh-sec-int-section">
          <div className="sh-sec-int-inner">
            {/* Left: Security */}
            <div className="sh-sec-col">
              <div className="sh-eyebrow-dark">
                <span className="dot" />
                SECURITY & COMPLIANCE
              </div>

              <h2 className="sh-sec-title">
                Enterprise-grade
                <br />
                security.
              </h2>

              <p className="sh-sec-desc">
                Your patent data is protected by the highest industry standards. Deployed on Microsoft Azure with zero-data-retention and end-to-end encryption.
              </p>

              <div className="sh-badges-grid">
                <div className="sh-cert-badge">
                  <Shield size={16} /> ISO 42001
                </div>
                <div className="sh-cert-badge">
                  <Shield size={16} /> ISO 27001
                </div>
                <div className="sh-cert-badge">
                  <Shield size={16} /> SOC 2 Type II
                </div>
                <div className="sh-cert-badge">
                  <Lock size={16} /> GDPR
                </div>
                <div className="sh-cert-badge">
                  <Shield size={16} /> §203 StGB
                </div>
              </div>

              <div>
                <button
                  className="sh-card-link"
                  style={{ color: "#f97316" }}
                  onClick={onOpenTransparency}
                >
                  How it works ›
                </button>
              </div>
            </div>

            {/* Right: Integrations */}
            <div>
              <div className="sh-eyebrow-dark">
                <span className="dot" />
                INTEGRATIONS
              </div>

              <div className="sh-int-grid">
                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <FileText size={18} />
                  </div>
                  <div className="sh-int-title">Microsoft Word</div>
                  <p className="sh-int-text">
                    Draft and review patents directly within your familiar Word and DOCX environment.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <Mail size={18} />
                  </div>
                  <div className="sh-int-title">Outlook</div>
                  <p className="sh-int-text">
                    Manage office action deadlines and receive AI-powered response suggestions.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <Database size={18} />
                  </div>
                  <div className="sh-int-title">Docketing systems</div>
                  <p className="sh-int-text">
                    Seamless integration with leading IP management platforms.
                  </p>
                </div>

                <div className="sh-int-card">
                  <div className="sh-int-icon">
                    <FileCode size={18} />
                  </div>
                  <div className="sh-int-title">REST API</div>
                  <p className="sh-int-text">
                    Build custom integrations with a comprehensive, well-documented API.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="sh-footer">
        <div className="sh-footer-inner">
          <div className="sh-footer-copy">
            © 2026 SallyIP Inc. All rights reserved. Patent Intelligence Platform.
          </div>
          <div className="sh-footer-links">
            <button onClick={() => handleScrollTo("modules")}>Modules</button>
            <button onClick={() => handleScrollTo("lifecycle")}>Lifecycle</button>
            <button onClick={() => handleScrollTo("security")}>Security</button>
            <button onClick={onOpenTransparency}>Transparency</button>
            <button onClick={onOpenPricing}>Pricing</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
