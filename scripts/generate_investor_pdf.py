"""
Publication-grade executive investor pitch PDF generator for SallyIP.
Produces a crisp, 5-page investment memo with modern styling, clean typography,
and no font encoding glitches.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Premium Color Palette
COLOR_PRIMARY = colors.HexColor("#0B0F19")       # Deep Midnight Navy
COLOR_SECONDARY = colors.HexColor("#1E293B")     # Slate Dark
COLOR_ACCENT = colors.HexColor("#4F46E5")        # Electric Indigo
COLOR_ACCENT_LIGHT = colors.HexColor("#EEF2FF")  # Indigo Tint
COLOR_SUCCESS = colors.HexColor("#059669")       # Emerald Green
COLOR_SUCCESS_LIGHT = colors.HexColor("#ECFDF5") # Emerald Tint
COLOR_AMBER = colors.HexColor("#D97706")         # Amber
COLOR_AMBER_LIGHT = colors.HexColor("#FFFBEB")   # Amber Tint
COLOR_RED = colors.HexColor("#DC2626")           # Danger Red
COLOR_RED_LIGHT = colors.HexColor("#FEF2F2")     # Danger Tint
COLOR_TEXT_MAIN = colors.HexColor("#0F172A")     # Deep Slate
COLOR_TEXT_MUTED = colors.HexColor("#64748B")    # Muted Slate
COLOR_BG_CARD = colors.HexColor("#F8FAFC")       # Soft Canvas
COLOR_BORDER = colors.HexColor("#CBD5E1")        # Border Grey
COLOR_WHITE = colors.HexColor("#FFFFFF")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw 'Page X of Y' 
    with sleek running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        if self._pageNumber == 1:
            self.saveState()
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawCentredString(letter[0] / 2.0, 24, "STRICTLY CONFIDENTIAL - FOR ACCREDITED & QUALIFIED INVESTORS ONLY")
            self.restoreState()
            return

        self.saveState()
        # Header
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(COLOR_ACCENT)
        self.drawString(40, letter[1] - 28, "SALLYIP INC.")
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(100, letter[1] - 28, "- Series Seed / Series A Investor Briefing")
        self.drawRightString(letter[0] - 40, letter[1] - 28, "CONFIDENTIAL")
        
        # Header Divider
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(40, letter[1] - 32, letter[0] - 40, letter[1] - 32)

        # Footer Divider
        self.line(40, 36, letter[0] - 40, 36)

        # Footer Text
        self.setFont("Helvetica", 7.5)
        self.drawString(40, 24, "SallyIP - Verification-First Operating System for IP Law")
        self.drawRightString(letter[0] - 40, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(filename="report29.pdf"):
    pdf_path = os.path.abspath(filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=44,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CoverTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=28, leading=32,
        textColor=COLOR_PRIMARY, spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=12, leading=16,
        textColor=COLOR_TEXT_MUTED, spaceAfter=12
    )

    badge_style = ParagraphStyle(
        'BadgeText', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10,
        textColor=COLOR_ACCENT, alignment=0
    )

    h1_style = ParagraphStyle(
        'SectionH1', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=13, leading=16,
        textColor=COLOR_PRIMARY, spaceBefore=6, spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyMain', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=COLOR_TEXT_MAIN, spaceAfter=4
    )

    quote_style = ParagraphStyle(
        'QuoteText', parent=styles['Normal'],
        fontName='Helvetica-BoldOblique', fontSize=12, leading=16,
        textColor=COLOR_ACCENT, alignment=1
    )

    kpi_num_style = ParagraphStyle(
        'KpiNum', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=20, leading=22,
        textColor=COLOR_ACCENT, alignment=1
    )

    kpi_label_style = ParagraphStyle(
        'KpiLabel', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10,
        textColor=COLOR_TEXT_MUTED, alignment=1
    )

    th_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10.5,
        textColor=COLOR_WHITE
    )

    td_style = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10.5,
        textColor=COLOR_TEXT_MAIN
    )

    td_bold = ParagraphStyle(
        'TableCellBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=10.5,
        textColor=COLOR_PRIMARY
    )

    story = []
    page_w = letter[0] - 80

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE TEASER
    # =========================================================================
    pill_text = "CONFIDENTIAL INVESTMENT MEMO | SERIES SEED / SERIES A"
    pill_table = Table(
        [[Paragraph(f"<b>{pill_text}</b>", badge_style)]],
        colWidths=[page_w]
    )
    pill_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT_LIGHT),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pill_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("SallyIP", title_style))
    story.append(Paragraph("<b>The Verification-First Operating System for Intellectual Property Law</b>", subtitle_style))

    # Pitch Quote Box
    hook_p = Paragraph('"General AI drafts prose. SallyIP proves law."', quote_style)
    subhook_p = Paragraph(
        "Replacing high-risk, hallucination-prone models with a deterministic, citation-verified intelligence engine for the $65B+ global IP economy.",
        ParagraphStyle('SubHook', parent=body_style, alignment=1, textColor=COLOR_TEXT_MUTED, fontSize=8.5, leading=11.5)
    )
    hook_table = Table([[hook_p], [Spacer(1, 3)], [subhook_p]], colWidths=[page_w])
    hook_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(hook_table)
    story.append(Spacer(1, 10))

    # KPI Stat Cards
    kpi_w = page_w / 4.0
    kpi_card_data = [
        [
            Paragraph("100%", kpi_num_style),
            Paragraph("0%", kpi_num_style),
            Paragraph("98.8%", kpi_num_style),
            Paragraph("400%", kpi_num_style)
        ],
        [
            Paragraph("<b>Citation Integrity</b><br/>Zero Fabricated Sources", kpi_label_style),
            Paragraph("<b>Adversarial Error</b><br/>Deterministic Fail-Closed", kpi_label_style),
            Paragraph("<b>Prior Art Recall @ k</b><br/>100M+ Patent Databases", kpi_label_style),
            Paragraph("<b>Margin Expansion</b><br/>Fixed-Fee Drafting Profit", kpi_label_style)
        ]
    ]
    kpi_table = Table(kpi_card_data, colWidths=[kpi_w]*4)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.75, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # Deal Metadata Grid
    meta_w = page_w / 3.0
    meta_data = [
        [
            Paragraph("<b>Company:</b> SallyIP Inc.", body_style),
            Paragraph("<b>Target Raise:</b> $3.5M - $5.0M", body_style),
            Paragraph("<b>Stage:</b> Seed / Series A", body_style),
        ],
        [
            Paragraph("<b>Sector:</b> Vertical LegalTech / IP AI", body_style),
            Paragraph("<b>Gross Margins:</b> 78% - 84%", body_style),
            Paragraph("<b>Deployment:</b> Cloud / VPC / Word Add-in", body_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[meta_w]*3)
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_WHITE),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "<b>Executive Thesis:</b> Intellectual property law is the ultimate crucible for artificial intelligence. "
        "Patents and IP contracts protect multi-billion-dollar enterprise assets, but drafting and prosecution are plagued by a $20B production bottleneck. "
        "Attorneys face intense fixed-fee compression ($8,000-$12,000 per patent) yet cannot deploy generic AI tools due to catastrophic hallucination rates (58%-82%). "
        "SallyIP introduces the industry's first verification-first architecture: combining hybrid multi-path retrieval, code-level citation integrity, "
        "and exact-quote verification to deliver attorney-grade patent drafting, Office Action response, and freedom-to-operate clearance.",
        body_style
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Defensible Traction:</b> 70/70 security test suites passing, 28/28 deterministic verification gates verified, and pilot-ready architecture. "
        "SallyIP converts 20-hour patent preparation marathons into rigorous, attorney-verified 3-hour workflows.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: THE PROBLEM & THE VERIFICATION SOLUTION
    # =========================================================================
    story.append(Paragraph("1. The Problem: The $20B Patent Bottleneck & AI Malpractice Threat", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Patent preparation and prosecution is an indispensable $20B legal service, but its operating model is breaking down:",
        body_style
    ))

    prob_bullets = [
        "<b>Extreme Production Costs:</b> Drafting a defensible patent requires 20-40 hours of partner and associate time, costing clients $10,000 to $25,000+ per application.",
        "<b>The Fixed-Fee Margin Squeeze:</b> Over 72% of corporate clients now mandate capped fixed fees ($8,000-$12,000), compressing law firm partner realization rates to historic lows.",
        "<b>25+ Month Examination Backlogs:</b> Over 700,000 applications are filed yearly with the USPTO alone. Attorneys spend over 60% of their billable hours on repetitive administrative chores: claim trees, antecedent basis checks, figure numeral tracking, and rejection dissection.",
        "<b>The AI Malpractice Threshold:</b> While firms urgently seek automation, general LLMs (GPT-4, Claude) hallucinate on 58%-82% of legal queries. Even first-gen legal RAG tools (Harvey, CoCounsel) suffer from 17%-33% error rates. In patent law, a single hallucinated prior art reference or defective claim limitation can trigger patent invalidation or ethical sanction."
    ]
    for b in prob_bullets:
        story.append(Paragraph(f"• {b}", body_style))
    story.append(Spacer(1, 8))

    # AI Trust Paradox Table
    trust_box_data = [
        [
            Paragraph("<b>GENERAL LLMs (GPT-4 / Claude)</b><br/><font color='#DC2626'><b>58% - 82% Hallucination</b></font><br/>Fabricates court cases, statutes, and non-existent patent numbers.", td_style),
            Paragraph("<b>FIRST-GEN LEGAL RAG (Harvey)</b><br/><font color='#D97706'><b>17% - 33% Hallucination</b></font><br/>Dangling citations, unverified quotes, and shallow broad summaries.", td_style),
            Paragraph("<b>SALLYIP VERIFICATION-FIRST</b><br/><font color='#059669'><b>0.0% Tolerated Hallucination</b></font><br/>Fail-closed architecture. 100% citation integrity & verbatim proof.", td_style),
        ]
    ]
    trust_table = Table(trust_box_data, colWidths=[page_w/3.0]*3)
    trust_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COLOR_RED_LIGHT),
        ('BACKGROUND', (1, 0), (1, -1), COLOR_AMBER_LIGHT),
        ('BACKGROUND', (2, 0), (2, -1), COLOR_SUCCESS_LIGHT),
        ('BOX', (0, 0), (0, -1), 0.5, colors.HexColor("#FCA5A5")),
        ('BOX', (1, 0), (1, -1), 0.5, colors.HexColor("#FCD34D")),
        ('BOX', (2, 0), (2, -1), 0.5, COLOR_SUCCESS),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(trust_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. The Solution: SallyIP's Verification-First Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "SallyIP does not rely on fragile prompt engineering. Instead, it places a deterministic, algorithmic verification barrier around model reasoning:",
        body_style
    ))

    sol_bullets = [
        "<b>Multi-Path Hybrid Retrieval:</b> Fuses BM25 keyword matching, dense vector embeddings, and curated static jurisdiction packs (US, EPO, UK, India) via Reciprocal Rank Fusion (RRF). Zero results is treated as a valid state rather than forcing hallucinations.",
        "<b>Citation Integrity Guard:</b> Scans generated drafts for source tokens ([S1], [S2]). Any citation not grounded in retrieved text is expunged and flagged unverified.",
        "<b>Exact Verbatim Quote Verification:</b> Every generated quotation is matched against source documents. If altered by even a single word, quotation marks are stripped automatically.",
        "<b>Deterministic Fail-Closed Policy:</b> When primary authority is missing for high-risk conclusions (novelty, validity, infringement), Sally outputs: <i>'I could not verify this proposition from the available authorities.'</i>",
        "<b>Substantive Patent Standards Check:</b> Validates assertions against statutory rules under 35 U.S.C. 101 (Alice/Mayo two-step), 102 (single-reference anticipation), 103 (PHOSITA standard), and 112 (written description & enablement)."
    ]
    for b in sol_bullets:
        story.append(Paragraph(f"• {b}", body_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: PRODUCT SUITE & PROPRIETARY MOATS
    # =========================================================================
    story.append(Paragraph("3. Full-Lifecycle Intellectual Property Product Modules", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    mod_data = [
        [
            Paragraph("<b>Module</b>", th_style),
            Paragraph("<b>Capabilities & Technology</b>", th_style),
            Paragraph("<b>Practitioner Impact</b>", th_style),
        ],
        [
            Paragraph("<b>Novelty & Prior Art Radar</b>", td_bold),
            Paragraph("Limitation-by-limitation claim comparison across 100M+ USPTO, EPO, WIPO patents and NPL (arXiv, PubMed, IEEE).", td_style),
            Paragraph("<font color='#059669'><b>98.8% Recall @ k</b></font><br/>Sub-2.4s search latency", td_style),
        ],
        [
            Paragraph("<b>Patent Drafting Studio</b>", td_bold),
            Paragraph("Synthesizes provisional (Section 111(b)) and nonprovisional (Section 111(a)) applications. Real-time antecedent basis checks and Section 101/112 validation.", td_style),
            Paragraph("<font color='#059669'><b>6x Faster Drafting</b></font><br/>100% Antecedent accuracy", td_style),
        ],
        [
            Paragraph("<b>Office Action Dossier</b>", td_bold),
            Paragraph("Deconstructs USPTO/EPO rejections. Evaluates examiner allowance rates, generates claim traversal arguments and interview talking points.", td_style),
            Paragraph("<font color='#059669'><b>4.2x Faster Response</b></font><br/>Direct amendment simulator", td_style),
        ],
        [
            Paragraph("<b>FTO Clearance Radar</b>", td_bold),
            Paragraph("Maps product features directly to third-party claims. Automated technical design-around suggestions and claim maintenance fee tracking.", td_style),
            Paragraph("<font color='#059669'><b>Zero Overlooked Claims</b></font><br/>Real-time landscape alerts", td_style),
        ],
        [
            Paragraph("<b>Trademark Clearance</b>", td_bold),
            Paragraph("Cross-register search (USPTO, EUIPO, Madrid). DuPont confusion factor analysis across Nice Classes 1-45.", td_style),
            Paragraph("<font color='#059669'><b>94.2% Correlation</b></font><br/>Sub-1.8s clearance run", td_style),
        ],
        [
            Paragraph("<b>Claim Charts & EoU</b>", td_bold),
            Paragraph("Generates courtroom-ready Evidence of Use charts mapping patent claims to accused products, teardowns, and whitepapers.", td_style),
            Paragraph("<font color='#059669'><b>Court-Ready Charts</b></font><br/>Prosecution estoppel audit", td_style),
        ],
        [
            Paragraph("<b>Invention Interviewer</b>", td_bold),
            Paragraph("Interactive 7-slot extraction engine capturing disclosures from inventors without requiring legal jargon. Adapts to user sophistication.", td_style),
            Paragraph("<font color='#059669'><b>Max 4 Turns</b></font><br/>Plain language to patent claim", td_style),
        ],
    ]

    mod_table = Table(mod_data, colWidths=[120, 272, 140])
    mod_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(mod_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("4. Proprietary Defensible Moats", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    moat_items = [
        ("Algorithmic Verification Layer", "Independent code-level verification pipeline (exact-quote string matchers, bracket handlers, dangling citation removal) operating downstream of inference."),
        ("Curated Jurisdiction Legal Packs", "Clean statutory and MPEP regulatory knowledge graphs across US, EPO, UK, and India, eliminating web-search noise and hallucinated case laws."),
        ("PostgreSQL Row-Level Security (RLS)", "70+ tables guarded by database-layer RLS policies and cryptographic SHA-256 passage provenance. Guaranteed mathematical tenant isolation for competing firms."),
        ("Microsoft Word Add-in Lock-In", "Deep workflow integration directly inside Microsoft Word (where patent attorneys spend their workdays) creates steep switching costs."),
        ("Published Empirical Benchmark Leadership", "Open benchmark methodology and failure triage corpora (benchmarks/, evals/) establish SallyIP as the recognized empirical standard of legal AI trust.")
    ]
    for title, desc in moat_items:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", body_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: MARKET, BUSINESS MODEL & COMPETITIVE MATRIX
    # =========================================================================
    story.append(Paragraph("5. Market Sizing: A $65B Global IP Opportunity", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    tam_data = [
        [
            Paragraph("<b>TOTAL ADDRESSABLE MARKET (TAM)</b><br/><font color='#4F46E5' size='11'><b>$65.8 Billion</b></font><br/>Global Intellectual Property Services (Filing, Prosecution, Trademark, Litigation).", td_style),
            Paragraph("<b>SERVICEABLE ADDRESSABLE MARKET (SAM)</b><br/><font color='#4F46E5' size='11'><b>$4.8 Billion</b></font><br/>Global LegalTech & Patent Analytics Software (16.4% CAGR to 2030).", td_style),
            Paragraph("<b>SERVICEABLE OBTAINABLE MARKET (SOM)</b><br/><font color='#4F46E5' size='11'><b>$920 Million</b></font><br/>US, UK, and European IP Boutiques & Enterprise Corporate Patent Depts.", td_style),
        ]
    ]
    tam_table = Table(tam_data, colWidths=[page_w/3.0]*3)
    tam_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tam_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("6. Business Model & High-Margin Unit Economics", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    pricing_data = [
        [
            Paragraph("<b>Tier</b>", th_style),
            Paragraph("<b>Target Customer</b>", th_style),
            Paragraph("<b>Annual Contract Value (ACV)</b>", th_style),
            Paragraph("<b>Key Features Included</b>", th_style),
        ],
        [
            Paragraph("<b>Solo Practitioner</b>", td_bold),
            Paragraph("Solo patent attorneys & agents", td_style),
            Paragraph("<b>$1,188 / yr</b> ($99/mo)", td_style),
            Paragraph("50 scans/mo, claim studio, antecedent checks, DOCX/XML.", td_style),
        ],
        [
            Paragraph("<b>IP Boutique & Firm</b>", td_bold),
            Paragraph("Mid-sized IP practices (5-30 attys)", td_style),
            Paragraph("<b>$3,588 / atty / yr</b> ($299/mo)", td_style),
            Paragraph("Unlimited scans, shared vaults, EoU claim charts, team collaboration.", td_style),
        ],
        [
            Paragraph("<b>Enterprise Department</b>", td_bold),
            Paragraph("Am Law 100 & Corporate Tech Counsel", td_style),
            Paragraph("<b>$25,000 - $150,000+ / yr</b>", td_style),
            Paragraph("Dedicated VPC, BYOK encryption, custom style tuning, SAML SSO, SLA.", td_style),
        ],
    ]
    pricing_table = Table(pricing_data, colWidths=[105, 125, 120, 182])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pricing_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("7. Competitive Landscape: Why SallyIP Wins", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    comp_data = [
        [
            Paragraph("<b>Solution</b>", th_style),
            Paragraph("<b>Core Focus</b>", th_style),
            Paragraph("<b>Critical Limitation</b>", th_style),
            Paragraph("<b>SallyIP Advantage</b>", th_style),
        ],
        [
            Paragraph("<b>Harvey AI</b> ($5B Val)", td_bold),
            Paragraph("Horizontal BigLaw AI", td_style),
            Paragraph("High hallucination in patent law; lacks Section 101/112 grammar.", td_style),
            Paragraph("<font color='#059669'><b>100% Citation Integrity</b></font><br/>Built specifically for patents.", td_style),
        ],
        [
            Paragraph("<b>CoCounsel (TR)</b>", td_bold),
            Paragraph("General case research", td_style),
            Paragraph("No limitation-by-limitation claim charts or Office Action traversal.", td_style),
            Paragraph("<font color='#059669'><b>Full Patent Lifecycle</b></font><br/>Drafting to USPTO XML export.", td_style),
        ],
        [
            Paragraph("<b>PatentPal / ClaimMaster</b>", td_bold),
            Paragraph("Rule-based claim checkers", td_style),
            Paragraph("Shallow rules; lacks deep prior art synthesis and conversational interview.", td_style),
            Paragraph("<font color='#059669'><b>Advanced Generative AI</b></font><br/>Hybrid search + 7-slot interviewer.", td_style),
        ],
        [
            Paragraph("<b>Anaqua / Derwent</b>", td_bold),
            Paragraph("Legacy IP docketing", td_style),
            Paragraph("Outdated UI; no generative drafting or verification gates.", td_style),
            Paragraph("<font color='#059669'><b>10x Faster Cloud Native</b></font><br/>Immediate practitioner value.", td_style),
        ],
    ]
    comp_table = Table(comp_data, colWidths=[115, 105, 160, 152])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(comp_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: FINANCIAL FORECAST, THE ASK & INVESTMENT SUMMARY
    # =========================================================================
    story.append(Paragraph("8. Three-Year Financial Forecast", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    fin_data = [
        [
            Paragraph("<b>Metric</b>", th_style),
            Paragraph("<b>Year 1 (FY 2027)</b>", th_style),
            Paragraph("<b>Year 2 (FY 2028)</b>", th_style),
            Paragraph("<b>Year 3 (FY 2029)</b>", th_style),
        ],
        [
            Paragraph("<b>Ending Annual Recurring Revenue (ARR)</b>", td_bold),
            Paragraph("<font color='#059669'><b>$1,450,000</b></font>", td_bold),
            Paragraph("<font color='#059669'><b>$5,800,000</b></font>", td_bold),
            Paragraph("<font color='#059669'><b>$18,200,000</b></font>", td_bold),
        ],
        [
            Paragraph("<b>Total Subscribing Attorneys / Seats</b>", td_style),
            Paragraph("420 seats", td_style),
            Paragraph("1,650 seats", td_style),
            Paragraph("5,100 seats", td_style),
        ],
        [
            Paragraph("<b>Enterprise Accounts ($50k+ ACV)</b>", td_style),
            Paragraph("8 enterprise clients", td_style),
            Paragraph("32 enterprise clients", td_style),
            Paragraph("110 enterprise clients", td_style),
        ],
        [
            Paragraph("<b>Gross Margin</b>", td_style),
            Paragraph("78%", td_style),
            Paragraph("81%", td_style),
            Paragraph("84%", td_style),
        ],
        [
            Paragraph("<b>Net Revenue Retention (NRR)</b>", td_style),
            Paragraph("122%", td_style),
            Paragraph("135%", td_style),
            Paragraph("142%", td_style),
        ],
        [
            Paragraph("<b>CAC Payback Period</b>", td_style),
            Paragraph("6.2 months", td_style),
            Paragraph("4.8 months", td_style),
            Paragraph("3.9 months", td_style),
        ],
    ]
    fin_table = Table(fin_data, colWidths=[172, 120, 120, 120])
    fin_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(fin_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("9. The Ask & Strategic Use of Proceeds", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    funds_data = [
        [
            Paragraph("<b>Allocation Area</b>", th_style),
            Paragraph("<b>Budget Share</b>", th_style),
            Paragraph("<b>Key Strategic Deliverables</b>", th_style),
        ],
        [
            Paragraph("<b>Engineering & R&D</b>", td_bold),
            Paragraph("40% ($1.6M)", td_bold),
            Paragraph("Scale pgvector to 150M+ patents; fine-tune domain verification SLMs; expand EPC/UK/Asian packs.", td_style),
        ],
        [
            Paragraph("<b>Enterprise Sales & GTM</b>", td_bold),
            Paragraph("30% ($1.2M)", td_bold),
            Paragraph("Hire 3 enterprise LegalTech Account Execs; attend AIPLA/IPO conferences; scale customer success.", td_style),
        ],
        [
            Paragraph("<b>Security & Compliance</b>", td_bold),
            Paragraph("20% ($0.8M)", td_bold),
            Paragraph("Attain SOC 2 Type II & ISO 27001 certifications; dedicated enterprise VPC and staging RLS deployment.", td_style),
        ],
        [
            Paragraph("<b>Working Capital & IP</b>", td_bold),
            Paragraph("10% ($0.4M)", td_bold),
            Paragraph("File core patents covering verification architecture; general corporate & legal reserve.", td_style),
        ],
    ]
    funds_table = Table(funds_data, colWidths=[130, 95, 307])
    funds_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(funds_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("10. Investment Summary: Why SallyIP Wins", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    thesis_p = Paragraph(
        "<b>1. Unforgiving Market Demands Precision:</b> IP law is the ultimate crucible for legal AI. By solving hallucination where stakes are highest, SallyIP establishes a technical standard general models cannot match.<br/>"
        "<b>2. Defensible Technology Moat:</b> Code-level verification algorithms, patent-specific statutory gates, and tenant-isolated PostgreSQL RLS protect against horizontal LLM commoditization.<br/>"
        "<b>3. Compelling Unit Economics:</b> High ACVs ($18k-$150k+), high gross margins (>80%), and low churn driven by deep matter knowledge vault and Word add-in integration.<br/>"
        "<b>4. Empirical Truth:</b> Published benchmarks and transparent failure analysis position SallyIP as the single trusted standard in legal automation.",
        body_style
    )
    story.append(thesis_p)
    story.append(Spacer(1, 8))

    contact_data = [
        [
            Paragraph("<b>INVESTOR DUE DILIGENCE & DATA ROOM ACCESS</b>", ParagraphStyle('CDHeader', parent=td_bold, fontSize=8.5, textColor=COLOR_ACCENT)),
            Paragraph("<b>PRODUCT & ARCHITECTURE REPOSITORY</b>", ParagraphStyle('CDHeader2', parent=td_bold, fontSize=8.5, textColor=COLOR_ACCENT)),
        ],
        [
            Paragraph("<b>Web:</b> https://sallyip.com/<br/><b>Data Room:</b> Available upon NDA execution.<br/><b>Contact:</b> founders@sallyip.com", td_style),
            Paragraph("<b>Technical Doc:</b> about79.md & report29.md<br/><b>Benchmark Corpus:</b> benchmarks/ & evals/<br/><b>Status:</b> Pilot Phase Active", td_style),
        ]
    ]
    contact_table = Table(contact_data, colWidths=[page_w/2.0]*2)
    contact_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.75, COLOR_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(contact_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF: {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'report29.pdf'
    build_pdf(target)
