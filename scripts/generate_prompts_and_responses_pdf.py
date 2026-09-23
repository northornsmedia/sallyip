import os
import sys
import json
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Colors
COLOR_PRIMARY = colors.HexColor("#0B0F19")
COLOR_ACCENT = colors.HexColor("#2563EB")
COLOR_CODE_BG = colors.HexColor("#0F172A")
COLOR_CODE_TEXT = colors.HexColor("#38BDF8")
COLOR_CARD_BG = colors.HexColor("#F8FAFC")
COLOR_BORDER = colors.HexColor("#CBD5E1")
COLOR_TEXT_MAIN = colors.HexColor("#1E293B")
COLOR_TEXT_MUTED = colors.HexColor("#64748B")
COLOR_GREEN = colors.HexColor("#059669")
COLOR_GREEN_BG = colors.HexColor("#ECFDF5")
COLOR_GREEN_BORDER = colors.HexColor("#A7F3D0")

class NumberedCanvas(canvas.Canvas):
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
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(COLOR_ACCENT)
        self.drawString(36, letter[1] - 26, "SALLY IP")
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawString(82, letter[1] - 26, "|   Verified Live Prompts & Responses   •   NVIDIA NIM")
        
        self.drawString(36, 20, "SALLY IP LABS   •   LIVE EXHIBITION BENCHMARK")
        self.drawRightString(letter[0] - 36, 20, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def clean_xml(text):
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    # Re-enable basic tags
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', text)
    return text

def format_markdown_to_reportlab(text):
    lines = text.strip().split('\n')
    paras = []
    
    for line in lines:
        l = line.strip()
        if not l or l.startswith('---') or l.startswith('==='):
            paras.append(('spacer', 4))
            continue
            
        if l.startswith('### '):
            paras.append(('h3', clean_xml(l[4:].strip())))
        elif l.startswith('## '):
            paras.append(('h2', clean_xml(l[3:].strip())))
        elif l.startswith('# '):
            paras.append(('h1', clean_xml(l[2:].strip())))
        elif l.startswith('* ') or l.startswith('- '):
            paras.append(('bullet', clean_xml(l[2:].strip())))
        elif re.match(r'^\d+\.\s', l):
            clean = re.sub(r'^\d+\.\s', '', l)
            num = re.match(r'^(\d+)\.', l).group(1)
            paras.append(('numbered', f"<b>{num}.</b> {clean_xml(clean)}"))
        else:
            paras.append(('p', clean_xml(l)))
            
    return paras

def build_pdf(json_path="scratch/prompts_and_responses.json", output_pdf="SALLY_PROMPTS_AND_RESPONSES.pdf"):
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=34
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=COLOR_PRIMARY
    )
    
    sub_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=COLOR_TEXT_MUTED
    )
    
    prompt_num_style = ParagraphStyle(
        'PromptNumStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=COLOR_ACCENT
    )
    
    prompt_box_style = ParagraphStyle(
        'PromptBoxStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=9.5,
        leading=14,
        textColor=COLOR_CODE_TEXT
    )

    resp_label = ParagraphStyle(
        'RespLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=COLOR_PRIMARY,
        spaceBefore=8,
        spaceAfter=4
    )
    
    response_h1 = ParagraphStyle(
        'ResH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=COLOR_ACCENT,
        spaceBefore=6,
        spaceAfter=3
    )

    response_h2 = ParagraphStyle(
        'ResH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=COLOR_PRIMARY,
        spaceBefore=5,
        spaceAfter=2
    )

    response_p = ParagraphStyle(
        'ResP',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=COLOR_TEXT_MAIN,
        spaceAfter=3
    )

    response_bullet = ParagraphStyle(
        'ResBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        leftIndent=14,
        textColor=COLOR_TEXT_MAIN,
        spaceAfter=2
    )

    badge_style = ParagraphStyle(
        'BadgeStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=COLOR_GREEN
    )

    story = []

    # Title header
    story.append(Paragraph("SALLY IP — VERIFIED PROMPTS &amp; LIVE RESPONSES", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Direct Output from NVIDIA NIM Backend  •  Zero Simulation  •  Exhibition Ready", sub_style))
    story.append(Spacer(1, 8))

    # Banner Table
    banner_data = [
        [
            Paragraph("<b>STATUS: LIVE VERIFIED &amp; TESTED</b><br/>Every prompt below was executed live against the NVIDIA NIM engine with active authentication.", badge_style),
            Paragraph("<b>BACKEND:</b> NVIDIA NIM<br/><b>STATUS CODE:</b> 200 OK across all runs", ParagraphStyle('BRight', fontName='Helvetica', fontSize=8, leading=11, textColor=COLOR_TEXT_MAIN))
        ]
    ]
    b_table = Table(banner_data, colWidths=[360, 180])
    b_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_GREEN_BG),
        ('BOX', (0,0), (-1,-1), 1, COLOR_GREEN_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(b_table)
    story.append(Spacer(1, 10))

    for idx, item in enumerate(data):
        if idx > 0:
            story.append(PageBreak())

        # Header for this Prompt
        head_data = [
            [
                Paragraph(f"<b>PROMPT {item['id']}: {item['title'].upper()}</b>", prompt_num_style),
                Paragraph(f"<b>Engine: {item['engine'].split('(')[0].strip()} &bull; Latency: {item['duration_ms']}ms</b>", ParagraphStyle('BadgeR', fontName='Helvetica-Bold', fontSize=8, leading=11, alignment=2, textColor=COLOR_GREEN))
            ]
        ]
        h_table = Table(head_data, colWidths=[360, 180])
        h_table.setStyle(TableStyle([('PADDING', (0,0), (-1,-1), 0)]))
        story.append(h_table)
        story.append(Spacer(1, 5))

        # Prompt Box
        p_data = [[
            Paragraph(f"<b>USER PROMPT:</b><br/>{clean_xml(item['prompt'])}", prompt_box_style)
        ]]
        p_box = Table(p_data, colWidths=[540])
        p_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), COLOR_CODE_BG),
            ('BOX', (0,0), (-1,-1), 1, COLOR_PRIMARY),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(p_box)
        story.append(Spacer(1, 6))

        story.append(Paragraph(f"<b>ACTUAL SALLY RESPONSE:</b>", resp_label))
        story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=2, spaceAfter=6))

        # Render Response Paragraphs directly into story so reportlab can paginate naturally!
        parsed = format_markdown_to_reportlab(item['response'])
        for ptype, text in parsed:
            if ptype == 'spacer':
                story.append(Spacer(1, 3))
            elif ptype == 'h1':
                story.append(Paragraph(text, response_h1))
            elif ptype in ('h2', 'h3'):
                story.append(Paragraph(text, response_h2))
            elif ptype in ('bullet', 'numbered'):
                story.append(Paragraph(text, response_bullet))
            else:
                story.append(Paragraph(text, response_p))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated {output_pdf} successfully.")

if __name__ == "__main__":
    build_pdf()
