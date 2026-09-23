/**
 * SallyDocumentsModal.jsx
 * 
 * Official Legal Documents Catalogue for Sally IP.
 * Showcases all 20 verified legal and patent documents Sally can draft, analyze, and file.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  X,
  ArrowRight,
  ShieldCheck,
  Globe,
  Sparkles,
  Layers,
  Scale,
  CheckCircle2,
  BookOpen,
  Filter,
  FileCheck,
} from 'lucide-react';

export const SALLY_DOCUMENTS = [
  {
    number: "001",
    id: "utility-patent-application",
    name: "Utility Patent Application",
    category: "Patent Applications",
    categoryBadge: "PATENT_FILING",
    authority: "USPTO (35 U.S.C. § 111(a) / 37 CFR 1.53(b))",
    jurisdiction: "United States (USPTO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 9,
    description: "Complete statutory US utility patent application specification including Title, Technical Field, Background, Summary of Invention, Brief Description of Drawings, Detailed Description of Embodiments, Claims Set, and Abstract.",
    command: "Draft a Utility Patent Application for this invention",
    tags: ["Utility", "Non-Provisional", "USPTO", "Specification", "Claims"]
  },
  {
    number: "002",
    id: "provisional-patent-application",
    name: "Provisional Patent Application",
    category: "Patent Applications",
    categoryBadge: "PRIORITY_FILING",
    authority: "USPTO (35 U.S.C. § 111(b) / 37 CFR 1.53(c))",
    jurisdiction: "United States (USPTO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 7,
    description: "Low-barrier US priority application securing a 12-month priority filing date under 35 U.S.C. § 119(e) with technical enablement disclosure, informal figure descriptions, and optional initial claims.",
    command: "Draft a Provisional Patent Application for this invention",
    tags: ["Provisional", "Priority", "USPTO", "Invention Disclosure"]
  },
  {
    number: "003",
    id: "non-provisional-patent-application",
    name: "Non-Provisional Patent Application",
    category: "Patent Applications",
    categoryBadge: "EXAMINATION_FILING",
    authority: "USPTO (35 U.S.C. § 111(a) claiming 119(e))",
    jurisdiction: "United States (USPTO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 10,
    description: "Formal examined US utility patent filing claiming priority from one or more prior provisional filings, structured with formal claims, antecedent basis verification, and oath/declaration compliance.",
    command: "Draft a Non-Provisional Patent Application claiming priority",
    tags: ["Non-Provisional", "Conversion", "USPTO", "Formal Examination"]
  },
  {
    number: "004",
    id: "design-patent-application",
    name: "Design Patent Application",
    category: "Patent Applications",
    categoryBadge: "ORNAMENTAL_DESIGN",
    authority: "USPTO (35 U.S.C. § 171 / 37 CFR 1.151)",
    jurisdiction: "United States (USPTO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 8,
    description: "Ornamental design patent application protecting new, original, and ornamental designs for an article of manufacture with standardized drawing view descriptions and single statutory ornamental claim.",
    command: "Draft a Design Patent Application",
    tags: ["Design", "Ornamental", "USPTO", "Drawing Views", "35 U.S.C. 171"]
  },
  {
    number: "005",
    id: "plant-patent-application",
    name: "Plant Patent Application",
    category: "Patent Applications",
    categoryBadge: "BOTANICAL_PATENT",
    authority: "USPTO (35 U.S.C. § 161 / 37 CFR 1.161)",
    jurisdiction: "United States (USPTO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 8,
    description: "Specialized US patent application for asexually reproduced distinct and new plant varieties with botanical Latin nomenclature, parentage history, asexual reproduction verification, and single statutory claim.",
    command: "Draft a Plant Patent Application",
    tags: ["Plant", "Asexual Reproduction", "Botanical", "USPTO", "35 U.S.C. 161"]
  },
  {
    number: "006",
    id: "pct-international-patent-application",
    name: "PCT International Patent Application",
    category: "International & Regional",
    categoryBadge: "PCT_INTERNATIONAL",
    authority: "WIPO (PCT Articles 3-11 / PCT Administrative Instructions)",
    jurisdiction: "International (157+ Contracting States)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 10,
    description: "Unified international application filed under the Patent Cooperation Treaty to establish international priority across 157+ contracting states, supporting receiving offices and International Searching Authority routing.",
    command: "Draft a PCT International Patent Application",
    tags: ["PCT", "WIPO", "International Priority", "157 States", "ISR Routing"]
  },
  {
    number: "007",
    id: "national-phase-patent-application",
    name: "National Phase Patent Application",
    category: "International & Regional",
    categoryBadge: "NATIONAL_PHASE_ENTRY",
    authority: "PCT Articles 22 & 39(1) / Designated National Offices",
    jurisdiction: "Designated National & Regional Offices (US, EP, JP, etc.)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 9,
    description: "Statutory national and regional phase entry filing converting an active PCT international application at the 30/31-month milestone into national examination proceedings with translation verification.",
    command: "Draft a National Phase Patent Application",
    tags: ["National Phase", "PCT 22/39", "Entry Milestone", "Designated Offices"]
  },
  {
    number: "008",
    id: "european-patent-application",
    name: "European Patent Application",
    category: "International & Regional",
    categoryBadge: "EPO_REGIONAL",
    authority: "EPO (EPC Article 75 / Rule 35-50 EPC)",
    jurisdiction: "European Patent Organisation (39 Member States)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft & File",
    sections: 9,
    description: "Direct first-instance European patent filing under the European Patent Convention featuring EPC two-part claim formulation (characterizing portion) and problem-solution approach.",
    command: "Draft a European Patent Application (EPO)",
    tags: ["EPO", "EPC", "Direct Filing", "Two-Part Claims", "Problem-Solution"]
  },
  {
    number: "009",
    id: "patent-specification",
    name: "Patent Specification",
    category: "Specifications & Claims",
    categoryBadge: "TECHNICAL_SPECIFICATION",
    authority: "Multi-Jurisdiction (35 U.S.C. § 112 / Article 83 EPC)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT / UKIPO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 8,
    description: "Canonical complete technical disclosure specification with Title, Technical Field, Background Art, Summary of the Invention, Brief Description of Drawings, and Detailed Description of Preferred Embodiments.",
    command: "Draft a Patent Specification for this invention",
    tags: ["Specification", "Detailed Description", "Enablement", "Technical Field"]
  },
  {
    number: "010",
    id: "patent-claims-set",
    name: "Patent Claims Set",
    category: "Specifications & Claims",
    categoryBadge: "STATUTORY_CLAIMS",
    authority: "Multi-Jurisdiction (37 CFR 1.75 / Rule 43 EPC)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 6,
    description: "Hierarchical independent and dependent patent claims set engineered with strict antecedent basis tracking, statutory transitional phrasing (comprising/consisting of), and multi-tier scope protection.",
    command: "Draft a Patent Claims Set for this invention",
    tags: ["Claims", "Independent Claims", "Dependent Claims", "Antecedent Basis"]
  },
  {
    number: "011",
    id: "patent-abstract",
    name: "Patent Abstract",
    category: "Specifications & Claims",
    categoryBadge: "STATUTORY_ABSTRACT",
    authority: "USPTO (37 CFR 1.72(b)) / EPO (Rule 47 EPC) / WIPO (PCT Rule 8)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 4,
    description: "Statutory concise technical summary of the disclosure strictly under 150 words, stating the technical field, the problem addressed, the inventive solution, and principal commercial application.",
    command: "Draft a Patent Abstract for this invention",
    tags: ["Abstract", "150 Words", "Technical Summary", "Rule 47 EPC"]
  },
  {
    number: "012",
    id: "patent-drawings-instructions",
    name: "Patent Drawings Instructions",
    category: "Specifications & Claims",
    categoryBadge: "FORMAL_DRAWINGS",
    authority: "USPTO (37 CFR 1.84) / PCT (Rule 11) / EPO (Rule 46 EPC)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 8,
    description: "Comprehensive formal drawing execution instructions for patent draftspersons, providing figure plans, lead lines, reference numeral registries, perspective view requirements, and margin standards.",
    command: "Prepare Patent Drawings Instructions for this invention",
    tags: ["Drawings", "Figure Plan", "Reference Numerals", "37 CFR 1.84", "Draftsperson"]
  },
  {
    number: "013",
    id: "invention-disclosure-form",
    name: "Invention Disclosure Form (IDF)",
    category: "Analysis & Clearance",
    categoryBadge: "INVENTION_INTAKE",
    authority: "Corporate IP Governance & Patent Committee Intake",
    jurisdiction: "Global Enterprise IP Operations",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 9,
    description: "Enterprise innovation harvest and intake form capturing inventor attribution, technical problem solved, inventive concepts, alternative embodiments, commercial readiness, and public disclosure dates.",
    command: "Prepare an Invention Disclosure Form (IDF)",
    tags: ["IDF", "Invention Disclosure", "Harvesting", "Inventors", "Prior Art"]
  },
  {
    number: "014",
    id: "patentability-assessment",
    name: "Patentability Assessment",
    category: "Analysis & Clearance",
    categoryBadge: "PATENTABILITY_ANALYSIS",
    authority: "Multi-Jurisdiction (35 U.S.C. §§ 101/102/103, EPC Arts 52/54/56)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 8,
    description: "Evidence-linked assessment evaluating statutory subject matter eligibility (Alice/Mayo test), novelty against prior art, and non-obviousness/inventive step under statutory guidelines.",
    command: "Prepare a Patentability Assessment for this invention",
    tags: ["Patentability", "Eligibility", "Alice 101", "Novelty", "Non-Obviousness"]
  },
  {
    number: "015",
    id: "patent-novelty-opinion",
    name: "Patent Novelty Opinion",
    category: "Analysis & Clearance",
    categoryBadge: "NOVELTY_OPINION",
    authority: "35 U.S.C. § 102 / Article 54 EPC / Section 29 Patents Act 1977",
    jurisdiction: "Multi-Jurisdiction (US / EP / UK / JP)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 7,
    description: "Formal legal opinion analyzing whether proposed patent claims are anticipated by prior art under the four-corners single-reference anticipation doctrine with element-by-element claim charting.",
    command: "Prepare a Patent Novelty Opinion for these claims",
    tags: ["Novelty", "Anticipation", "102 Opinion", "Claim Charting", "Prior Art"]
  },
  {
    number: "016",
    id: "freedom-to-operate-opinion",
    name: "Freedom-to-Operate (FTO) Opinion",
    category: "Analysis & Clearance",
    categoryBadge: "COMMERCIAL_CLEARANCE",
    authority: "Multi-Jurisdiction Pre-Launch Clearance & Infringement Risk",
    jurisdiction: "Territorial (US, EP, National Rights)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 25,
    description: "Pre-launch commercial clearance opinion with all-limitations claim mapping, status verification, patent family disaggregation, design-around pathways, and practitioner review gating.",
    command: "Prepare a Freedom-to-Operate Opinion for this product",
    tags: ["FTO", "Clearance", "Infringement Risk", "All-Limitations", "Claim Mapping"]
  },
  {
    number: "017",
    id: "patent-invalidity-opinion",
    name: "Patent Invalidity Opinion",
    category: "Analysis & Clearance",
    categoryBadge: "CONTESTED_INVALIDITY",
    authority: "Litigation & Post-Grant Proceedings (35 U.S.C. §§ 102/103/112)",
    jurisdiction: "Contested Forums (US Federal Court / PTAB / UPC / EPO)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Draft",
    sections: 11,
    description: "Adversarial invalidity challenge analyzing anticipation, obviousness, and written description/enablement deficiencies to challenge and revoke granted third-party competitor patents.",
    command: "Prepare a Patent Invalidity Opinion against this patent",
    tags: ["Invalidity", "PTAB", "Obviousness", "Anticipation", "Competitor Challenge"]
  },
  {
    number: "018",
    id: "patent-landscape-report",
    name: "Patent Landscape Report",
    category: "Analysis & Clearance",
    categoryBadge: "PORTFOLIO_INTELLIGENCE",
    authority: "Competitive Intelligence & Technology Forecasting",
    jurisdiction: "Global Patent Corpora (WIPO / EPO / USPTO / CNIPA / JPO)",
    capability: "L1_ROUTABLE",
    status: "Ready to Analyze",
    sections: 10,
    description: "Comprehensive macro-level patent intelligence report analyzing global filing trends, competitor portfolio distributions, technological white spaces, and filing momentum over time.",
    command: "Prepare a Patent Landscape Report for this technology sector",
    tags: ["Landscape", "Competitor Analytics", "Filing Trends", "White Space", "Portfolio"]
  },
  {
    number: "019",
    id: "patent-prior-art-search-report",
    name: "Patent Prior-Art Search Report",
    category: "Search & Claim Mapping",
    categoryBadge: "PRIOR_ART_SEARCH",
    authority: "USPTO / EPO / PCT / WIPO (35 U.S.C. §§ 102/103, Rule 33 PCT)",
    jurisdiction: "Global Patent & NPL Corpora",
    capability: "L3_DRAFTABLE",
    status: "Ready to Search & Report",
    sections: 9,
    description: "Canonical evidence-driven prior-art research report featuring explicit search targets, reproducible query strategies, publication date verification, family normalization, and limitation-level evidence mapping.",
    command: "Conduct a Prior-Art Search Report for this invention",
    tags: ["Prior Art", "Novelty Search", "NPL", "Citations", "Reference Registry", "35 U.S.C. 102/103"]
  },
  {
    number: "020",
    id: "patent-claim-chart",
    name: "Patent Claim Chart",
    category: "Search & Claim Mapping",
    categoryBadge: "CLAIM_CHARTING",
    authority: "Multi-Jurisdiction (37 CFR 1.75 / Rule 43 EPC / FRCP 33/34)",
    jurisdiction: "Multi-Jurisdiction (USPTO / EPO / PCT / National Courts)",
    capability: "L3_DRAFTABLE",
    status: "Ready to Chart",
    sections: 8,
    description: "Structured, evidence-linked claim breakdown decomposing patent independent and dependent claims into discrete limitations mapped against verified prior-art references or accused product features.",
    command: "Create a Patent Claim Chart for these claims",
    tags: ["Claim Chart", "Limitation Mapping", "Antecedent Basis", "Element Breakdown", "Infringement/Invalidity"]
  }
];

const DOCUMENT_CATEGORIES = [
  "All Documents",
  "Patent Applications",
  "International & Regional",
  "Specifications & Claims",
  "Analysis & Clearance",
  "Search & Claim Mapping",
];

export function SallyDocumentsModal({ isOpen, onClose, onSelectDocument }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Documents");

  const filteredDocuments = useMemo(() => {
    return SALLY_DOCUMENTS.filter((doc) => {
      // Category filter
      if (selectedCategory !== "All Documents" && doc.category !== selectedCategory) {
        return false;
      }
      // Search term filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.number.includes(q) ||
        doc.id.toLowerCase().includes(q) ||
        doc.authority.toLowerCase().includes(q) ||
        doc.jurisdiction.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="beebotModalBackdrop" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="beebotModalCard"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 25px 70px -15px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="beebotModalHeader"
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="beebotModalTitle" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Sally IP Official Documents Catalogue
                </h3>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {SALLY_DOCUMENTS.length} Verified Documents · Patents, Trademarks &amp; Copyrights
                </span>
              </div>
              <p className="beebotModalSubtitle" style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                Verified Intellectual Property suite across Patents, Trademarks, and Copyrights — draft statutory filings, clearance opinions, and licensing instruments with Sally.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="beebotModalClose"
            title="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            padding: '16px 28px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder={`Search across patents, trademarks, copyrights, claims, FTO, and agreements (e.g. utility patent, trademark, copyright, NDA)...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: '0.88rem',
                outline: 'none',
                background: '#f8fafc',
                color: '#0f172a',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#10b981')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {DOCUMENT_CATEGORIES.map((cat) => {
              const count = cat === "All Documents"
                ? SALLY_DOCUMENTS.length
                : SALLY_DOCUMENTS.filter((d) => d.category === cat).length;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                    background: isActive ? '#ecfdf5' : '#ffffff',
                    color: isActive ? '#059669' : '#64748b',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{cat}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: isActive ? '#d1fae5' : '#f1f5f9',
                      color: isActive ? '#047857' : '#64748b',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body - 18 Document Cards Grid */}
        <div
          className="beebotModalBody"
          style={{
            padding: '20px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(410px, 1fr))',
            gap: 16,
            background: '#f8fafc',
          }}
        >
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                {/* Top badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        color: '#f8fafc',
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        letterSpacing: '0.04em',
                      }}
                    >
                      #{doc.number}
                    </span>
                    <span
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {doc.category}
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.7rem',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {doc.status}
                  </span>
                </div>

                {/* Title */}
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                  {doc.name}
                </h4>

                {/* Statutory Authority */}
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Scale size={12} color="#6366f1" />
                  <span style={{ fontWeight: 500 }}>{doc.authority}</span>
                </div>

                {/* Description */}
                <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                  {doc.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div
                style={{
                  paddingTop: 12,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {doc.sections} statutory sections
                </span>
                <button
                  onClick={() => onSelectDocument(doc)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 14px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)')}
                >
                  <span>Draft with Sally</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Summary */}
        <div
          style={{
            padding: '12px 28px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748b',
          }}
        >
          <span>
            Showing <strong>{filteredDocuments.length}</strong> of <strong>{SALLY_DOCUMENTS.length}</strong> official intellectual property documents (Patents, Trademarks &amp; Copyrights)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Strict All-Limitations Discipline & Statutory Format Compliant</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default SallyDocumentsModal;
