import csv, html, io, json, re

FORMATS = {'pdf','docx','pptx','xlsx','csv','md','html','json','txt'}
MIMES = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'md': 'text/markdown',
    'html': 'text/html',
    'json': 'application/json',
    'txt': 'text/plain'
}
FORBIDDEN_ARTIFACT_PHRASES = [
    "i can't directly generate","i cannot generate","i can't create a pdf","i cannot create a pdf",
    "i'm unable to create","unable to provide downloadable","copy and paste this into",
    "copy this into word","copy this into microsoft word","save this as a pdf","save it as a pdf",
    "open google docs","use google docs","use microsoft word","i hope this helps","let me know if you'd like changes"
]

def safe_name(name, fmt):
    stem = re.sub(r'-+', '-', re.sub(r'[^A-Za-z0-9]+', '-', name or 'SallyIP document')).strip('-').lower()[:80] or 'sallyip-document'
    return f'{stem}.{fmt}'

def clean_markdown_inline(text):
    """Strip markdown bold/italic wrapper characters from headings or plain keys."""
    if not text:
        return ""
    t = text.strip()
    t = re.sub(r'^\*\*\*(.*?)\*\*\*$', r'\1', t)
    t = re.sub(r'^\*\*(.*?)\*\*$', r'\1', t)
    t = re.sub(r'^\*(.*?)\*$', r'\1', t)
    return t.strip()

