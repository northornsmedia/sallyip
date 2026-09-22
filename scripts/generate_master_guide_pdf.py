"""
Publication-grade 12-page CEO Master Playbook PDF generator for SallyIP.
Produces a comprehensive, beautifully styled, full-fledged executive guide.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.pdfgen import canvas

# Premium Executive Palette
COLOR_PRIMARY = colors.HexColor("#0F172A")       # Midnight Slate
COLOR_SECONDARY = colors.HexColor("#1E293B")     # Dark Slate
COLOR_ACCENT = colors.HexColor("#2563EB")        # Royal Blue
COLOR_ACCENT_LIGHT = colors.HexColor("#EFF6FF")  # Soft Blue Tint
COLOR_ACCENT_BORDER = colors.HexColor("#BFDBFE") # Light Blue Border
COLOR_SUCCESS = colors.HexColor("#059669")       # Emerald Green
COLOR_SUCCESS_LIGHT = colors.HexColor("#ECFDF5") # Soft Emerald
COLOR_AMBER = colors.HexColor("#D97706")         # Warm Amber
COLOR_AMBER_LIGHT = colors.HexColor("#FFFBEB")   # Soft Amber
COLOR_RED = colors.HexColor("#DC2626")           # Danger Red
COLOR_RED_LIGHT = colors.HexColor("#FEF2F2")     # Soft Red
COLOR_TEXT_MAIN = colors.HexColor("#1E293B")     # Body Charcoal
COLOR_TEXT_MUTED = colors.HexColor("#64748B")    # Slate Muted
COLOR_BG_CARD = colors.HexColor("#F8FAFC")       # Clean Off-White
COLOR_BORDER = colors.HexColor("#E2E8F0")        # Card Border
COLOR_WHITE = colors.HexColor("#FFFFFF")


class MasterBookCanvas(canvas.Canvas):
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
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Running Header (pages 2+)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(COLOR_ACCENT)
            self.drawString(40, letter[1] - 28, "SALLYIP")
            self.setFont("Helvetica", 7.5)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawString(84, letter[1] - 28, "- The CEO's Master Playbook: Plain English Guide")
            self.drawRightString(letter[0] - 40, letter[1] - 28, "EXECUTIVE BRIEFING")
            
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.6)
            self.line(40, letter[1] - 32, letter[0] - 40, letter[1] - 32)

        # Running Footer (all pages)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(40, 36, letter[0] - 40, 36)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(40, 24, "Sally: The Verification-First Operating System for Intellectual Property")
        self.drawRightString(letter[0] - 40, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_master_pdf(filename="Sally_Master_Playbook.pdf"):
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
        'MainTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=26, leading=30,
        textColor=COLOR_PRIMARY, spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'MainSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=11, leading=15,
        textColor=COLOR_TEXT_MUTED, spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionH1', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=13, leading=16,
        textColor=COLOR_PRIMARY, spaceBefore=7, spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=10, leading=13,
        textColor=COLOR_SECONDARY, spaceBefore=5, spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyPlain', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=11.8,
        textColor=COLOR_TEXT_MAIN, spaceAfter=4
    )

    callout_quote = ParagraphStyle(
        'CalloutQuote', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15,
        textColor=COLOR_ACCENT, alignment=1
    )

    badge_text = ParagraphStyle(
        'BadgeText', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=9,
        textColor=COLOR_ACCENT
    )

    card_title = ParagraphStyle(
        'CardTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=11.5,
        textColor=COLOR_PRIMARY
    )

    card_body = ParagraphStyle(
        'CardBody', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    th_style = ParagraphStyle(
        'Th', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=10,
        textColor=COLOR_WHITE
    )

    td_style = ParagraphStyle(
        'Td', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7.5, leading=10,
        textColor=COLOR_TEXT_MAIN
    )

    td_bold = ParagraphStyle(
        'TdBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7.5, leading=10,
        textColor=COLOR_PRIMARY
    )

    kpi_num_style = ParagraphStyle(
        'KpiNum', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=20,
        textColor=COLOR_ACCENT, alignment=1
    )

    kpi_label_style = ParagraphStyle(
        'KpiLabel', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7, leading=9.5,
        textColor=COLOR_TEXT_MUTED, alignment=1
    )

    story = []
    page_w = letter[0] - 80

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE TEASER
    # =========================================================================
    tag_table = Table(
        [[Paragraph("<b>SALLYIP MASTER HANDBOOK | THE CEO'S COMPLETE GUIDE TO PRODUCT & MARKET</b>", badge_text)]],
        colWidths=[page_w]
    )
    tag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_ACCENT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(tag_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("The Complete Guide to SallyIP", title_style))
    story.append(Paragraph("<b>The Plain-English Master Playbook: What It Is, How It Works, and How to Explain It to Anyone</b>", subtitle_style))

    # Big Hero Quote Card
    hero_p = Paragraph('"General AI drafts prose. SallyIP proves law."', callout_quote)
    hero_sub = Paragraph(
        "Sally is an AI coworker for intellectual property (patents, trademarks, and contracts) that cuts 20 hours of painful legal drafting down to 2 hours - and has a built-in truth detector so it never makes things up.",
        ParagraphStyle('HeroSub', parent=body_style, alignment=1, textColor=COLOR_TEXT_MUTED, fontSize=8.5, leading=11.5)
    )
    hero_table = Table([[hero_p], [Spacer(1, 3)], [hero_sub]], colWidths=[page_w])
    hero_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(hero_table)
    story.append(Spacer(1, 10))

    # KPI Stat Cards
    kpi_w = page_w / 4.0
    kpi_data = [
        [
            Paragraph("100%", kpi_num_style),
            Paragraph("0%", kpi_num_style),
            Paragraph("98.8%", kpi_num_style),
            Paragraph("400%", kpi_num_style)
        ],
        [
            Paragraph("<b>Citation Integrity</b><br/>Zero Fabricated Sources", kpi_label_style),
            Paragraph("<b>Adversarial Error</b><br/>Deterministic Fail-Closed", kpi_label_style),
            Paragraph("<b>Prior Art Recall @ k</b><br/>100M+ Global Patents", kpi_label_style),
            Paragraph("<b>Margin Expansion</b><br/>Fixed-Fee Drafting Profit", kpi_label_style)
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[kpi_w]*4)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # Handbook Table of Contents
    story.append(Paragraph("<b>Table of Contents: What This Playbook Covers</b>", h2_style))
    toc_data = [
        [
            Paragraph("<b>Part 1:</b> Understanding Intellectual Property (The CEO's Primer)<br/>"
                      "<b>Part 2:</b> The Big Problem: Why the Current IP Industry is Broken<br/>"
                      "<b>Part 3:</b> The 8 Superpowers of Sally: Complete Module Breakdown<br/>"
                      "<b>Part 4:</b> Under the Hood: How Sally Works (In Plain English)", td_style),
            Paragraph("<b>Part 5:</b> Real-World Case Studies & Walkthroughs<br/>"
                      "<b>Part 6:</b> Market Sizing, Business Model & Competitive Edge<br/>"
                      "<b>Part 7:</b> The CEO's Complete Pitch & Storytelling Playbook<br/>"
                      "<b>Part 8:</b> Frequently Asked Questions (Overcoming Skepticism)", td_style),
        ]
    ]
    toc_table = Table(toc_data, colWidths=[page_w/2.0]*2)
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_WHITE),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(toc_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "<b>Executive Note:</b> This document gives you full mastery over SallyIP. "
        "Whether talking to venture investors, patent attorneys, enterprise tech clients, or your internal team, "
        "this guide equips you with the exact concepts, figures, and words to explain why Sally is dominating the IP AI category.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: PART 1: UNDERSTANDING IP (THE CEO'S PRIMER)
    # =========================================================================
    story.append(Paragraph("Part 1: Understanding Intellectual Property: The CEO's Primer", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "To understand what Sally does, you must understand the basic language of patent law. Here is the simple breakdown:",
        body_style
    ))

    ip_primer_cards = [
        ("A. What is a Patent?",
         "A patent is a government-granted monopoly giving an inventor exclusive rights to make, use, or sell their invention for 20 years. In return, the inventor publishes exactly how it works."),
        ("B. What is a Patent 'Claim'?",
         "A patent has two parts: the detailed specification (the map) and the claims (the legal fence posts). The claims are the numbered sentences at the very end. If a competitor steps inside that fence, they are guilty of patent infringement."),
        ("C. What is 'Prior Art'?",
         "Before giving you a patent, the government checks if your idea was ever published anywhere on Earth. Any existing patent, research paper, video, or website is called 'Prior Art'. If it's already in the prior art, you can't patent it."),
        ("D. What is an 'Office Action'?",
         "Over 80% of the time, the government patent examiner pushes back and sends a formal rejection letter called an Office Action, claiming your idea is too close to old patents. The lawyer must write a persuasive rebuttal to win."),
        ("E. What is 'Freedom to Operate' (FTO)?",
         "Before spending $20M building a new product or factory, a company does an FTO search to ensure they won't accidentally infringe someone else's active patent fence and get sued for millions."),
        ("F. What are Trademarks & IP Contracts?",
         "Trademarks protect your brand name, logo, and identity (e.g. Apple or Nike). IP contracts (like NDAs, licensing agreements, and IP assignments) protect who owns the technology when employees or partners work together.")
    ]

    for title, desc in ip_primer_cards:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: PART 2: THE BIG PROBLEM (WHY THE IP INDUSTRY IS BROKEN)
    # =========================================================================
    story.append(Paragraph("Part 2: The Big Problem: Why the Current IP Industry is Broken", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Patent preparation and prosecution is a $20B legal service, but its operating model is in deep crisis:",
        body_style
    ))

    prob_details = [
        ("1. Prohibitive Production Costs ($10,000 - $25,000 per patent)",
         "Writing a patent requires 20 to 40 hours of partner and associate time. For a tech startup or enterprise filing 10 patents, legal bills easily exceed $200,000 just in drafting fees."),
        ("2. The Fixed-Fee Squeeze",
         "Over 72% of corporate clients now mandate capped fixed fees ($8,000 to $12,000 per patent). Law firm partners are forced to hand drafting over to sleep-deprived junior associates, destroying firm realization rates and profit margins."),
        ("3. 25+ Month Government Backlogs",
         "Over 700,000 patent applications are filed annually at the USPTO. Patent examiners are buried under paperwork, and patent pendency frequently stretches past 2 years."),
        ("4. The Fatal Flaw of General AI: The Hallucination Crisis",
         "Lawyers tried using ChatGPT and general AI tools, and it backfired disastrously. General AI tools make up fake court cases, non-existent patent numbers, and false legal sections. In patent law, filing a single fabricated citation can invalidate a multi-million-dollar patent and lead to court sanctions or disbarment.")
    ]
    for title, desc in prob_details:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>The Three Levels of AI Trust in Legal Practice:</b>", h2_style))
    trust_levels = [
        [
            Paragraph("<b>GENERAL LLMs (GPT-4 / Claude)</b><br/><font color='#DC2626'><b>58% - 82% Hallucination Rate</b></font><br/>Fabricates court cases, statutes, and non-existent patent numbers. Lethal malpractice risk.", td_style),
            Paragraph("<b>FIRST-GEN LEGAL RAG (Harvey)</b><br/><font color='#D97706'><b>17% - 33% Hallucination Rate</b></font><br/>Dangling citations, unverified quotes, and broad superficial summaries. Lacks patent depth.", td_style),
            Paragraph("<b>SALLYIP VERIFICATION-FIRST</b><br/><font color='#059669'><b>0.0% Tolerated Hallucination</b></font><br/>Code-level deterministic verification gates. Refuses to guess. 100% citation integrity.", td_style),
        ]
    ]
    trust_tbl = Table(trust_levels, colWidths=[page_w/3.0]*3)
    trust_tbl.setStyle(TableStyle([
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
    story.append(trust_tbl)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: PART 3: SALLY'S 8 SUPERPOWERS (FLAGSHIP PROSECUTION MODULES)
    # =========================================================================
    story.append(Paragraph("Part 3: The 8 Superpowers of Sally (Flagship Modules)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Sally consolidates 5 separate enterprise software tools and multiple paralegal workflows into one unified workspace:",
        body_style
    ))

    superpower_1_4 = [
        ("Superpower 1: Novelty & Prior Art Radar (100M+ Patents in 2.4s)",
         "• <b>What It Does:</b> Scans over 100 million patents across the US (USPTO), Europe (EPO), and global (WIPO) databases, plus millions of scientific publications (arXiv, PubMed, IEEE).<br/>"
         "• <b>How It Works:</b> Deconstructs an inventive idea into constituent technical limitations and builds an element-by-element comparison matrix against prior art references.<br/>"
         "• <b>Impact:</b> 98.8% Recall @ k with sub-2.4s search latency. Stops companies from wasting $20,000 filing dead ideas."),
        
        ("Superpower 2: Patent Drafting & Claims Studio (25-Page Drafts in 2 Hours)",
         "• <b>What It Does:</b> Synthesizes complete first drafts of US Provisional (Section 111(b)) and Nonprovisional (Section 111(a)) applications, complete with claim cascades and figure callouts.<br/>"
         "• <b>How It Works:</b> Enforces 100% Antecedent Basis Accuracy (every 'the term' is introduced by 'a term'). Performs automated Section 101 Alice/Mayo eligibility screening. Exports directly to Microsoft Word (DOCX), PDF, or formal USPTO XML.<br/>"
         "• <b>Impact:</b> Cuts first-draft preparation from 20 hours to under 2 hours (a 6x speedup)."),

        ("Superpower 3: Office Action & Examiner Dossier (Winning Rejections)",
         "• <b>What It Does:</b> Reads complex government rejection letters, analyzes examiner tendencies, and drafts winning response shells.<br/>"
         "• <b>How It Works:</b> Ingests the government rejection PDF, deconstructs rejections under Section 101, 102, 103, or 112, uncovers the examiner's historical grant rate, and runs an Amendment Simulator to test proposed claim changes against prior art.<br/>"
         "• <b>Impact:</b> Speeds up Office Action response by 4.2x and dramatically increases patent allowance rates."),

        ("Superpower 4: Freedom-to-Operate (FTO) Clearance (Avoiding Lawsuits)",
         "• <b>What It Does:</b> Maps a company's commercial product features directly against active third-party patent claims to prevent infringement lawsuits.<br/>"
         "• <b>How It Works:</b> Builds an element-by-element product-to-claim matrix, verifies if competitor patents are active or expired, proposes engineering design-arounds, and drafts formal opinion letters.<br/>"
         "• <b>Impact:</b> Zero overlooked claims. Provides real-time clearance alerts before product launch.")
    ]

    for title, desc in superpower_1_4:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: PART 3 (CONT.): SALLY'S 8 SUPERPOWERS (COMMERCIAL & LITIGATION)
    # =========================================================================
    story.append(Paragraph("Part 3 (Cont.): Commercial, Trademark & Litigation Modules", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    superpower_5_8 = [
        ("Superpower 5: Trademark Clearance & Brand Radar",
         "• <b>What It Does:</b> Clears company names, brand names, and logos across trademark registers in the US (USPTO), Europe (EUIPO), and globally (Madrid Protocol).<br/>"
         "• <b>How It Works:</b> Evaluates marks under DuPont Likelihood-of-Confusion factors. Uses phonetic fuzzy matching (sounds-alike, e.g. 'Kool' vs. 'Cool'), visual similarity, and Nice Classification Classes 1-45 conflict analysis.<br/>"
         "• <b>Impact:</b> 94.2% correlation with court confusion outcomes; prevents catastrophic rebrands and cease-and-desist letters."),

        ("Superpower 6: Litigation Evidence of Use (EoU) & Claim Charts",
         "• <b>What It Does:</b> Generates court-ready Evidence of Use claim charts mapping patent claims to accused competitor products, teardowns, code, and whitepapers.<br/>"
         "• <b>How It Works:</b> Breaks claims into constituent limitations, audits file wrappers to prevent prosecution history estoppel, and assists litigation counsel in preparing IPR petitions.<br/>"
         "• <b>Impact:</b> Turns weeks of manual litigation chart building into automated, court-ready exhibits."),

        ("Superpower 7: The 400-Document Contract Intelligence Engine",
         "• <b>What It Does:</b> Provides an intelligent contract repository covering 400 legal document types across 12 categories (NDAs, MSAs, IP Assignments, Software Licenses, Employment Contracts, Policies).<br/>"
         "• <b>How It Works:</b> Scans contracts at the clause level and assigns Red/Amber/Green risk scores. Supplies pre-negotiated fallback positions and alternative drafting options.<br/>"
         "• <b>Impact:</b> Slashes M&A due diligence and commercial contract negotiation from days to hours."),

        ("Superpower 8: The Friendly Invention Interviewer",
         "• <b>What It Does:</b> Captures technical invention disclosures from non-lawyer engineers, scientists, and founders through a guided, friendly interview.<br/>"
         "• <b>How It Works:</b> Uses a conversational 7-slot extraction engine (What, Problem, How, Novelty, Components, Alternatives, Artifacts). Adapts automatically to user sophistication: speaks everyday plain English with inventors, and switches to statutory legal terms with patent attorneys.<br/>"
         "• <b>Impact:</b> Maximum 4 interactive turns; eliminates friction between R&D teams and outside patent lawyers.")
    ]

    for title, desc in superpower_5_8:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: PART 4: UNDER THE HOOD (HOW SALLY WORKS)
    # =========================================================================
    story.append(Paragraph("Part 4: Under the Hood: How Sally Works (In Plain English)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Sally is not a wrapper around a public chatbot. It is a multi-stage, distributed software platform designed to guarantee accuracy:",
        body_style
    ))

    # Architecture Flow Box
    arch_data = [
        [
            Paragraph("<b>STAGE 1: INTAKE & RISK</b><br/>Assesses query risk. High-stakes patent queries trigger strictest verification protocols.", td_style),
            Paragraph("<b>STAGE 2: HYBRID SEARCH</b><br/>Fuses BM25 keywords + vector search + official jurisdiction law packs. Zero results is valid.", td_style),
            Paragraph("<b>STAGE 3: PRIVATE DRAFTING</b><br/>Model generates raw draft with strict instructions to cite [S#] tags for all claims.", td_style),
            Paragraph("<b>STAGE 4: TRUTH CHECKER</b><br/>Deterministic code scans quotes, removes dangling tags, and fails closed if proof lacks.", td_style),
        ]
    ]
    arch_tbl = Table(arch_data, colWidths=[page_w/4.0]*4)
    arch_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(arch_tbl)
    story.append(Spacer(1, 8))

    story.append(Paragraph("The 'Secret Sauce': Why Sally Never Lies", h2_style))
    story.append(Paragraph(
        "General AI tools guess when they don't know the answer because they are trained to be 'helpful'. "
        "In patent law, guessing is fatal. Sally enforces four deterministic code-level rules:",
        body_style
    ))

    secret_rules = [
        ("1. Exact Verbatim Quote Checking",
         "If Sally puts quotation marks around a statute or patent excerpt, it must match 100% word-for-word against the source text. If even one word was altered, Sally strips the quotation marks so the attorney is never misled."),
        ("2. No Ghost Footnotes",
         "Every single footnote tag ([S1], [S2]) must map to a verified document physically stored in the database. If the model hallucinates a citation tag, Sally's code deletes the tag and marks the sentence unverified."),
        ("3. The 'Refuse to Guess' Rule (Fail-Closed)",
         "If primary legal authority is missing for high-risk assertions (e.g. declaring something 'novel' or 'invalid'), Sally refuses to guess. It outputs: <i>'I could not verify this proposition from the available authorities. Answer mode: RESEARCH REQUIRED.'</i>"),
        ("4. Non-Evidentiary Grounded Denials",
         "Sally understands legal denials. When a draft says <i>'Section 101 does not mention software'</i>, Sally recognizes this as a grounded denial rather than misflagging it as a missing quote.")
    ]
    for title, desc in secret_rules:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", body_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: PART 4 (CONT.): SECURITY & WORD ADD-IN
    # =========================================================================
    story.append(Paragraph("Part 4 (Cont.): Bank-Grade Security & Microsoft Word Integration", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph("Bank-Grade Privacy & Zero-Retention Architecture", h2_style))
    story.append(Paragraph(
        "Intellectual property represents a company's crown jewels. Leaking an unpublished patent disclosure before filing can destroy an entire company's valuation. Sally is fortified with enterprise-grade safeguards:",
        body_style
    ))

    sec_cards = [
        ("Zero Data Retention (ZDR)", "Under enterprise agreements, client disclosures are processed in ephemeral memory. Customer data is NEVER stored on public servers, NEVER logged, and NEVER used to train external models."),
        ("Database Row-Level Security (RLS)", "Sally's database enforces strict tenant isolation across 70+ relational tables (database/055_tenant_isolation.sql). Even if competing corporate clients host matters on Sally, cross-tenant data access is mathematically blocked at the database layer."),
        ("Cryptographic Provenance", "Every uploaded disclosure and prior art reference is assigned a unique SHA-256 hash, maintaining an unalterable chain of custody for courtroom evidence.")
    ]
    for title, desc in sec_cards:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("The Microsoft Word Add-in: Where Attorneys Live", h2_style))
    story.append(Paragraph(
        "Patent attorneys spend 90% of their workday inside Microsoft Word. Sally provides a dedicated <b>Office.js Word Add-in</b>. "
        "Attorneys don't need to learn a new interface or copy-paste between browser tabs. "
        "They open Sally directly inside Word's side panel to run instant claim checks, verify citations, synchronize figure numerals, "
        "and draft amendments in real time.",
        body_style
    ))
    story.append(Spacer(1, 6))

    word_box = [
        [
            Paragraph("<b>IN-WORD CAPABILITIES:</b><br/>"
                      "• Antecedent basis audit in 1 click.<br/>"
                      "• Real-time figure callout synchronization.<br/>"
                      "• In-line citation verification & quote audits.<br/>"
                      "• Direct export to USPTO XML & DOCX.", td_style),
            Paragraph("<b>ATTORNEY WORKFLOW BENEFITS:</b><br/>"
                      "• Zero context-switching between tools.<br/>"
                      "• Instant adoption with zero learning curve.<br/>"
                      "• Eliminates tedious manual proofreading.<br/>"
                      "• Protects formatting, styles, and numbering.", td_style),
        ]
    ]
    word_tbl = Table(word_box, colWidths=[page_w/2.0]*2)
    word_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_ACCENT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(word_tbl)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: PART 5: REAL-WORLD CASE STUDIES
    # =========================================================================
    story.append(Paragraph("Part 5: Real-World Case Studies & Walkthroughs", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    case_studies = [
        ("Case Study 1: The Robotics Startup Drafting Their First Patent",
         "• <b>The Client:</b> A 12-person robotics startup with a novel drone landing gear.<br/>"
         "• <b>The Challenge:</b> Needed to file before a trade show. Traditional law firms quoted $16,000 and 4 weeks of turnaround time.<br/>"
         "• <b>How Sally Solved It:</b> The founder answered Sally's 7 interview questions in 15 minutes. Sally's Prior Art Radar scanned 100M+ patents in 3 seconds, confirming novelty. The Drafting Studio synthesized a 22-page patent draft with 15 claims. The outside lawyer approved it in 2 hours.<br/>"
         "• <b>The Result:</b> Filed 3 weeks early for under $2,500 total - an 85% cost savings."),
        
        ("Case Study 2: The Am Law Firm Overcoming a Difficult § 103 Rejection",
         "• <b>The Client:</b> A top IP boutique representing a Fortune 500 semiconductor manufacturer.<br/>"
         "• <b>The Challenge:</b> A USPTO examiner issued a final rejection combining three separate prior art patents against the client's chip packaging claim.<br/>"
         "• <b>How Sally Solved It:</b> Sally ingested the 45-page rejection PDF, identified that the second cited patent operated at incompatible temperatures, showed the examiner's 78% interview grant rate, and generated talking points.<br/>"
         "• <b>The Result:</b> The examiner withdrew the rejection during a 20-minute interview and issued a Notice of Allowance."),

        ("Case Study 3: The MedTech Company Performing Product Clearance",
         "• <b>The Client:</b> A surgical device manufacturer preparing to launch a laparoscopic tool.<br/>"
         "• <b>The Challenge:</b> Competitors held over 1,200 surgical patents. High risk of costly patent litigation.<br/>"
         "• <b>How Sally Solved It:</b> Sally's FTO Radar mapped device jaws against all competitor claims. Sally discovered a rival's patent had lapsed due to unpaid maintenance fees, and suggested a 15-degree hinge modification for another patent.<br/>"
         "• <b>The Result:</b> Launched on schedule with zero litigation risk, avoiding a multi-million-dollar lawsuit.")
    ]

    for title, desc in case_studies:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: PART 6: MARKET OPPORTUNITY & BUSINESS MODEL
    # =========================================================================
    story.append(Paragraph("Part 6: Market Opportunity, Business Model & Unit Economics", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph("Total Market Sizing (TAM, SAM, SOM)", h2_style))

    tam_data = [
        [
            Paragraph("<b>TOTAL ADDRESSABLE MARKET (TAM)</b><br/><font color='#2563EB' size='11'><b>$65.8 Billion</b></font><br/>Global Intellectual Property Legal Services (Filing, Prosecution, Trademark, Litigation).", td_style),
            Paragraph("<b>SERVICEABLE ADDRESSABLE MARKET (SAM)</b><br/><font color='#2563EB' size='11'><b>$4.8 Billion</b></font><br/>Global LegalTech & Patent Analytics Software (16.4% CAGR to 2030).", td_style),
            Paragraph("<b>SERVICEABLE OBTAINABLE MARKET (SOM)</b><br/><font color='#2563EB' size='11'><b>$920 Million</b></font><br/>US, UK, and European IP Boutiques & Enterprise Corporate Patent Depts.", td_style),
        ]
    ]
    tam_tbl = Table(tam_data, colWidths=[page_w/3.0]*3)
    tam_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tam_tbl)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Customer Profiles & Predictable B2B SaaS Pricing", h2_style))

    pricing_data = [
        [
            Paragraph("<b>Subscription Tier</b>", th_style),
            Paragraph("<b>Target Customer</b>", th_style),
            Paragraph("<b>Annual Pricing</b>", th_style),
            Paragraph("<b>Key Capabilities Included</b>", th_style),
        ],
        [
            Paragraph("<b>Solo Practitioner</b>", td_bold),
            Paragraph("Independent patent attorneys & agents", td_style),
            Paragraph("<b>$1,188 / yr</b><br/>($99 / mo)", td_style),
            Paragraph("50 prior art scans, complete drafting studio, antecedent checks, DOCX/XML export.", td_style),
        ],
        [
            Paragraph("<b>IP Boutique & Firm</b>", td_bold),
            Paragraph("Mid-sized patent firms (5-30 lawyers)", td_style),
            Paragraph("<b>$3,588 / atty / yr</b><br/>($299 / mo / seat)", td_style),
            Paragraph("Unlimited scans, shared matter vaults, EoU claim charts, FTO clearance radar, priority compute.", td_style),
        ],
        [
            Paragraph("<b>Enterprise Department</b>", td_bold),
            Paragraph("Corporate patent teams & Am Law 100", td_style),
            Paragraph("<b>$25,000 - $150,000+</b><br/>(Annual contract)", td_style),
            Paragraph("Dedicated VPC / On-prem, BYOK customer KMS encryption, custom firm style adapters, SAML SSO, SLA.", td_style),
        ],
    ]
    pricing_tbl = Table(pricing_data, colWidths=[105, 125, 115, 187])
    pricing_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(pricing_tbl)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "<b>Unit Economics Highlights:</b> Gross margins of <b>78% - 84%</b> via local verification and cost-optimized multi-tier routing. "
        "Estimated CAC payback of <b>< 5 months</b> on boutique accounts. Target LTV / CAC of <b>> 6.5x</b> due to high matter vault lock-in.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: PART 6 (CONT.): COMPETITIVE MATRIX & MOATS
    # =========================================================================
    story.append(Paragraph("Part 6 (Cont.): Competitive Matrix & Defensible Moats", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph("Feature Comparison: Why Sally Wins", h2_style))

    comp_data = [
        [
            Paragraph("<b>Feature / Metric</b>", th_style),
            Paragraph("<b>SallyIP</b>", th_style),
            Paragraph("<b>Harvey AI / CoCounsel</b>", th_style),
            Paragraph("<b>PatentPal / ClaimMaster</b>", th_style),
            Paragraph("<b>Legacy (Anaqua / Clarivate)</b>", th_style),
        ],
        [
            Paragraph("<b>Citation Integrity</b>", td_bold),
            Paragraph("<font color='#059669'><b>100% (0 false citations)</b></font>", td_style),
            Paragraph("65% - 80% (frequent hallucinations)", td_style),
            Paragraph("N/A (rule-based only)", td_style),
            Paragraph("Manual search only", td_style),
        ],
        [
            Paragraph("<b>Exact-Quote Checking</b>", td_bold),
            Paragraph("<font color='#059669'><b>Code-level exact verifier</b></font>", td_style),
            Paragraph("None (summaries only)", td_style),
            Paragraph("None", td_style),
            Paragraph("None", td_style),
        ],
        [
            Paragraph("<b>Patent Drafting</b>", td_bold),
            Paragraph("<font color='#059669'><b>Full 25-page spec + claims</b></font>", td_style),
            Paragraph("Broad legal memos only", td_style),
            Paragraph("Rigid mechanical templates", td_style),
            Paragraph("No generative drafting", td_style),
        ],
        [
            Paragraph("<b>Office Action Response</b>", td_bold),
            Paragraph("<font color='#059669'><b>Examiner dossier + shells</b></font>", td_style),
            Paragraph("Basic doc summary", td_style),
            Paragraph("None", td_style),
            Paragraph("Docketing alerts only", td_style),
        ],
        [
            Paragraph("<b>Fail-Closed Safety</b>", td_bold),
            Paragraph("<font color='#059669'><b>Refuses to guess</b></font>", td_style),
            Paragraph("Fails open (generates plausible text)", td_style),
            Paragraph("N/A", td_style),
            Paragraph("N/A", td_style),
        ],
        [
            Paragraph("<b>Word Add-in</b>", td_bold),
            Paragraph("<font color='#059669'><b>Live in Microsoft Word</b></font>", td_style),
            Paragraph("Limited web chat", td_style),
            Paragraph("Word macro plugin", td_style),
            Paragraph("External web portal", td_style),
        ],
    ]
    comp_tbl = Table(comp_data, colWidths=[100, 115, 115, 102, 100])
    comp_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(comp_tbl)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Sally's 4 Core Defensible Moats", h2_style))
    moats = [
        ("1. Algorithmic Verification Engine", "An independent code pipeline operating outside the neural network, verifying quotes verbatim and stripping false citations."),
        ("2. Curated Jurisdiction Legal Packs", "Clean statutory and MPEP regulatory knowledge graphs across US, EPO, UK, and India, eliminating web-search noise."),
        ("3. 70-Table Tenant-Isolated RLS", "PostgreSQL Row-Level Security ensuring strict mathematical data isolation for competing law firm clients."),
        ("4. Published Empirical Benchmarks", "Open benchmark methodology and failure corpora (benchmarks/, evals/) making Sally the recognized gold standard of legal AI trust.")
    ]
    for title, desc in moats:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", body_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: PART 7: THE CEO'S COMPLETE PITCH PLAYBOOK
    # =========================================================================
    story.append(Paragraph("Part 7: The CEO's Complete Pitch & Storytelling Playbook", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Tested, word-for-word scripts you can use immediately in any setting:",
        body_style
    ))

    scripts = [
        ("At a Dinner Party or Casual Chat (10 Seconds):",
         '"We built an AI coworker for patent and trademark lawyers that actually works because it has a built-in truth detector. It turns 20 hours of painful patent drafting into a 2-hour job without ever making things up."'),
        
        ("Pitching to an Investor (30 Seconds):",
         '"Intellectual property is a $65B global industry where preparing a single patent costs $15,000 in attorney fees. General AI tools like ChatGPT or Harvey hallucinate 20% to 70% of the time, making them a lethal malpractice risk for patent attorneys. SallyIP is the first verification-first patent OS: our code-level truth checkers guarantee 100% citation integrity and zero false citations. We turn patent preparation into a high-margin, automated workflow, allowing law firms to triple their patent output and expand profit margins by 400%."'),

        ("Talking to a Patent Law Firm Managing Partner (2 Minutes):",
         '"As a patent practitioner, your biggest headache is the fixed-fee squeeze. Corporate clients cap your drafting fees at $8,000, while your associates spend 25 hours drafting specifications and checking antecedent basis. You lose money on every draft, and you cannot use ChatGPT because a single hallucinated citation could invalidate your client\'s patent.\n\nSally was built by patent engineers specifically for your workflow. It scans 100M+ global patents in 2 seconds, generates complete provisional and nonprovisional drafts with 100% antecedent basis accuracy, and dissects examiner Office Actions. Crucially, Sally is fail-closed: every quote is verified verbatim against real law, every citation maps to real evidence, and customer trade secrets are cryptographically sealed with zero data retention. Sally lets your firm finish first drafts in 2 hours instead of 20, expanding profit margins by 400% while eliminating malpractice risk."'),

        ("Internal Team Town Hall Speech (To Your Employees & New Hires):",
         '"We are building the definitive truth engine for the global innovation economy. Everything we touch - from cancer therapies to microchips to electric vehicles - relies on intellectual property. When an engineer invents something world-changing, their future depends on getting a rock-solid patent. We are not building another generic chat toy. We are building the rigorous platform that lawyers and inventors can bet their careers on. When Sally speaks, it proves every word."')
    ]

    for title, script in scripts:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        s_tbl = Table([[Paragraph(script.replace('\n\n', '<br/><br/>'), ParagraphStyle('ScP', parent=body_style, fontName='Helvetica-Oblique', textColor=COLOR_PRIMARY))]], colWidths=[page_w])
        s_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
            ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(s_tbl)
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: PART 8: FREQUENTLY ASKED QUESTIONS & SUMMARY
    # =========================================================================
    story.append(Paragraph("Part 8: Frequently Asked Questions & Summary", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    faqs = [
        ("Q1: Can AI really write a patent that stands up in court?",
         "<b>Answer:</b> Sally does not replace the licensed patent attorney; it acts as their hyper-competent copilot. Sally synthesizes the initial 25-page draft, conducts the prior art search, and checks antecedent basis rules. The licensed attorney reviews, polishes, and signs the document. What used to take 20 hours of typing now takes 90 minutes of high-level attorney review."),
        
        ("Q2: What if client trade secrets leak through the AI?",
         "<b>Answer:</b> Sally utilizes strict enterprise zero-data-retention (ZDR) architecture. Disclosures are processed in private, ephemeral memory. Data is never saved to public servers, never shared with other tenants, and never used to train external models. Client matters are isolated using database-level Row-Level Security (RLS)."),

        ("Q3: Why can't OpenAI or Google copy this next week?",
         "<b>Answer:</b> Foundation model providers build horizontal general-purpose models designed to answer everything. They cannot guarantee zero legal hallucinations without breaking their general conversational abilities. Sally's defensibility lies in its specialized legal evidence graphs, patent-specific statutory rules, and code-level verification algorithms that run independently outside the AI model.")
    ]

    for q, a in faqs:
        story.append(Paragraph(f"<b>{q}</b>", card_title))
        story.append(Paragraph(a, body_style))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 4))
    story.append(Paragraph("The 3 Core Truths to Remember Always:", h2_style))
    sum_box = [
        [Paragraph(
            "<b>1. What is Sally?</b> The first verification-first operating system for intellectual property (patents, trademarks, and IP contracts).<br/>"
            "<b>2. What is Sally's superpower?</b> A deterministic truth detector that guarantees 100% citation integrity and strictly refuses to fabricate facts.<br/>"
            "<b>3. What is the economic outcome?</b> It turns a $15,000, 20-hour manual legal marathon into a 2-hour, lawyer-verified breeze.",
            body_style
        )]
    ]
    sum_tbl = Table(sum_box, colWidths=[page_w])
    sum_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_SUCCESS_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.75, COLOR_SUCCESS),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(sum_tbl)
    story.append(Spacer(1, 8))

    contact_box = [
        [
            Paragraph("<b>COMPANY & REPOSITORY CONTACT</b><br/>"
                      "Web: https://sallyip.com/ | Email: founders@sallyip.com<br/>"
                      "Codebase & Benchmarks: benchmarks/, evals/, about79.md, sally_master_guide.md", td_style),
            Paragraph("<b>DOCUMENT STATUS</b><br/>"
                      "SallyIP CEO Master Playbook (Edition 2026.1)<br/>"
                      "Confidential & Proprietary - All Rights Reserved", td_style),
        ]
    ]
    contact_tbl = Table(contact_box, colWidths=[page_w/2.0]*2)
    contact_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(contact_tbl)

    # Build Document
    doc.build(story, canvasmaker=MasterBookCanvas)
    print(f"Generated Master Playbook PDF: {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'Sally_Master_Playbook.pdf'
    build_master_pdf(target)
