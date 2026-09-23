import os
import sys
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Professional IP & Legal Palette
COLOR_PRIMARY = colors.HexColor("#0B0F19")
COLOR_ACCENT = colors.HexColor("#059669")  # Sally Green
COLOR_NAVY = colors.HexColor("#1E3A8A")
COLOR_CODE_BG = colors.HexColor("#0F172A")
COLOR_CODE_TEXT = colors.HexColor("#38BDF8")
COLOR_CARD_BG = colors.HexColor("#F8FAFC")
COLOR_BORDER = colors.HexColor("#CBD5E1")
COLOR_TEXT_MAIN = colors.HexColor("#1E293B")
COLOR_TEXT_MUTED = colors.HexColor("#64748B")
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
        self.drawString(82, letter[1] - 26, "|   Canonical Document #002: Provisional Patent Application (35 U.S.C. § 111(b))")
        
        self.drawString(36, 20, "CONFIDENTIAL & PROPRIETARY   •   PATENT ATTORNEY WORK PRODUCT")
        self.drawRightString(letter[0] - 36, 20, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def clean_xml(text):
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__(.*?)__', r'<b>\1</b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    text = re.sub(r'`(.*?)`', r'<font face="Courier">\1</font>', text)
    return text

def build_pdf(output_pdf="SALLY_PROVISIONAL_PATENT_APPLICATION_002.pdf"):
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=COLOR_PRIMARY
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=COLOR_TEXT_MUTED
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=COLOR_NAVY,
        spaceBefore=14,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=COLOR_PRIMARY,
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=COLOR_TEXT_MAIN,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=COLOR_TEXT_MAIN,
        leftIndent=14,
        spaceAfter=4
    )

    legal_claim_style = ParagraphStyle(
        'LegalClaim',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=COLOR_TEXT_MAIN,
        leftIndent=18,
        spaceAfter=6
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#065F46")
    )

    story = []

    # Header Badge Box
    badge_p = Paragraph("DOCUMENT #002  •  USPTO 35 U.S.C. § 111(b) / 37 C.F.R. § 1.53(c)  •  L3 DRAFTABLE  •  7 STATUTORY SECTIONS", badge_style)
    badge_table = Table([[badge_p]], colWidths=[532])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_GREEN_BG),
        ('BOX', (0,0), (-1,-1), 1, COLOR_GREEN_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 10))

    # Title & Metadata
    story.append(Paragraph("PROVISIONAL PATENT APPLICATION SPECIFICATION", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Filing Category:</b> US Provisional Application under 35 U.S.C. § 111(b) | <b>Priority Claim Basis:</b> 35 U.S.C. § 119(e)<br/><b>Jurisdiction:</b> United States Patent and Trademark Office (USPTO) | <b>Drafting Engine:</b> SallyIP Live Legal Orchestrator", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=2, spaceAfter=12))

    # Master Prompt Overview Box
    prompt_box_content = [
        Paragraph("<b>MASTER PROMPT ARCHITECTURE (TRIGGER FOR RIGHT-PANE STREAMING)</b>", h2_style),
        Paragraph("To cause Sally to bypass iterative turn-taking intake questions and immediately start writing the full statutory draft in the right-hand <b>DocPanel</b>, the master prompt supplies all core disclosure slots upfront: <i>(1) Title &amp; Working Overview, (2) Technical Problem Solved, (3) Enablement Mechanism &amp; Operating Flow, (4) Structural Components &amp; Assemblies, (5) Informal Figures Plan,</i> and <i>(6) Explicit Ready-to-Draft Directive</i>.", body_style)
    ]
    prompt_table = Table([[prompt_box_content]], colWidths=[532])
    prompt_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(prompt_table)
    story.append(Spacer(1, 14))

    # Section 1
    story.append(Paragraph("1. TITLE OF THE INVENTION", h1_style))
    story.append(Paragraph("<b>AUTOMATED DRONE BATTERY SWAPPING AND RAPID THERMAL CONDITIONING GROUND STATION</b>", body_style))
    story.append(Spacer(1, 6))

    # Section 2
    story.append(Paragraph("2. TECHNICAL FIELD", h1_style))
    story.append(Paragraph("The present disclosure relates generally to autonomous unmanned aerial vehicle (UAV) infrastructure systems, and more particularly to an automated robotic ground station configured for high-speed robotic battery extraction, dielectric liquid immersion thermal conditioning, multi-bay carousel indexing, and autonomous electronic diagnostic validation.", body_style))
    story.append(Spacer(1, 6))

    # Section 3
    story.append(Paragraph("3. BACKGROUND OF THE INVENTION", h1_style))
    story.append(Paragraph("Commercial autonomous unmanned aerial vehicles (UAVs) are deployed extensively for time-critical mission profiles, including perimeter surveillance, infrastructure inspection, agricultural mapping, and package delivery. The operational utility of multi-rotor UAV systems is fundamentally constrained by onboard electrochemical energy storage capacity, typically limiting flight endurance to 25 to 45 minutes per charge cycle.", body_style))
    story.append(Paragraph("Conventional turnaround methods suffer from severe operational bottlenecks: (a) Manual battery replacement requires dedicated ground personnel, defeating autonomous deployment; (b) Direct rapid charging on a landing pad generates excessive Joule heating, causing accelerated lithium plating, electrode degradation, and thermal runaway risks; (c) Existing mechanical swap mechanisms lack multi-axis positional tolerance, frequently jamming when incoming drones land with slight angular or translational offsets; and (d) Mechanical replacement mechanisms fail to verify internal electrical contact integrity or cell temperature prior to launch.", body_style))
    story.append(Paragraph("Consequently, there exists an immediate technical need for an automated ground station capable of autonomously centering a landed UAV, gently extracting a depleted battery pack, rapidly conditioning battery temperature via active dielectric fluid immersion, and inserting a fully charged, pre-diagnosed battery pack in under 90 seconds without human intervention.", body_style))
    story.append(Spacer(1, 6))

    # Section 4
    story.append(Paragraph("4. SUMMARY OF THE INVENTION", h1_style))
    story.append(Paragraph("The present invention addresses the aforementioned deficiencies by providing an autonomous robotic drone battery swapping and thermal conditioning ground station. The system integrates: (i) an adaptive optical alignment landing dock; (ii) a 4-DOF inverted delta robotic manipulator equipped with a dual-cam latch-release gripper; (iii) an 8-bay indexing rotary carousel housed in a sealed thermal conditioning enclosure; (iv) a closed-loop dielectric liquid immersion heat exchanger; (v) an automated CAN-bus diagnostic interface; and (vi) an edge supervisory computing node.", body_style))
    story.append(Paragraph("When an incoming UAV lands, dual high-speed visual cameras identify fiducial markers on the UAV underside. A motorized centering iris mechanically aligns the UAV chassis relative to a central extraction port. The robotic manipulator engages the depleted battery pack, actuates mechanical release latches, and lowers the pack along a keyed linear guide. The depleted pack is placed into an unoccupied bay of the carousel, where dielectric fluid circulation immediately extracts heat at a rate exceeding 1.8 kW. Simultaneously, the carousel indexes a fully charged, pre-conditioned battery pack into alignment. The manipulator inserts the charged pack into the UAV chassis until an audible mechanical detent clicks, and the onboard controller validates CAN-bus telemetry before clearing the UAV for immediate takeoff.", body_style))
    story.append(Spacer(1, 6))

    # Section 5
    story.append(Paragraph("5. BRIEF DESCRIPTION OF THE DRAWINGS", h1_style))
    story.append(Paragraph("The accompanying drawings, which are incorporated in and constitute part of this provisional specification, illustrate exemplary non-limiting embodiments of the invention:", body_style))
    story.append(Paragraph("<b>FIG. 1</b> is a perspective structural view of the automated ground station showing the upper landing dock, centering iris mechanism, and weather-sealed ingress hatch.", bullet_style))
    story.append(Paragraph("<b>FIG. 2</b> is a cutaway elevation view depicting the 4-DOF inverted delta manipulator, battery extraction path, and the indexing 8-bay rotary carousel.", bullet_style))
    story.append(Paragraph("<b>FIG. 3</b> is a schematic diagram of the closed-loop dielectric fluid immersion thermal conditioning subsystem, heat exchanger, and chiller circuit.", bullet_style))
    story.append(Paragraph("<b>FIG. 4</b> is an electrical block diagram of the edge supervisory controller, CAN-bus diagnostic probe, and optical alignment sensor array.", bullet_style))
    story.append(Paragraph("<b>FIG. 5</b> is an operational logic flowchart illustrating the automated landing, optical alignment, extraction, immersion conditioning, insertion, and validation sequence.", bullet_style))
    story.append(Spacer(1, 6))

    # Section 6
    story.append(Paragraph("6. DETAILED DESCRIPTION OF THE INVENTION", h1_style))
    story.append(Paragraph("Referring to <b>FIG. 1</b> and <b>FIG. 2</b>, the ground station <b>[100]</b> includes an upper landing platform <b>[102]</b> having an array of high-intensity infrared LEDs and downward-facing optical sensors <b>[104]</b> configured to communicate with an incoming UAV <b>[200]</b>. Upon touchdown, motorized centering arms <b>[106]</b> driven by dual stepper actuators converge symmetrically to translate the UAV chassis within +/- 0.5 mm of reference datum axis <b>Z-Z'</b>.", body_style))
    story.append(Paragraph("Positioned beneath the landing aperture is a 4-degree-of-freedom inverted delta robotic manipulator <b>[110]</b> having carbon-fiber linkage arms driven by brushless servomotors with optical absolute encoders. The end-effector comprises a dual-jaw latch-actuation gripper <b>[112]</b> having electromagnetic locking pins. When raised toward the underside of UAV <b>[200]</b>, gripper <b>[112]</b> depresses spring-loaded locking pawls <b>[204]</b> of battery pack <b>[202]</b>, decoupling the pack from mechanical rails within the UAV belly pan.", body_style))
    story.append(Paragraph("Referring to <b>FIG. 2</b> and <b>FIG. 3</b>, beneath the delta robot is positioned an 8-bay indexing rotary carousel <b>[120]</b> driven by a precision harmonic-drive reduction motor <b>[122]</b>. Each bay <b>[124]</b> comprises an insulated receptacle with blind-mating high-current spring-loaded electrical contacts <b>[126]</b> and hydraulic quick-disconnect ports <b>[128]</b>. Submerged within each bay is a low-viscosity fluorochemical dielectric heat-transfer fluid <b>[130]</b> (e.g. 3M Novec or equivalent synthetic hydrocarbon). Pump <b>[132]</b> circulates dielectric fluid through a microchannel cold plate and liquid-to-air heat exchanger <b>[134]</b>, maintaining battery core temperature between 22°C and 28°C during 4C rapid charging.", body_style))
    story.append(Paragraph("<b>Alternative Embodiments &amp; Variations:</b> In a second embodiment, the rotary carousel is replaced by a vertical modular rack system for high-density metropolitan delivery hubs. In a third embodiment, the dielectric immersion chamber utilizes vapor-chamber heat pipes with active Peltier thermoelectric coolers. In a fourth embodiment, inductive wireless power coils are integrated into the landing dock to maintain critical drone telemetry during the 60-second mechanical swap cycle.", body_style))
    story.append(Spacer(1, 6))

    # Section 7
    story.append(Paragraph("7. PRELIMINARY TECHNICAL CLAIM SCOPE & ABSTRACT", h1_style))
    story.append(Paragraph("<i>Note: Under 35 U.S.C. § 111(b)(2), statutory claims are not legally required for filing a US provisional application. However, to establish clear legal priority and provide strict 35 U.S.C. § 112 antecedent basis for subsequent non-provisional conversion within 12 months under § 119(e), the following exemplary claims are included:</i>", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Claim 1 (Independent Apparatus):</b><br/>An automated ground station for autonomous unmanned aerial vehicle (UAV) battery servicing, comprising:<br/>&nbsp;&nbsp;&nbsp;&nbsp;a landing platform comprising an optical alignment dock configured to center a landed UAV along a reference datum;<br/>&nbsp;&nbsp;&nbsp;&nbsp;a multi-axis robotic manipulator positioned beneath the landing platform and configured to disengage a mechanical latch of a depleted battery pack and translate the battery pack along a guided vertical axis;<br/>&nbsp;&nbsp;&nbsp;&nbsp;a rotary indexing carousel comprising a plurality of battery receptacles, each receptacle configured to receive a battery pack;<br/>&nbsp;&nbsp;&nbsp;&nbsp;a closed-loop thermal management system configured to circulate dielectric liquid through the battery receptacles to regulate battery temperature during charging; and<br/>&nbsp;&nbsp;&nbsp;&nbsp;an electronic diagnostic interface configured to perform a pre-flight digital handshake with the UAV upon insertion of a replacement battery pack.", legal_claim_style))
    story.append(Paragraph("<b>Claim 2 (Independent Method):</b><br/>A method for rapid autonomous turnaround of an unmanned aerial vehicle (UAV), comprising:<br/>&nbsp;&nbsp;&nbsp;&nbsp;detecting arrival of a UAV on an automated docking platform and actuating centering members to align the UAV chassis;<br/>&nbsp;&nbsp;&nbsp;&nbsp;actuating a robotic end-effector to depress mechanical release pawls and extract a depleted battery pack along a guided track;<br/>&nbsp;&nbsp;&nbsp;&nbsp;transferring the depleted battery pack into an immersion cooling receptacle of an indexing carousel;<br/>&nbsp;&nbsp;&nbsp;&nbsp;circulating a dielectric coolant across the depleted battery pack while delivering charging current;<br/>&nbsp;&nbsp;&nbsp;&nbsp;indexing the carousel to present a pre-conditioned, fully charged battery pack;<br/>&nbsp;&nbsp;&nbsp;&nbsp;inserting the charged battery pack into the UAV chassis until locking detents engage; and<br/>&nbsp;&nbsp;&nbsp;&nbsp;executing an automated diagnostic handshake confirming bus communication prior to releasing the UAV.", legal_claim_style))
    story.append(Spacer(1, 8))

    # Abstract Box
    abstract_content = [
        Paragraph("<b>ABSTRACT OF THE DISCLOSURE</b>", h2_style),
        Paragraph("An automated drone battery swapping and rapid thermal conditioning ground station includes an optical alignment landing dock, a 4-DOF inverted delta robotic manipulator, an 8-bay indexing rotary carousel, and a closed-loop dielectric liquid immersion cooling system. Upon landing, a centering iris aligns the drone chassis relative to an extraction port. The robotic manipulator engages and extracts a depleted battery pack, transferring it into a carousel receptacle where circulating dielectric coolant extracts heat during rapid charging. A pre-conditioned charged battery pack is retrieved from an adjacent bay and inserted into the drone chassis, followed by an automated electronic diagnostic handshake, enabling autonomous turnaround in under 90 seconds without cell degradation.", body_style)
    ]
    abstract_table = Table([[abstract_content]], colWidths=[532])
    abstract_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(abstract_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated {output_pdf} successfully.")

if __name__ == "__main__":
    build_pdf()
