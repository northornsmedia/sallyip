from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def build_pdf(filename="SALLY_EXHIBITION_PROMPTS.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    num_style = ParagraphStyle(
        'PromptNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#2563EB")
    )
    
    prompt_style = ParagraphStyle(
        'PromptContent',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#0F172A")
    )

    prompts = [
        "Draft independent Claim 1 in formal USPTO statutory format for an automated drone battery swapping station comprising a robotic gripper, rotating carousel, and thermal management subsystem.",
        "Evaluate patent eligibility under 35 U.S.C. 101 and novelty under 102 for an edge-computing wearable device that uses on-device neural networks to predict cardiac arrhythmias in real time.",
        "Provide a structured 3-step Freedom-to-Operate (FTO) clearance methodology for a SaaS company integrating generative AI models into enterprise legal contract review.",
        "Draft a concise, rigorous responsive argument to overcome a 35 U.S.C. 103 obviousness rejection by demonstrating lack of motivation to combine Reference A (solar power inverter) with Reference B (submersible fluid cooling pump).",
        "Formulate an exhaustive prior art search strategy targeting an enterprise patent covering real-time biometric identity verification over encrypted WebRTC channels."
    ]

    story = []
    
    for i, p in enumerate(prompts, 1):
        num_p = Paragraph(f"Prompt {i}", num_style)
        text_p = Paragraph(p, prompt_style)
        
        box_table = Table([[num_p], [Spacer(1, 4)], [text_p]], colWidths=[532])
        box_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
            ('PADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ]))
        
        story.append(box_table)
        story.append(Spacer(1, 14))

    doc.build(story)
    print(f"Generated {filename} successfully.")

if __name__ == "__main__":
    build_pdf()