def md_to_reportlab_html(text):
    """Convert Markdown inline formatting (bold, italic, code) into ReportLab XML markup."""
    if not text:
        return ""
    # Strip trailing markdown two-space linebreaks
    text = text.rstrip()
    # Escape XML entities first
    text = html.escape(text)
    # Convert bold+italic: ***text*** or ___text___
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<b><i>\1</i></b>', text)
    # Convert bold: **text** or __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)
    # Convert italic: *text* or _text_
    text = re.sub(r'(?<!\*)\*([^\*\n]+?)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'(?<!_)_([^\_\n]+?)_(?!_)', r'<i>\1</i>', text)
    # Convert inline code: `code`
    text = re.sub(r'`([^`\n]+?)`', r'<font face="Courier" size="8">\1</font>', text)
    return text

def add_docx_markdown_paragraph(doc, text, style=None):
    """Parse inline markdown tokens and add as styled runs to python-docx paragraph."""
    p = doc.add_paragraph(style=style)
    # Split text by bold/italic/code markdown boundaries
    tokens = re.split(r'(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*[^\*\n]+?\*|`[^`\n]+?`)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('***') and token.endswith('***') and len(token) > 6:
            r = p.add_run(token[3:-3])
            r.bold = True
            r.italic = True
        elif token.startswith('**') and token.endswith('**') and len(token) > 4:
            r = p.add_run(token[2:-2])
            r.bold = True
        elif token.startswith('*') and token.endswith('*') and len(token) > 2:
            r = p.add_run(token[1:-1])
            r.italic = True
        elif token.startswith('`') and token.endswith('`') and len(token) > 2:
            r = p.add_run(token[1:-1])
            r.font.name = 'Courier New'
        else:
            p.add_run(token)
    return p

def sections(content):
    """
    Parses Markdown content into semantic blocks:
    - ('heading', clean_text, level)
    - ('hr', '', 0)
    - ('table', rows_matrix, 0)
    - ('text', line, 1)
    """
    blocks = []
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.strip()
        if not line:
            i += 1
            continue

        # Horizontal rule: --- or *** or ___
        if re.match(r'^(?:---+|\*\*\*+|___+)$', line):
            blocks.append(('hr', '', 0))
            i += 1
            continue

        # Markdown Table: lines starting and ending with |
        if line.startswith('|') and line.endswith('|') and len(line) > 2:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1

            parsed_rows = []
            for t_line in table_lines:
                inner = t_line.strip('|')
                cells = [c.strip() for c in inner.split('|')]
                # Skip markdown header separator lines like | :--- | :--- |
                if all(re.match(r'^:?-+:?$', c) for c in cells if c):
                    continue
                parsed_rows.append(cells)

            if parsed_rows:
                blocks.append(('table', parsed_rows, 0))
            continue

        # Headings: #, ##, ###
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            heading_text = clean_markdown_inline(line.lstrip('#').strip())
            blocks.append(('heading', heading_text, max(1, min(level, 3))))
            i += 1
            continue

        blocks.append(('text', line, 1))
        i += 1

    return blocks or [('text', content, 1)]

def build_file(fmt, title, content, requested_filename=None):
    if fmt not in FORMATS:
        raise ValueError('Unsupported file format')
    content = (content or '').strip()
    if not content:
        raise ValueError('File content is empty')
    if len(content) > 120000:
        raise ValueError('File content is too large')
    lowered = content.lower()
    for phrase in FORBIDDEN_ARTIFACT_PHRASES:
        if phrase in lowered:
            raise ValueError('Conversational capability text detected in document content')

    title = clean_markdown_inline((title or 'SallyIP document').strip())[:120]
    out = io.BytesIO()

    if fmt == 'pdf':
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, Table, TableStyle, HRFlowable

        styles = getSampleStyleSheet()
        title_style = styles['Title']
        title_style.textColor = colors.HexColor('#0F172A')
        body_style = styles['BodyText']
        body_style.textColor = colors.HexColor('#1E293B')
        body_style.fontSize = 9.5
        body_style.leading = 14
        table_cell_style = ParagraphStyle('TableCell', parent=body_style, fontSize=8.5, leading=11)

        story = [Paragraph(html.escape(title), title_style), Spacer(1, 12)]
        blocks = sections(content)
        index = 0
        while index < len(blocks):
            kind, text, level = blocks[index]
            if kind == 'hr':
                story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#CBD5E1'), spaceBefore=8, spaceAfter=8))
                index += 1
                continue

            if kind == 'table':
                t_data = [[Paragraph(md_to_reportlab_html(cell), table_cell_style) for cell in row] for row in text]
                num_cols = max(len(r) for r in text)
                col_w = (A4[0] - 44 * mm) / max(1, num_cols)
                table = Table(t_data, colWidths=[col_w] * num_cols)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#0F172A')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                story.append(table)
                story.append(Spacer(1, 8))
                index += 1
                continue

            if kind == 'heading':
                h_style = styles.get(f'Heading{level}', styles['Heading2'])
                h_style.textColor = colors.HexColor('#0F172A')
                # If followed immediately by a single text line, keep them together
                if index + 1 < len(blocks) and blocks[index + 1][0] == 'text':
                    following = blocks[index + 1][1]
                    story.append(KeepTogether([
                        Paragraph(md_to_reportlab_html(text), h_style),
                        Spacer(1, 3),
                        Paragraph(md_to_reportlab_html(following), body_style),
                        Spacer(1, 6)
                    ]))
                    index += 2
                    continue
                story.append(Paragraph(md_to_reportlab_html(text), h_style))
                story.append(Spacer(1, 6))
                index += 1
                continue

            # Standard text line with bold/italic interpretation
            story.append(Paragraph(md_to_reportlab_html(text), body_style))
            story.append(Spacer(1, 4))
            index += 1

        def decorate(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setFillColorRGB(0.38, 0.4, 0.42)
            canvas.drawString(22 * mm, 14 * mm, 'SallyIP · Formal Statutory Document')
            canvas.drawRightString(A4[0] - 22 * mm, 14 * mm, f'Page {doc.page}')
            canvas.restoreState()

        SimpleDocTemplate(
            out,
            pagesize=A4,
            title=title,
            author='SallyIP',
            leftMargin=22 * mm,
            rightMargin=22 * mm,
            topMargin=24 * mm,
            bottomMargin=22 * mm
        ).build(story, onFirstPage=decorate, onLaterPages=decorate)

    elif fmt == 'docx':
        from docx import Document
        from docx.shared import Mm, Pt, RGBColor
        doc = Document()
        doc.core_properties.title = title
        doc.core_properties.author = 'SallyIP'
        section = doc.sections[0]
        section.top_margin = Mm(24)
        section.bottom_margin = Mm(22)
        section.left_margin = Mm(22)
        section.right_margin = Mm(22)
        section.header.paragraphs[0].text = 'SallyIP · Formal Statutory Document'
        section.footer.paragraphs[0].text = title
        doc.add_heading(title, 0)

        for kind, text, level in sections(content):
            if kind == 'hr':
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(6)
                p.paragraph_format.space_after = Pt(6)
            elif kind == 'heading':
                doc.add_heading(clean_markdown_inline(text), level=level)
            elif kind == 'table':
                t = doc.add_table(rows=len(text), cols=max(len(r) for r in text))
                t.style = 'Table Grid'
                for r_idx, row in enumerate(text):
                    for c_idx, cell in enumerate(row):
                        cell_p = t.rows[r_idx].cells[c_idx].paragraphs[0]
                        # Parse markdown runs into cell paragraph
                        tokens = re.split(r'(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*[^\*\n]+?\*)', cell)
                        for token in tokens:
                            if not token:
                                continue
                            if token.startswith('**') and token.endswith('**') and len(token) > 4:
                                r = cell_p.add_run(token[2:-2])
                                r.bold = True
                            elif token.startswith('*') and token.endswith('*') and len(token) > 2:
                                r = cell_p.add_run(token[1:-1])
                                r.italic = True
                            else:
                                cell_p.add_run(token)
            else:
                add_docx_markdown_paragraph(doc, text)

        doc.save(out)

    elif fmt == 'pptx':
        from pptx import Presentation
        deck = Presentation()
        slide = deck.slides.add_slide(deck.slide_layouts[0])
        slide.shapes.title.text = title
        slide.placeholders[1].text = 'Generated by SallyIP'
        chunks = [content[i:i + 900] for i in range(0, len(content), 900)]
        for index, chunk in enumerate(chunks[:30], 1):
            slide = deck.slides.add_slide(deck.slide_layouts[1])
            slide.shapes.title.text = f'{title} — {index}'
            slide.placeholders[1].text = chunk
        deck.save(out)

    elif fmt == 'xlsx':
        from openpyxl import Workbook
        from openpyxl.styles import Font
        wb = Workbook()
        ws = wb.active
        ws.title = 'SallyIP'
        ws.append([title])
        ws['A1'].font = Font(bold=True, size=16)
        ws.append(['Section', 'Content'])
        for kind, text, level in sections(content):
            if kind == 'table':
                for row in text:
                    ws.append(['Table Row', ' | '.join(row)])
            else:
                ws.append([kind.title(), clean_markdown_inline(text)])
        ws.column_dimensions['A'].width = 18
        ws.column_dimensions['B'].width = 100
        wb.save(out)

    elif fmt == 'csv':
        text_buf = io.StringIO()
        writer = csv.writer(text_buf)
        writer.writerow(['section', 'content'])
        for kind, value, _ in sections(content):
            if kind == 'table':
                for row in value:
                    writer.writerow(['table', ' | '.join(row)])
            else:
                writer.writerow([kind, clean_markdown_inline(value)])
        out.write(text_buf.getvalue().encode('utf-8-sig'))

    elif fmt == 'json':
        out.write(json.dumps({'title': title, 'generated_by': 'SallyIP', 'content': content}, ensure_ascii=False, indent=2).encode())

    elif fmt == 'html':
        body_parts = []
        for kind, text, level in sections(content):
            if kind == 'hr':
                body_parts.append('<hr style="border:0;border-top:1px solid #cbd5e1;margin:20px 0;" />')
            elif kind == 'heading':
                body_parts.append(f'<h{level}>{md_to_reportlab_html(text)}</h{level}>')
            elif kind == 'table':
                rows_html = []
                for idx, row in enumerate(text):
                    tag = 'th' if idx == 0 else 'td'
                    cells_html = ''.join(f'<{tag} style="border:1px solid #cbd5e1;padding:6px 10px;text-align:left;">{md_to_reportlab_html(c)}</{tag}>' for c in row)
                    rows_html.append(f'<tr>{cells_html}</tr>')
                body_parts.append(f'<table style="width:100%;border-collapse:collapse;margin:16px 0;">{"".join(rows_html)}</table>')
            else:
                body_parts.append(f'<p style="margin:8px 0;line-height:1.6;">{md_to_reportlab_html(text)}</p>')

        html_out = f'<!doctype html><html><head><meta charset="utf-8"><title>{html.escape(title)}</title><style>body{{font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#0f172a}}h1{{font-size:32px;border-bottom:2px solid #e2e8f0;padding-bottom:8px}}h2{{font-size:20px;margin-top:28px}}table{{font-size:13px}}th{{background:#f8fafc;font-weight:600}}b{{font-weight:700}}</style></head><body><h1>{html.escape(title)}</h1>{"".join(body_parts)}</body></html>'
        out.write(html_out.encode('utf-8'))

    else:
        out.write(content.encode('utf-8'))

    return safe_name(requested_filename or title, fmt), MIMES[fmt], out.getvalue()

if __name__ == '__main__':
    import base64, sys
    payload = json.load(sys.stdin)
    name, mime, data = build_file(payload['format'], payload.get('title'), payload.get('content'), payload.get('filename'))
    print(json.dumps({'filename': name, 'mime_type': mime, 'data': base64.b64encode(data).decode()}))
