"""
Generate an ultra-clean, executive layman-language PDF for the CEO.
Explains Sally in everyday English with zero confusing legal/ML jargon.
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

# Friendly, Modern Palette
COLOR_PRIMARY = colors.HexColor("#0F172A")       # Deep Slate Navy
COLOR_SECONDARY = colors.HexColor("#1E293B")     # Charcoal Slate
COLOR_ACCENT = colors.HexColor("#3B82F6")        # Electric Royal Blue
COLOR_ACCENT_LIGHT = colors.HexColor("#EFF6FF")  # Soft Blue Tint
COLOR_ACCENT_BORDER = colors.HexColor("#BFDBFE") # Light Blue Border
COLOR_SUCCESS = colors.HexColor("#10B981")       # Fresh Emerald
COLOR_SUCCESS_LIGHT = colors.HexColor("#ECFDF5") # Soft Emerald
COLOR_AMBER = colors.HexColor("#F59E0B")         # Friendly Amber
COLOR_AMBER_LIGHT = colors.HexColor("#FFFBEB")   # Soft Amber
COLOR_RED = colors.HexColor("#EF4444")           # Clean Red
COLOR_RED_LIGHT = colors.HexColor("#FEF2F2")     # Soft Red
COLOR_TEXT_MAIN = colors.HexColor("#1E293B")     # Readable Dark Charcoal
COLOR_TEXT_MUTED = colors.HexColor("#64748B")    # Slate Muted
COLOR_BG_CARD = colors.HexColor("#F8FAFC")       # Ultra Clean Off-White
COLOR_BORDER = colors.HexColor("#E2E8F0")        # Subtle Border
COLOR_WHITE = colors.HexColor("#FFFFFF")


class CleanNumberedCanvas(canvas.Canvas):
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
        # Top Header (pages 2+)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(COLOR_ACCENT)
            self.drawString(40, letter[1] - 28, "SALLY")
            self.setFont("Helvetica", 8)
            self.setFillColor(COLOR_TEXT_MUTED)
            self.drawString(80, letter[1] - 28, "- Plain English CEO Guide")
            self.drawRightString(letter[0] - 40, letter[1] - 28, "CONFIDENTIAL & INTERNAL")
            
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.6)
            self.line(40, letter[1] - 32, letter[0] - 40, letter[1] - 32)

        # Bottom Footer (all pages)
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(40, 36, letter[0] - 40, 36)

        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(40, 24, "Sally: The AI Coworker for Intellectual Property")
        self.drawRightString(letter[0] - 40, 24, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_ceo_pdf(filename="Sally_Explained_Simply.pdf"):
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
        fontName='Helvetica', fontSize=12, leading=16,
        textColor=COLOR_TEXT_MUTED, spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionH1', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=14, leading=18,
        textColor=COLOR_PRIMARY, spaceBefore=8, spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=10.5, leading=14,
        textColor=COLOR_SECONDARY, spaceBefore=6, spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextPlain', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.8, leading=12.5,
        textColor=COLOR_TEXT_MAIN, spaceAfter=5
    )

    callout_quote = ParagraphStyle(
        'CalloutQuote', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=12, leading=16,
        textColor=COLOR_ACCENT, alignment=1
    )

    badge_text = ParagraphStyle(
        'BadgeText', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10,
        textColor=COLOR_ACCENT
    )

    card_title = ParagraphStyle(
        'CardTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9.5, leading=12,
        textColor=COLOR_PRIMARY
    )

    card_body = ParagraphStyle(
        'CardBody', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    th_style = ParagraphStyle(
        'Th', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=11,
        textColor=COLOR_WHITE
    )

    td_style = ParagraphStyle(
        'Td', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=11,
        textColor=COLOR_TEXT_MAIN
    )

    td_bold = ParagraphStyle(
        'TdBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=11,
        textColor=COLOR_PRIMARY
    )

    story = []
    page_w = letter[0] - 80

    # =========================================================================
    # PAGE 1: THE BIG PICTURE (WHAT SALLY IS IN 30 SECONDS)
    # =========================================================================
    pill_table = Table(
        [[Paragraph("<b>PLAIN ENGLISH BRIEFING FOR THE CEO & LEADERSHIP TEAM</b>", badge_text)]],
        colWidths=[page_w]
    )
    pill_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, COLOR_ACCENT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pill_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Sally: Explained Simply", title_style))
    story.append(Paragraph("<b>What it actually is, why it matters, and how you can explain it to anyone.</b>", subtitle_style))

    # The Big 1-Sentence Takeaway Card
    hook_p = Paragraph('"Sally is an AI coworker for intellectual property (patents and trademarks) that cuts 20 hours of painful legal drafting down to 2 hours - and has a built-in truth detector so it never makes things up."', callout_quote)
    hook_table = Table([[hook_p]], colWidths=[page_w])
    hook_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_ACCENT),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(hook_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("The Problem in Plain English: Why Does Sally Need to Exist?", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=6))

    story.append(Paragraph(
        "Whenever a company invents something new (a new microchip, drug, AI algorithm, or mechanical device), "
        "they must file a patent to protect their idea from competitors. But doing that today is painful:",
        body_style
    ))

    prob_cards = [
        [
            Paragraph("<b>1. It is Insanely Expensive</b><br/>A single patent filing costs <b>$10,000 to $25,000</b> just in attorney hourly fees.", card_body),
            Paragraph("<b>2. It is Terribly Slow</b><br/>It takes a specialized lawyer <b>20 to 40 hours</b> of manual, exhausting paperwork per filing.", card_body),
            Paragraph("<b>3. Government Backlogs</b><br/>Patent offices have over <b>700,000 backlogged filings</b> taking over 2 years to approve.", card_body),
        ]
    ]
    prob_table = Table(prob_cards, colWidths=[page_w/3.0]*3)
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Why Can't Lawyers Just Use ChatGPT?", h2_style))
    story.append(Paragraph(
        "Lawyers tried using ChatGPT and general AI, and it was a total disaster. "
        "General AI tools have a bad habit called <b>'hallucinating'</b> - they sound completely confident, "
        "but they make up fake laws, fake patent numbers, and fake court cases out of thin air. "
        "In patent law, if a lawyer files a document with even one fake quote or made-up claim, "
        "<b>the patent is permanently destroyed</b> and the lawyer can be sued for malpractice or lose their legal license.",
        body_style
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>The Bottom Line:</b> Lawyers love AI's speed, but they cannot tolerate AI lies. "
        "<b>Sally solves this completely: every single word Sally writes comes with undeniable proof.</b>",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: SALLY'S 6 SUPERPOWERS
    # =========================================================================
    story.append(Paragraph("Sally's 6 Superpowers: What It Does Everyday", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Think of Sally as a team of 6 super-fast, hyper-accurate paralegals working 24/7 for the lawyer:",
        body_style
    ))

    features_data = [
        [
            Paragraph("<b>Superpower</b>", th_style),
            Paragraph("<b>What It Actually Does (In Plain English)</b>", th_style),
            Paragraph("<b>Real-World Outcome</b>", th_style),
        ],
        [
            Paragraph("<b>1. The Patent Detective</b><br/>(Prior Art Search)", td_bold),
            Paragraph("Searches 100 million patents worldwide in 2 seconds to check if someone already invented your idea.", td_style),
            Paragraph("<font color='#10B981'><b>Saves $5,000</b></font><br/>Stops you from filing dead ideas.", td_style),
        ],
        [
            Paragraph("<b>2. The Patent Drafter</b><br/>(Drafting Studio)", td_bold),
            Paragraph("Takes an inventor's rough notes and turns them into a complete 25-page formal patent draft with all legal claims.", td_style),
            Paragraph("<font color='#10B981'><b>6x Faster</b></font><br/>20 hours becomes 2 hours.", td_style),
        ],
        [
            Paragraph("<b>3. The Rejection Solver</b><br/>(Office Action Assistant)", td_bold),
            Paragraph("When the government patent office says 'No' (which happens 80% of the time), Sally reads their letter and drafts a winning counter-argument.", td_style),
            Paragraph("<font color='#10B981'><b>Win Back Approvals</b></font><br/>Examiner tendencies unlocked.", td_style),
        ],
        [
            Paragraph("<b>4. The Brand Radar</b><br/>(Trademark Clearance)", td_bold),
            Paragraph("Checks company and brand names across the US, Europe, and globally to make sure nobody else owns your name or logo.", td_style),
            Paragraph("<font color='#10B981'><b>Zero Lawsuits</b></font><br/>Avoids costly rebrands.", td_style),
        ],
        [
            Paragraph("<b>5. The Copycat Watcher</b><br/>(FTO & Infringement)", td_bold),
            Paragraph("Compares your product against competitor patents to make sure you won't get sued for infringement, or catches rivals copying you.", td_style),
            Paragraph("<font color='#10B981'><b>Court-Ready Charts</b></font><br/>Bulletproof legal defense.", td_style),
        ],
        [
            Paragraph("<b>6. The Friendly Interviewer</b><br/>(Invention Interview)", td_bold),
            Paragraph("Engineers hate legal jargon. Sally chats with the inventor like a friendly journalist in 4 simple turns to extract all technical details.", td_style),
            Paragraph("<font color='#10B981'><b>Zero Jargon Needed</b></font><br/>Inventors just speak normally.", td_style),
        ],
    ]

    feat_table = Table(features_data, colWidths=[120, 272, 140])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(feat_table)
    story.append(Spacer(1, 12))

    # Real World Example Box
    example_title = Paragraph("<b>A Real-World Example:</b>", ParagraphStyle('ExTitle', parent=card_title, textColor=COLOR_ACCENT))
    example_body = Paragraph(
        "An engineer at a robotics company designs a new robotic gripper. "
        "Normally, the company pays a law firm $15,000. An associate spends 3 weeks writing the patent. "
        "<b>With Sally:</b> The engineer answers 5 simple questions in Sally's chat. "
        "Sally instantly checks 100M patents to verify the idea is new, and drafts the 25-page patent specification. "
        "The company's patent lawyer reviews and approves it in 90 minutes. "
        "<b>The result:</b> The company saves $10,000+ and gets their patent filed weeks ahead of competitors.",
        body_style
    )
    ex_table = Table([[example_title], [example_body]], colWidths=[page_w])
    ex_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_ACCENT_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.75, COLOR_ACCENT_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(ex_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: THE SECRET SAUCE (WHY SALLY NEVER LIES)
    # =========================================================================
    story.append(Paragraph("The 'Secret Sauce': Why Sally Never Lies", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Other AI tools try to sound clever by guessing. Sally is built to <b>prove everything</b>. "
        "Here is the simple difference between normal AI and Sally:",
        body_style
    ))

    # Flow Comparison
    flow_data = [
        [
            Paragraph("<b>HOW NORMAL CHATGPT WORKS:</b><br/>"
                      "1. User asks question.<br/>"
                      "2. AI guesses from fuzzy memory.<br/>"
                      "3. Sounds convincing, but <b>makes up fake facts!</b>", td_style),
            Paragraph("<b>HOW SALLY WORKS:</b><br/>"
                      "1. User asks question.<br/>"
                      "2. Sally retrieves real patents & real law books.<br/>"
                      "3. <b>Built-in Truth-Checker verifies every word.</b><br/>"
                      "4. If proof is missing, <b>Sally refuses to lie.</b>", td_style),
        ]
    ]
    flow_table = Table(flow_data, colWidths=[page_w/2.0]*2)
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COLOR_RED_LIGHT),
        ('BACKGROUND', (1, 0), (1, -1), COLOR_SUCCESS_LIGHT),
        ('BOX', (0, 0), (0, -1), 0.75, colors.HexColor("#FCA5A5")),
        ('BOX', (1, 0), (1, -1), 0.75, COLOR_SUCCESS),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(flow_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Sally's 4 Golden Safety Rules:", h2_style))

    safety_rules = [
        ("1. Exact Verbatim Quote Checking", "If Sally puts quotation marks around a law or patent excerpt, it must be an exact 100% word-for-word match. If even one word is changed, Sally strips the quotation marks so the lawyer is never misled."),
        ("2. No Ghost Footnotes", "Normal AI often generates fake footnotes like '[Source 1]'. In Sally, every footnote must point to a real document physically stored in the database. If it doesn't exist, Sally deletes it immediately."),
        ("3. The 'Refuse to Guess' Rule (Fail-Closed)", "If Sally cannot find solid legal proof for an answer, it does not invent an answer. It simply tells the lawyer: 'I could not verify this proposition from real authorities.' Lawyers love this because an honest 'I don't know' is infinitely safer than a confident lie."),
        ("4. Bank-Grade Confidentiality (Zero-Retention)", "A company's unreleased inventions are its most valuable secrets. Client files uploaded to Sally are cryptographically sealed in private vaults. They are NEVER shared, NEVER stored on public servers, and NEVER used to train outside AI models.")
    ]
    for title, desc in safety_rules:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", body_style))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: WHO BUYS SALLY & WHY (BUSINESS IMPACT)
    # =========================================================================
    story.append(Paragraph("Who Buys Sally and Why (The Business Impact)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Sally sells directly to three distinct types of customers, solving their #1 headache:",
        body_style
    ))

    buyer_data = [
        [
            Paragraph("<b>Target Customer</b>", th_style),
            Paragraph("<b>Their Big Headache Today</b>", th_style),
            Paragraph("<b>How Sally Changes Their Business</b>", th_style),
        ],
        [
            Paragraph("<b>Patent Law Firms</b><br/>(Boutiques & Am Law)", td_bold),
            Paragraph("Corporate clients force them into capped fixed fees ($8,000/patent). Associates spend 25 hours drafting, wiping out partner profits.", td_style),
            Paragraph("<b>Cuts drafting time by 75%.</b><br/>Firms finish 3x more patents with the same team, expanding profit margins by 400%.", td_style),
        ],
        [
            Paragraph("<b>Tech Enterprises</b><br/>(Startups to Fortune 500)", td_bold),
            Paragraph("Paying millions of dollars every year to outside law firms for simple prior art searches and patent draft reviews.", td_style),
            Paragraph("<b>Cuts legal bills by 50%.</b><br/>In-house engineers draft clear disclosures before ever paying outside lawyers.", td_style),
        ],
        [
            Paragraph("<b>Solo Attorneys & Small Firms</b>", td_bold),
            Paragraph("Cannot compete with giant 500-lawyer firms that have armies of junior paralegals and huge research budgets.", td_style),
            Paragraph("<b>Gives them superpowers.</b><br/>A solo lawyer with Sally can out-produce a 5-person associate team for $99/month.", td_style),
        ],
    ]

    buyer_table = Table(buyer_data, colWidths=[120, 206, 206])
    buyer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_SECONDARY),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_CARD]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(buyer_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("How We Make Money (Simple Pricing):", h2_style))

    pricing_cards = [
        [
            Paragraph("<b>Solo Practitioner</b><br/><font color='#3B82F6' size='11'><b>$99 / month</b></font><br/>For solo patent lawyers.<br/>50 searches, full drafting studio.", td_style),
            Paragraph("<b>IP Law Firm</b><br/><font color='#3B82F6' size='11'><b>$299 / lawyer / mo</b></font><br/>For collaborative law firms.<br/>Unlimited searches, shared vaults.", td_style),
            Paragraph("<b>Enterprise Corporate</b><br/><font color='#3B82F6' size='11'><b>$25k - $100k+ / yr</b></font><br/>For big tech companies.<br/>Private cloud, custom security.", td_style),
        ]
    ]
    pt_table = Table(pricing_cards, colWidths=[page_w/3.0]*3)
    pt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
        ('BOX', (0, 0), (-1, -1), 0.6, COLOR_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pt_table)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: THE CEO CHEAT SHEET (WORD-FOR-WORD SCRIPTS)
    # =========================================================================
    story.append(Paragraph("The CEO's Cheat Sheet: How to Explain Sally to Anyone", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=COLOR_ACCENT, spaceAfter=8))

    story.append(Paragraph(
        "Use these exact word-for-word scripts depending on who you are talking to:",
        body_style
    ))

    scripts = [
        ("At a Dinner Party or Casual Chat (10 Seconds):",
         '"We built an AI coworker for patent and trademark lawyers that actually works because it never makes stuff up. It turns 20 hours of painful patent paperwork into a 2-hour job."'),
        
        ("Pitching to an Investor (30 Seconds):",
         '"Intellectual property is a $65B industry where patent drafting costs $15,000 per filing. General AI like ChatGPT or Harvey hallucinates 20% to 70% of the time, creating massive malpractice risks. Sally is the first verification-first patent OS: our code-level truth checkers guarantee 100% citation accuracy with zero false citations. We turn patent drafting into a high-margin automated workflow."'),

        ("Talking to a Patent Attorney or Client (1 Minute):",
         '"Sally is built specifically for how patent attorneys work. It searches 100M patents in 2 seconds, writes provisional and nonprovisional drafts with 100% antecedent basis accuracy, and drafts Office Action responses. Most importantly, it is fail-closed: every quote is verified verbatim against real law, and every citation is tied to real evidence. You get the speed of generative AI with zero malpractice risk."'),

        ("Talking to Our Own Team & New Hires:",
         '"We are building the definitive truth engine for legal work. When a user asks a question, we retrieve real law, verify every single quote, and refuse to guess if proof is missing. We are building the only AI that attorneys can actually sign their legal names to."')
    ]

    for title, script in scripts:
        story.append(Paragraph(f"<b>{title}</b>", card_title))
        s_table = Table([[Paragraph(script, ParagraphStyle('ScP', parent=body_style, fontName='Helvetica-Oblique', textColor=COLOR_PRIMARY))]], colWidths=[page_w])
        s_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLOR_BG_CARD),
            ('BOX', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(s_table)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 4))
    story.append(Paragraph("The 3-Bullet Summary to Remember Always:", h2_style))
    summary_box = [
        [Paragraph(
            "<b>1. What is it?</b> An AI coworker for patent, trademark, and contract law.<br/>"
            "<b>2. Why is it special?</b> It has a built-in truth detector that refuses to lie or hallucinate.<br/>"
            "<b>3. What is the value?</b> Turns a 20-hour, $15,000 legal marathon into a 2-hour, lawyer-approved breeze.",
            body_style
        )]
    ]
    sum_table = Table(summary_box, colWidths=[page_w])
    sum_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLOR_SUCCESS_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.75, COLOR_SUCCESS),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sum_table)

    # Build Document
    doc.build(story, canvasmaker=CleanNumberedCanvas)
    print(f"Generated CEO PDF: {pdf_path}")
    return pdf_path


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'Sally_Explained_Simply.pdf'
    build_ceo_pdf(target)
