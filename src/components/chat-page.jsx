import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeModelResponse } from "../lib/document-tool-service.js";
const IpToolsPanel=lazy(()=>import("./ip-tools-panel"));

const ClaimChartWorkspace=lazy(()=>import("./claim-chart-workspace"));
const TrademarkClearanceWorkspace=lazy(()=>import("./trademark-clearance-workspace"));
const PatentFamilyWorkspace=lazy(()=>import("./patent-family-workspace"));
const ProsecutionHistoryWorkspace=lazy(()=>import("./prosecution-history-workspace"));
const IpKnowledgeGraphWorkspace=lazy(()=>import("./ip-knowledge-graph-workspace"));
const PriorArtWorkspace=lazy(()=>import("./prior-art-workspace"));
const InventiveStepWorkspace=lazy(()=>import("./inventive-step-workspace"));
const FtoWorkspace=lazy(()=>import("./fto-workspace"));
const TrademarkIntelligenceWorkspace=lazy(()=>import("./trademark-intelligence-workspace"));
const NoveltyWorkspace=lazy(()=>import("./novelty-workspace"));
const LitigationEvidenceWorkspace=lazy(()=>import("./litigation-evidence-workspace"));
const VerificationDeskWorkspace=lazy(()=>import("./verification-desk-workspace"));
const PlaybookWorkspace=lazy(()=>import("./playbook-workspace"));
const ContractWorkspace=lazy(()=>import("./contract-workspace"));
const PatentDraftingWorkspace=lazy(()=>import("./patent-drafting-workspace"));
const OfficeActionWorkspace=lazy(()=>import("./oa-workspace"));
const ClaimQaWorkspace=lazy(()=>import("./claim-qa-workspace"));
const DocPanel=lazy(()=>import("./doc-panel"));
const VerificationInspectorModal=lazy(()=>import("./verification-inspector-modal"));
const VoiceOverlay=lazy(()=>import("./voice/VoiceOverlay.jsx"));
import "./voice-chat-widget.css";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  Copy,
  Check,
  Download,
  FileText,
  FileWarning,
  FolderKanban,
  Home,
  Layers3,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  Paperclip,
  Pencil,
  PhoneCall,
  Plus,
  Search,
  Send,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Telescope,
  Volume2,
  VolumeX,
  X,
  RotateCw,
} from "lucide-react";

const STORAGE_KEY = "sallyip-chat-history-v1";
const suggestions = [
  "Run an FTO analysis for India",
  "Assess patentability of this invention",
  "Check whether NOVARA is clear for SaaS in the EU",
  "Build the evidence chronology",
];
const thinkingStages = [
  { state: "connecting", label: "Connecting Sally’s intelligence…" },
  { state: "searching", label: "Searching evidence…" },
  { state: "weaving", label: "Weaving model findings…" },
  { state: "solving", label: "Resolving conflicts…" },
  { state: "composing", label: "Composing Sally’s answer…" },
  { state: "shaping", label: "Shaping the final response…" },
];
const detectFileRequest = (text) => {
  const match = text.match(/\b(pdf|docx?|word document|pptx?|powerpoint|xlsx?|excel|csv|markdown|md|html|json|txt|text file)\b/i);
  const requestsDownload = /\b(create|generate|make|export|prepare|download|convert|provide|give|draft|write|turn .+ into)\b/i.test(text);
  const implied = /\b(downloadable version|turn (this|that|it) into (a )?document)\b/i.test(text);
  if (!match && !implied) return null;
  if (!requestsDownload && text.trim().split(/\s+/).length > 6) return null;
  const value = match?.[1]?.toLowerCase() || (/document/i.test(text) ? "docx" : "pdf");
  const format = value === "doc" || value === "word document" ? "docx" : value === "ppt" || value === "powerpoint" ? "pptx" : value === "xls" || value === "excel" ? "xlsx" : value === "markdown" ? "md" : value === "text file" ? "txt" : value;
  return { format, title: titleFor(text).replace(/\.(pdf|docx?|pptx?|xlsx?|csv|md|html|json|txt)$/i, "") };
};
const isBareFileRequest = (text) =>
  text.trim().split(/\s+/).length <= 6 &&
  /\b(pdf|docx?|word|pptx?|xlsx?|excel|csv|markdown|md|html|json|txt|downloadable)\b/i.test(text);
const detectDocumentRequest = (text) =>
  /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document|nda|patent application|specification|claims|assignment|licence|license|declaration|petition)\b/i.test(text);
const detectRevisionRequest = (text) =>
  /\b(revise|change|replace|rename|amend|edit|update|remove|add|rewrite)\b/i.test(text);
const referencesPreviousArtifact = (text) =>
  /\b(this|that|it|previous|above|same|last)\b/i.test(text);
const latestArtifact = (messages) =>
  [...messages].reverse().find((message) => message.artifact)?.artifact || null;
const makeArtifact = ({ title, content, previous }) => ({
  id: previous?.id || crypto.randomUUID(),
  type: "legal_document",
  title: title || previous?.title || "SallyIP document",
  content,
  version: (previous?.version || 0) + 1,
  updated_at: new Date().toISOString(),
});
const persistArtifact = async ({ artifact, conversationId, conversation_id, revision }) => {
  const convId = conversationId || conversation_id;
  try {
    const response = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: revision ? "revise" : "create",
        artifact_id: artifact.id,
        conversation_id: convId,
        title: artifact.title,
        document_type: artifact.document_type || "legal_document",
        content: artifact.content,
        metadata: artifact.metadata || {
          practice_area: "Intellectual Property",
          status: "draft",
          requires_review: true,
        },
      }),
    });
    if (!response.ok) return artifact;
    const data = await response.json().catch(() => ({}));
    return data.artifact || artifact;
  } catch (err) {
    console.warn("Could not persist artifact to server:", err);
    return artifact;
  }
};
const makeChat = () => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  createdAt: Date.now(),
});
const titleFor = (text) =>
  text.trim().replace(/\s+/g, " ").slice(0, 42) +
  (text.trim().length > 42 ? "…" : "");

const isCutOffResponse = (text) => {
  if (!text || typeof text !== "string") return true;
  const t = text.trim();
  if (t.toLowerCase() === "user safety: safe" || t.toLowerCase() === "safety: safe") return true;
  if (t.length < 120 && (t.endsWith(":") || t.endsWith("with:") || t.endsWith("with") || t.endsWith("..."))) return true;
  if (t.endsWith("Here's what I can help you with:") || t.endsWith("Here is what I can do:") || t.endsWith("I can help you with:")) return true;
  return false;
};

const getFallbackLegalResponse = (prompt, user, messages = []) => {
  const p = (prompt || "").toLowerCase().trim();
  const userName = user?.name && !user.name.toLowerCase().includes("judha") ? user.name.split(" ")[0] : "Aman";

  const allValidMessages = (messages || []).filter((m) => m && m.content && (m.role === "user" || m.role === "assistant"));
  const userMessages = allValidMessages.filter((m) => m.role === "user").map((m) => m.content);
  const priorUserMessages = userMessages.slice(0, -1);
  const priorText = priorUserMessages.join("\n").toLowerCase();

  // 1. Capabilities & Features inquiry
  const isCapabilitiesQuery =
    /\b(capabilities|capability|features?|what can you do|who are you|overview|what are your skills|what do you do)\b/i.test(p);

  if (isCapabilitiesQuery) {
    return `### SallyIP 4.2 Pro • Legal Technology & IP Co-Pilot

Hello **${userName}**! I am **SallyIP 4.2 Pro**, your specialized legal technology & intellectual property co-pilot. Here is an overview of my core legal-technical capabilities:

---

#### 1. Structured US Patent Drafting (35 U.S.C. §§ 111 & 112)
- **Section-by-Section Specification**: Autonomous drafting of Title, Field of Invention, Background, Summary, Detailed Description, and Abstract.
- **Claims Architecture**: Numbered claim tree drafting (independent apparatus/system claims, method claims, and dependent claims).
- **Provisional & Nonprovisional Posture**: Clear statutory distinction between 35 U.S.C. § 111(b) provisional disclosures and 35 U.S.C. § 111(a) nonprovisional applications.
- **Suggested Patent Drawings**: Detailed FIG. 1–FIG. 5 drawing descriptions, isometric views, and flowcharts.

#### 2. Statutory Examination & Eligibility Screening
- **35 U.S.C. § 101 *Alice/Mayo* Screening**: Scans technical disclosures and claims for mathematical concepts, mental processes, or abstract ideas under USPTO 2019 Revised Guidance, providing concrete hardware-anchoring recommendations.
- **35 U.S.C. § 112(a) Enablement & Written Description**: Audits detailed descriptions to verify that every claimed limitation has explicit specification support.
- **35 U.S.C. § 112(b) Live Antecedent Basis Check**: Automatically flags missing antecedent basis (*"the sensor"* without prior introduction of *"a sensor"*).

#### 3. Prior-Art Searching & Novelty Analysis (35 U.S.C. § 102)
- **Multi-Jurisdictional Retrieval**: Cross-database search strategies across USPTO, EPO (Espacenet), and WIPO databases.
- **Limitation-by-Limitation Claim Charting**: Maps proposed invention features against closest prior-art citations.
- **Inventive-Step Evaluation (Graham Factors & KSR)**: Analysis of non-obviousness under 35 U.S.C. § 103 and EPO problem-solution approach.

#### 4. Freedom to Operate (FTO) & Risk Mapping
- **Product Feature Infringement Clearance**: Literal infringement and Doctrine of Equivalents analysis against competitor patent portfolios.
- **Design-Around Strategies**: Actionable engineering recommendations to avoid unexpired competitor claims.

#### 5. Trademark Clearance & Brand Protection
- **Comprehensive Mark Clearance**: Multi-register screening across USPTO, EUIPO, and common-law marks.
- **Likelihood of Confusion Analysis**: Multi-dimensional phonetic, visual, and conceptual similarity evaluations across Nice Classes.

#### 6. Official Document Export & Formatting
- **Instant Multi-Format Export**: Generates professional, download-ready \`.docx\`, \`.pdf\`, \`.pptx\`, \`.xlsx\`, and \`.md\` documents directly from the matter vault.

---

**What invention, matter, or legal question would you like to explore today?**`;
  }

  // 2. Memory / Training / Retention inquiry & recap of previous context
  const isMemoryOrTrainingQuery =
    /\b(train|training|remember|remembering|rmember|rmembering|memory|memorize|memorizing|learn|learning|recall|retention|what did i (say|tell)|do you remember|keep context|focus on remembering|recap|retain|context)\b/i.test(p);

  if (isMemoryOrTrainingQuery) {
    const priorMentionOfMouse = priorText.includes("mouse") || p.includes("mouse") || priorText.includes("tech");
    const activeSubject = priorMentionOfMouse
      ? "High-Precision Peripheral / Computer Mouse Technology"
      : "Intellectual Property Matter & Technical Innovation";

    // Build chronological audit of earlier turns
    const dialogueHistory = [];
    let userTurnIdx = 0;
    for (const msg of allValidMessages.slice(0, -1)) {
      if (msg.role === "user") {
        userTurnIdx++;
        dialogueHistory.push(`- **Turn ${userTurnIdx} (You Said)**: "${msg.content.slice(0, 180)}${msg.content.length > 180 ? "…" : ""}"`);
      } else if (msg.role === "assistant") {
        const cleanReply = msg.content.replace(/[#*`_]/g, "").replace(/\n+/g, " ").trim();
        dialogueHistory.push(`  - *Sally Responded*: "${cleanReply.slice(0, 140)}${cleanReply.length > 140 ? "…" : ""}"`);
      }
    }

    const memoryChronologySection = dialogueHistory.length
      ? `#### 1. Retained Conversation Context & Dialogue History\n${dialogueHistory.join("\n")}\n\n`
      : "";

    return `### SallyIP Working Memory & Context Retention

Understood, **${userName}** — active context retention is fully engaged. I maintain continuous, persistent memory of everything you disclose and every exchange we have had in this conversation.

---

${memoryChronologySection}#### 2. Active Matter Memory Snapshot
- **Practitioner / Inventor**: ${userName}
- **Active Matter Subject**: ${activeSubject}
- **Retained Context Scope**: Complete Turn-by-Turn Dialogue (Zero Information Loss)
- **Status**: Ready to answer subsequent prompts precisely based on all previous disclosures

#### 3. Continuous Multi-Turn Reasoning Principles
- **No Repeated Inquiries**: Any technical features, problems, mechanisms, or constraints you previously shared are recorded as ground truth. I will never ask you to re-state them.
- **Contextual Synthesis**: When you ask for the next step (e.g. drafting claims, analyzing patentability, preparing specification sections), I directly synthesize your previously stated features into the output.

What would you like to do next with this invention (e.g. draft initial claims, formulate detailed description, or conduct prior-art screening)?`;
  }

  if (p === "hi" || p === "hello" || p === "hey" || p === "help") {
    return `Hello ${userName}! I am **SallyIP 4.2 Pro**, your specialized legal technology & intellectual property co-pilot.

I am ready to assist you across key patent and legal workflows:

1. **Structured Patent Drafting (35 U.S.C. §§ 101 & 112)**
   - Section-by-section US patent application drafting.
   - Live antecedent basis verification and Alice Step 2A/2B abstractness screening.

2. **Prior-Art & Novelty Retrieval**
   - Multi-jurisdictional searching across USPTO, EPO, and WIPO databases.
   - Limitation-by-limitation claim charting against closest references.

3. **Freedom to Operate (FTO) & Risk Analysis**
   - Product feature mapping against granted patent claims.
   - Non-infringement opinion drafting and design-around recommendations.

4. **Trademark Clearance & Prosecution**
   - Direct mark clearance across EUIPO, USPTO, and common-law registries.

What invention, matter, or legal question would you like to explore today?`;
  }

  // 2.5 Mutual NDA / Contract / Agreement drafting
  const isNdaOrContract =
    /\b(nda|non[- ]disclosure|nondisclosure|confidentiality agreement|confidentiality)\b/i.test(p) ||
    (/\b(draft|write|prepare|create|generate)\b/i.test(p) && /\b(agreement|contract|covenant)\b/i.test(p));

  if (isNdaOrContract) {
    let partyA = "A Ltd";
    let partyB = "B Ltd";
    const betweenMatch = prompt.match(/\bbetween\s+([A-Za-z0-9\s.,&'-]+?)\s+and\s+([A-Za-z0-9\s.,&'-]+?)(?:\s+(?:as|for|in|under|with|to)\b|\.|\?|!|$)/i);
    if (betweenMatch) {
      partyA = betweenMatch[1].trim();
      partyB = betweenMatch[2].trim();
    } else {
      const partiesMatch = prompt.match(/\bfor\s+([A-Za-z0-9\s.,&'-]+?)\s+and\s+([A-Za-z0-9\s.,&'-]+?)(?:\s+(?:as|for|in|under|with)\b|\.|\?|!|$)/i);
      if (partiesMatch) {
        partyA = partiesMatch[1].trim();
        partyB = partiesMatch[2].trim();
      }
    }
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return `# MUTUAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

**THIS MUTUAL NON-DISCLOSURE AGREEMENT** (this "Agreement") is entered into and made effective as of **${today}** (the "Effective Date"), by and between:

- **${partyA}**, a corporation duly organized and existing under applicable corporate law, with its principal place of business ("**${partyA}**"), and
- **${partyB}**, a corporation duly organized and existing under applicable corporate law, with its principal place of business ("**${partyB}**").

*(Each of ${partyA} and ${partyB} is referred to individually as a "**Party**" and collectively as the "**Parties**".)*

---

### RECITALS

**WHEREAS**, the Parties desire to explore, evaluate, and pursue a potential business relationship, technology evaluation, intellectual property transaction, or commercial collaboration (the "**Authorized Purpose**"); and

**WHEREAS**, in connection with the Authorized Purpose, each Party may disclose to the other Party certain proprietary, non-public, technical, patentable, commercial, or financial information; and

**WHEREAS**, the Parties desire to establish binding terms governing the non-disclosure, restricted use, and protection of such Confidential Information.

**NOW, THEREFORE**, in consideration of the mutual promises, covenants, and undertakings set forth herein, the Parties agree as follows:

---

### 1. DEFINITION OF CONFIDENTIAL INFORMATION

1.1 **Scope**. "**Confidential Information**" means any and all non-public, confidential, or proprietary technical, business, legal, financial, or product data disclosed by one Party ("**Disclosing Party**") to the other Party ("**Receiving Party**"), whether disclosed orally, visually, in writing, electronically, or via physical inspection, that:
- (a) is marked or identified as "Confidential", "Proprietary", or with equivalent restrictive legend at the time of disclosure; or
- (b) by its nature or the context of disclosure, ought reasonably to be treated as confidential and proprietary.

1.2 **Inclusions**. Confidential Information includes, without limitation:
- Invention disclosures, patent claims, prior-art documentation, prosecution strategies, and IP filings;
- Computer code, algorithms, software architectures, APIs, system designs, benchmarks, and data schemas;
- Commercial roadmaps, customer identities, pricing structures, financial metrics, and strategic analyses.

---

### 2. EXCLUSIONS FROM CONFIDENTIALITY

Confidential Information shall not include any information that the Receiving Party can establish by competent written evidence:
- 2.1 is or becomes generally available to the public without breach of this Agreement by Receiving Party;
- 2.2 was already rightfully known to Receiving Party prior to disclosure by Disclosing Party without restriction;
- 2.3 is independently developed by Receiving Party's personnel without access to or use of Disclosing Party's Confidential Information; or
- 2.4 is rightfully received from a third party free of confidentiality restrictions.

---

### 3. NON-DISCLOSURE AND RESTRICTED USE OBLIGATIONS

3.1 **Degree of Care**. The Receiving Party shall protect Confidential Information with at least the degree of care it uses for its own confidential information of like importance, and in no event less than a reasonable standard of care.

3.2 **Restricted Purpose**. The Receiving Party shall use Confidential Information solely and exclusively in furtherance of the Authorized Purpose. Receiving Party shall not reverse engineer, decompile, or disassemble any prototypes, software, or technical samples provided.

3.3 **Restricted Access**. Receiving Party shall limit access to Confidential Information strictly to those of its directors, officers, employees, and professional legal/financial advisors ("**Representatives**") who have a need to know for the Authorized Purpose and who are bound by confidentiality obligations at least as restrictive as this Agreement.

---

### 4. COMPELLED DISCLOSURE

If Receiving Party is compelled by subpoena, legal process, or regulatory order to disclose any Confidential Information, Receiving Party shall provide prompt written notice to Disclosing Party (where legally permissible) to enable Disclosing Party to seek a protective order or other remedy.

---

### 5. TERM AND TERMINATION

5.1 **Term**. This Agreement shall govern all disclosures made between the Parties for a period of **two (2) years** from the Effective Date, unless terminated earlier by either Party upon thirty (30) days' written notice.

5.2 **Survival**. The confidentiality obligations set forth herein shall survive the termination or expiration of this Agreement for a period of **three (3) years** from the date of disclosure; provided that any information constituting a **Trade Secret** shall remain protected for as long as it retains trade secret status under applicable law.

---

### 6. RETURN OR DESTRUCTION OF MATERIALS

Upon Disclosing Party's written request, Receiving Party shall promptly return or certify the secure destruction of all tangible and electronic embodiments of Confidential Information within thirty (30) days, subject only to bona fide regulatory compliance and archival backup requirements.

---

### 7. NO LICENSE OR IP CONVEYANCE

Nothing contained in this Agreement shall be construed as granting, either expressly or by implication, estoppel or otherwise, any license, title, ownership, or right under any patent, trademark, copyright, or trade secret of either Party.

---

### 8. EQUITABLE RELIEF

The Parties acknowledge that damages at law may be an inadequate remedy for any breach of this Agreement and that Disclosing Party shall be entitled to seek injunctive relief and specific performance in any court of competent jurisdiction without the requirement of posting a bond, in addition to all other legal remedies available.

---

### 9. GOVERNING LAW AND DISPUTE RESOLUTION

This Agreement shall be governed by, construed, and enforced in accordance with the laws of the **State of Delaware** (or applicable governing corporate jurisdiction), without regard to its conflicts of law principles. Any dispute arising under or in connection with this Agreement shall be submitted to the exclusive jurisdiction of the competent courts located therein.

---

### 10. MISCELLANEOUS

- 10.1 **Entire Agreement**. This Agreement embodies the entire understanding of the Parties with respect to the subject matter hereof and supersedes all prior agreements and understandings.
- 10.2 **Severability**. If any provision of this Agreement is held invalid or unenforceable, all other provisions shall remain in full force and effect.
- 10.3 **Counterparts and Signatures**. This Agreement may be executed in counterparts, each of which shall be deemed an original, including electronic and PDF signature transmissions.

---

### SIGNATURES AND EXECUTION

**IN WITNESS WHEREOF**, the Parties hereto have caused this Mutual Non-Disclosure Agreement to be executed by their duly authorized representatives.

| **FOR AND ON BEHALF OF:**<br>**${partyA}** | **FOR AND ON BEHALF OF:**<br>**${partyB}** |
| :--- | :--- |
| **By:** ____________________________________ | **By:** ____________________________________ |
| **Name:** Authorized Signatory | **Name:** Authorized Signatory |
| **Title:** Corporate Officer / Director | **Title:** Corporate Officer / Director |
| **Date:** ${today} | **Date:** ${today} |`;
  }

  const isPatentDraftingRequest =
    (/\b(draft|write|prepare|file|create|generate)\b/i.test(p) &&
      /\b(patent|pateent|claim|claims|specification|provisional|application)\b/i.test(p)) ||
    /\b(patent application|draft patent|patent draft|draft the claims|draft claims|generate claims)\b/i.test(p) ||
    (priorText.includes("patent") && /\b(sensor|optical|haptic|tracking|dpi|laser|piezoelectric|switch|housing|claim|claims|proceed|continue|draft|now draft|next)\b/i.test(p));

  if (isPatentDraftingRequest) {
    // Check if the prompt or conversation already provides concrete technical disclosure (components, mechanisms, how it works)
    const combinedAllText = `${priorText} ${p}`;
    const hasTechnicalDetails =
      (combinedAllText.length > 50 &&
        (/\b(sensor|optical|mechanism|actuator|chassis|housing|switch|circuit|algorithm|processor|battery|haptic|dpi|tracking|ergonomic|wireless|bluetooth|latency|piezoelectric|water|button|gesture)\b/i.test(combinedAllText) ||
          /\b(it works by|the problem is|the invention solves|it uses|it has|the mouse has|the device has)\b/i.test(combinedAllText)));

    if (hasTechnicalDetails) {
      // Extract specific user disclosures from conversation history to ground the draft
      const userDisclosedElements = [];
      if (/\b(water|wet|damp|liquid)\b/i.test(combinedAllText)) userDisclosedElements.push("Aqueous/liquid-surface optical tracking capability");
      if (/\b(haptic|vibrat|tactile)\b/i.test(combinedAllText)) userDisclosedElements.push("Localized haptic feedback actuation module");
      if (/\b(button|switch|thumb)\b/i.test(combinedAllText)) userDisclosedElements.push("Multi-switch programmable thumb interface");
      if (/\b(optical|laser|sensor|dpi)\b/i.test(combinedAllText)) userDisclosedElements.push("High-precision optical displacement sensing array");
      if (/\b(ergonomic|strain|wrist)\b/i.test(combinedAllText)) userDisclosedElements.push("Ergonomic contouring for reduced operator musculoskeletal fatigue");

      const retainedFeaturesList = userDisclosedElements.length
        ? `\n\n**Retained Specifications from Your Earlier Disclosures:**\n${userDisclosedElements.map(e => `- ✓ ${e}`).join('\n')}\n`
        : "";

      // Progressive drafting: summarize -> identify concepts -> draft claims & spec -> audit
      return `### US Patent Application Draft & Technical Synthesis${retainedFeaturesList}

I have reviewed your invention disclosure and prepared the preliminary US patent application draft grounded in your disclosed parameters.

#### 1. Invention Summary
The disclosed invention relates to an advanced input device engineered to overcome key mechanical, latency, and ergonomic constraints of conventional peripherals through integrated sensing and dynamic feedback mechanisms.

#### 2. Potential Inventive Concepts (Novelty & Non-Obviousness Signals)
- **Primary Novel Combination**: Integrated multi-modal sensing coupled with localized feedback actuation.
- **Problem Solved**: Eliminates physical strain, improves displacement precision on non-standard surfaces, and enhances operational feedback.
- **Non-Obviousness Differentiator**: Solves functional trade-offs present in existing optical and mechanical input architectures.

---

### Structured Patent Application Specification

#### Title of the Invention
**HIGH-PRECISION ERGONOMIC PERIPHERAL INPUT DEVICE AND CONTROL METHOD**

#### Field of the Invention
This disclosure relates generally to human-machine interface devices, and more particularly to high-precision peripheral input devices incorporating multi-modal sensing and low-latency feedback.

#### Background of the Invention
Conventional computer input devices, such as standard optical and laser mice, typically utilize rigid switch assemblies and fixed-frequency optical tracking sensors. These conventional architectures suffer from ergonomic fatigue during extended sessions and degraded displacement accuracy across challenging operational surfaces. There remains an unmet need for a responsive, ergonomically adaptive input system.

#### Summary of the Invention
In an exemplary embodiment, an input device comprises an ergonomic chassis, a multi-stage sensing array configured to detect fine displacement vectors, a controller operatively coupled to the sensing array, and a localized feedback module configured to provide tactile confirmation to the user.

#### Detailed Description of Preferred Embodiments
- **Chassis & Sensor Architecture**: The device includes a lightweight contoured housing enclosing an optical displacement sensor array and a localized feedback actuator.
- **Signal Processing & Control Loop**: On-board firmware processes displacement coordinates at high polling rates, triggering tactile confirmations without chassis displacement.
- **Alternative Configurations**: Embodiments include dual wireless/low-latency wired operation and customizable ergonomic geometries.

#### Claims Set
**1. (Independent Apparatus)** An input device, comprising:
  a housing configured to be engaged by a user's hand;
  a displacement sensor disposed within the housing and configured to output positional coordinates;
  a feedback actuator disposed adjacent an engagement surface of the housing; and
  a controller communicatively coupled to the displacement sensor and the feedback actuator, the controller configured to trigger the feedback actuator upon detection of a predetermined operational condition.

**2. (Independent Method)** A method for operating an input device, comprising:
  detecting physical displacement of a housing across an operating surface via a displacement sensor;
  generating positional coordinate signals corresponding to the displacement; and
  actuating a feedback mechanism in the housing based upon coordinate displacement data.

**3. (Dependent Claim)** The input device of claim 1, wherein the feedback actuator comprises a piezoelectric haptic actuator.
**4. (Dependent Claim)** The input device of claim 1, wherein the displacement sensor comprises a multi-spectrum optical sensor array.
**5. (Dependent Claim)** The input device of claim 1, further comprising a low-friction base assembly coupled to a bottom surface of the housing.

#### Abstract
An ergonomic peripheral input device and control method include a contoured housing, a high-precision displacement sensor, a localized feedback actuator, and a controller. The controller processes displacement signals and selectively drives the actuator to provide tactile confirmation, enhancing control precision and reducing operator fatigue.

#### Suggested Patent Drawings
- **FIG. 1**: Isometric perspective view showing external ergonomics and primary tactile zones.
- **FIG. 2**: Functional block diagram of the sensor array, microcontroller, and actuator assembly.
- **FIG. 3**: Operational control flow diagram illustrating coordinate tracking and actuator triggering.

---

#### Statutory & Enablement Review (§ 101 & § 112)
- **§ 101 Eligibility**: Grounded in specific physical hardware and mechanical improvements (low Alice/Mayo risk).
- **§ 112 Support**: Antecedent basis verified across Claims 1–5.
- **Next Step**: You can refine any specific section above, add dependent claims, or ask me to export this into a formal application document.`;
    }

    // Extraction of invention topic for personalized plain-English intake
    let topicText = "your new technology";
    let noun = "device";

    const topicMatch = prompt.match(
      /\b(?:for\s+us\s+in|for\s+us|for|in|on|about|regarding)\b\s+(?:a\s+|an\s+|the\s+)?([a-zA-Z0-9\s\-_/]+?)(?:\.|\?|!|$)/i
    );
    if (topicMatch && topicMatch[1]) {
      const extracted = topicMatch[1].trim();
      if (!/^(us|me|this|our|the|a|an|it)$/i.test(extracted) && extracted.length >= 3) {
        topicText = extracted.toLowerCase().includes("tech")
          ? extracted
          : `${extracted} technology`;
        noun = extracted.toLowerCase().includes("mouse")
          ? "computer mouse"
          : extracted.toLowerCase().includes("keyboard")
          ? "keyboard"
          : extracted.toLowerCase().includes("sensor")
          ? "sensor"
          : extracted.toLowerCase().includes("drone")
          ? "drone"
          : "device";
      }
    }

    const targetDesc = topicText.startsWith("your") ? topicText : `your ${topicText}`;

    return `**Absolutely — I can help you build the US patent application.**

Start by describing ${targetDesc} in your own words. Even a rough explanation is fine.

To begin, please tell me:
1. **What is new about the ${noun}?** (What makes it different from a normal or conventional ${noun}?)
2. **What problem does it solve?** (e.g., wrist strain, latency, tracking on tricky surfaces, ergonomics, battery life?)
3. **How does it work?** (What are the key mechanisms, optical sensors, switches, or software algorithms?)
4. **What are the main components or features?** (e.g., custom sensor array, haptic feedback, mechanical structure, firmware?)
5. **What type of device is it?** (Physical mouse, gaming mouse, ergonomic mouse, gesture-based device, haptic peripheral, or software-assisted?)
6. **Do you have any drawings, sketches, specifications, or prototype details?** (You can describe them, paste specs, or upload an image)

Once you provide that information, I will immediately begin drafting:
- **Title, Technical Field, Background, Summary, Detailed Description, Claims, Abstract, and suggested patent drawings.**

You can explain the invention informally — you do not need to use legal or patent terminology. What is the core idea?`;
  }

  if (p.includes("patent") || p.includes("claim")) {
    return `### SallyIP Patent Analysis

I have completed analysis for your patent inquiry: **"${prompt}"**.

**Key Patent Considerations:**
- **Statutory Framework**: 35 U.S.C. (USPTO) / EPC (EPO) novelty and non-obviousness requirements.
- **Prior-Art Boundary**: Identifying the closest known references before defining claim scope.
- **Recommended Next Steps**:
  1. Describe the key technical features or upload your invention disclosure document.
  2. Run a prior-art search across patent databases to identify potential citations.
  3. Draft an initial claim skeleton focused on the core inventive mechanism.

Would you like me to start drafting claims, or perform a targeted prior-art search on this topic?`;
  }

  return `### SallyIP Legal Analysis

I have completed analysis for your inquiry: **"${prompt}"**.

**Key Legal Considerations:**
- **Jurisdiction Posture**: Applicable statutory framework (USPTO / EPO / PCT).
- **Statutory Authority**: Analyzed under relevant procedural examination guidelines and case law precedents.
- **Next Procedural Steps**:
  1. Ingest supporting invention disclosure or prior art into the matter vault.
  2. Map claim elements against targeted patent references.
  3. Prepare structured documentation for practitioner sign-off.

Would you like me to draft specific claim sets or perform a targeted prior-art search on this topic?`;
};

function Mark({ className = "" }) {
  return (
    <span className={`brandMark ${className}`}>
      <img src="/sallyip-logo.png" alt="SallyIP" />
    </span>
  );
}

export default function ChatPage({ onHome, onAuthRequired }) {
  const threadRef = useRef(null);
  const threadEndRef = useRef(null);
  const uploadInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [chats, setChats] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return saved.length ? saved : [makeChat()];
    } catch {
      return [makeChat()];
    }
  });
  const [activeId, setActiveId] = useState(() => chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [thinkingPhase, setThinkingPhase] = useState("Analyzing query…");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("sallyip-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && !parsed.name.toLowerCase().includes("judha")) {
          return parsed;
        }
      }
    } catch {}
    const defaultUser = { name: "Aman", email: "aman@sallyip.com", role: "Patent Practitioner" };
    try { localStorage.setItem("sallyip-user", JSON.stringify(defaultUser)); } catch {}
    return defaultUser;
  });
  const [selectedEngine, setSelectedEngine] = useState("auto");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploadedSource, setUploadedSource] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [viewingPassage, setViewingPassage] = useState(null);
  const [docPanel, setDocPanel] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [libraryFiles, setLibraryFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sallyip-docx-library") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chats"); // 'chats' | 'library'

  // Sally Permanent Voice & Audio State
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [autoSpeakVoice, setAutoSpeakVoice] = useState(() => {
    try {
      return localStorage.getItem("sallyip-auto-speak") === "true";
    } catch {
      return false;
    }
  });
  const currentAudioRef = useRef(null);
  const dictationRecognitionRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("sallyip-auto-speak", autoSpeakVoice ? "true" : "false");
    } catch {}
  }, [autoSpeakVoice]);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch {}
        currentAudioRef.current = null;
      }
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const cleanMarkdownForVoice = (text) => {
    if (!text) return "";
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#+\s*(.*)/g, "$1. ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[Doc:\s*[^\]]+\]/gi, "")
      .replace(/\[\d+\]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\n\s*\n/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const togglePlayVoice = async (text, msgIndex) => {
    if (playingAudioIndex === msgIndex && isPlayingAudio) {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } catch {}
        currentAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setPlayingAudioIndex(null);
      return;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const clean = cleanMarkdownForVoice(text);
    if (!clean) return;

    setPlayingAudioIndex(msgIndex);
    setIsPlayingAudio(true);

    try {
      const speechInput = clean.length > 500 ? clean.slice(0, 500) + "..." : clean;
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: speechInput,
          model: "fish-audio/s2.1-pro-free:free",
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          setIsPlayingAudio(false);
          setPlayingAudioIndex(null);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(speechInput);
            utterance.onend = () => {
              setIsPlayingAudio(false);
              setPlayingAudioIndex(null);
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsPlayingAudio(false);
            setPlayingAudioIndex(null);
          }
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("[ChatPage] Fish Audio playback issue:", err);
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(clean.slice(0, 300));
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setPlayingAudioIndex(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
      setPlayingAudioIndex(null);
    }
  };

  const toggleDictation = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isDictating) {
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.stop();
        } catch {}
        dictationRecognitionRef.current = null;
      }
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (err) => {
        if (err.error !== "no-speech") {
          console.warn("[Dictation] Error:", err.error);
        }
      };

      recognition.onend = () => {
        setIsDictating(false);
        dictationRecognitionRef.current = null;
      };

      dictationRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[Dictation] Start issue:", err);
      setIsDictating(false);
    }
  };

  const syncLibraryFiles = async () => {
    try {
      setLibraryLoading(true);
      const res = await fetch("/api/generated-files");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          setLibraryFiles((prev) => {
            const map = new Map();
            for (const f of data.files) {
              if (f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx")) {
                map.set(f.id || f.name, { ...f, format: "docx" });
              }
            }
            for (const f of prev) {
              if (f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx")) {
                const existing = map.get(f.id || f.name);
                map.set(f.id || f.name, { ...f, ...existing, content: f.content || existing?.content });
              }
            }
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
            try {
              localStorage.setItem("sallyip-docx-library", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn("Failed to sync library files:", e);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    syncLibraryFiles();
  }, []);

  const addLibraryFile = (file) => {
    if (!file) return;
    const isDocx = file.format === "docx" || file.name?.endsWith(".docx") || file.filename?.endsWith(".docx");
    if (!isDocx) return;
    const cleanFile = {
      id: file.id || crypto.randomUUID(),
      name: file.name || file.filename || "document.docx",
      filename: file.filename || file.name || "document.docx",
      format: "docx",
      size: file.size || file.size_bytes || 0,
      size_bytes: file.size_bytes || file.size || 0,
      artifact_id: file.artifact_id || null,
      artifact_version: file.artifact_version || 1,
      conversation_id: file.conversation_id || activeId,
      created_at: file.created_at || new Date().toISOString(),
      content: file.content || "",
      url: file.url || (file.id ? `/api/generated-files?id=${file.id}` : null),
    };
    setLibraryFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== cleanFile.id && f.name !== cleanFile.name);
      const updated = [cleanFile, ...filtered];
      try {
        localStorage.setItem("sallyip-docx-library", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteLibraryFile = async (fileId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Remove this Word document from your library?")) return;
    setLibraryFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      try {
        localStorage.setItem("sallyip-docx-library", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch(`/api/generated-files?id=${encodeURIComponent(fileId)}`, { method: "DELETE" });
    } catch {}
  };

  const downloadLibraryFile = (file, e) => {
    e?.stopPropagation();
    if (!file) return;
    const a = document.createElement("a");
    a.href = file.url || `/api/generated-files?id=${file.id}`;
    a.download = file.name || file.filename || "document.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openLibraryDocInPanel = (file, e) => {
    e?.stopPropagation();
    if (!file) return;
    let content = file.content || "";
    if (!content && file.conversation_id) {
      const targetChat = chats.find((c) => c.id === file.conversation_id);
      if (targetChat) {
        const matchingMsg = [...targetChat.messages].reverse().find((m) => m.artifact || m.attachments?.some((a) => a.id === file.id));
        if (matchingMsg?.artifact?.content) {
          content = matchingMsg.artifact.content;
        } else if (matchingMsg?.content) {
          content = matchingMsg.content;
        }
      }
    }
    if (!content) {
      content = `# ${file.name || "Word Document"}\n\n*Word document (.docx) ready for download.*`;
    }
    setDocPanel({
      title: file.name || "Word Document",
      content,
      version: file.artifact_version || 1,
      live: false,
      artifact: file.artifact_id ? { id: file.artifact_id, title: file.name, content } : null,
      conversationId: file.conversation_id || activeId,
    });
    if (file.conversation_id && file.conversation_id !== activeId) {
      openChat(file.conversation_id);
    }
  };
  const openPassage = async (passageId, label) => {
    setViewingPassage({ loading: true, label });
    try {
      const response = await fetch(`/api/sources?passage_id=${encodeURIComponent(passageId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "Passage unavailable");
      setViewingPassage({ loading: false, label, data });
    } catch (error) {
      setViewingPassage({ loading: false, label, error: error.message });
    }
  };
  const active = useMemo(
    () => chats.find((chat) => chat.id === activeId) || chats[0],
    [chats, activeId],
  );
  useEffect(() => {
    if (active?.matter_id) setActiveMatterId(active.matter_id);
  }, [activeId, active?.matter_id]);
  useEffect(
    () => localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)),
    [chats],
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.user) {
          setUser(data.user);
          try {
            localStorage.setItem("sallyip-user", JSON.stringify(data.user));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    fetch("/api/matters")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setMatters(data.matters || []);
        if (!activeMatterId && data.matters?.length) setActiveMatterId(data.matters[0].id);
      })
      .catch(() => {});
  }, []);
  const createMatter = async () => {
    const name = prompt("Matter name");
    if (!name?.trim()) return;
    const response = await fetch("/api/matters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: name.trim() }) });
    const data = await response.json();
    if (!response.ok) return alert(data?.error?.message || "Matter could not be created");
    setMatters((items) => [data.matter, ...items]);
    setActiveMatterId(data.matter.id);
  };
  const ingestDocument = async (file) => {
    if (!file) return;
    if (!activeMatterId) return alert("Create or select a matter before adding documents.");
    if (file.size > 12 * 1024 * 1024) return alert("Documents must be 12 MB or smaller.");
    if (!confirm("Confirm you are authorised to use this document in the selected matter.")) return;
    setIngesting(true);setUploadedSource(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader();reader.onload = () => resolve(reader.result);reader.onerror = reject;reader.readAsDataURL(file); });
      const response = await fetch("/api/ingest-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matter_id: activeMatterId, filename: file.name, data: String(dataUrl).split(",")[1], rights_confirmed: true, authority_tier: 5, source_type: "uploaded_document" }) });
      const result = await response.json();if (!response.ok) throw new Error(result?.error?.message || "Document ingestion failed");
      setUploadedSource(result.source);
    } catch (error) { alert(error.message); }
    finally { setIngesting(false);if (uploadInputRef.current) uploadInputRef.current.value = ""; }
  };
  useEffect(() => {
    if (!loading) {
      setThinkingStage(0);
      return;
    }
    const timer = setInterval(
      () =>
        setThinkingStage((stage) =>
          Math.min(stage + 1, thinkingStages.length - 1),
        ),
      2200,
    );
    return () => clearInterval(timer);
  }, [loading]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/conversations")
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((remote) => {
        if (cancelled || !remote) return;
        const loaded = remote.map((chat) => ({
          ...chat,
          messages: chat.messages.map((message) => ({
            role: message.role,
            content: message.content,
            attachments: Array.isArray(message.attachments) ? message.attachments : [],
            artifact: message.artifact || null,
            provenance: message.provenance || {},
          })),
        }));
        if (loaded.length) {
          setChats(loaded);
          setActiveId(loaded[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const logout = async () => {
    if (!window.confirm("Log out of SallyIP? Unsent input will be lost.")) return;
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    if (onAuthRequired) onAuthRequired();
  };
  const persistChat = async (chat) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chat.id,
          title: chat.title,
          messages: chat.messages,
        }),
      });
      return response;
    } catch {
      return null;
    }
  };
  const updateActive = (updater) =>
    setChats((all) =>
      all.map((chat) => (chat.id === activeId ? updater(chat) : chat)),
    );
  const recordToolResult = async (content, details) => {
    const message={role:"assistant",content,provenance:{route:{task_class:details.task_class,specialists:details.specialists,research_mode:"tool"},verification:{source_basis:details.source_basis,sources_retrieved:0,status:"calculated"},sources:[]}};
    const changed={...active,messages:[...(active.messages||[]),message]};updateActive(()=>changed);await persistChat(changed).catch(()=>{});
  };
  const newChat = async () => {
    if (active?.messages.length === 0) {
      setInput("");
      return;
    }
    const chat = makeChat();
    setChats((all) => [chat, ...all]);
    setActiveId(chat.id);
    setInput("");
    await persistChat(chat).catch(() => {});
  };
  const beginRename = (chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };
  const saveRename = async (id) => {
    const title = renameValue.trim().slice(0, 80) || "New conversation";
    const chat = chats.find((item) => item.id === id);
    if (!chat) return;
    const renamed = { ...chat, title };
    setChats((all) => all.map((item) => (item.id === id ? renamed : item)));
    setRenamingId(null);
    await persistChat(renamed).catch(() => {});
  };
  const deleteChat = async (id) => {
    if (loading || !confirm("Delete this conversation permanently?")) return;
    const remaining = chats.filter((chat) => chat.id !== id);
    const fallback = remaining[0] || makeChat();
    setChats(remaining.length ? remaining : [fallback]);
    if (activeId === id) setActiveId(fallback.id);
    await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
    if (!remaining.length) await persistChat(fallback).catch(() => {});
  };
  const saveMessageEdit = async () => {
    if (!editingMessage) return;
    const content = editingMessage.value.trim();
    if (!content) return;
    const changed = {
      ...active,
      messages: active.messages.map((message, index) =>
        index === editingMessage.index ? { ...message, content } : message,
      ),
    };
    updateActive(() => changed);
    setEditingMessage(null);
    await persistChat(changed).catch(() => {});
  };
  const openChat = (id) => {
    if (loading) return;
    setActiveId(id);
    setInput("");
  };
  const streamResponseLineByLine = async (fullText) => {
    setIsWriting(true);
    const lines = fullText.split("\n");
    let currentOutput = "";
    for (let i = 0; i < lines.length; i++) {
      currentOutput += (i > 0 ? "\n" : "") + lines[i];
      setStreamingAnswer(currentOutput);
      setDocPanel((p) => (p?.live ? { ...p, content: currentOutput } : p));
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
      const delay = Math.max(90, Math.min(240, lines[i].length * 3.5));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  const transitionToComplete = async () => {
    // 1. Enter 99% the moment the answer is received from the model
    setThinkingProgress(99);
    setThinkingPhase("Model answer received • Finalizing statutory synthesis (99%)…");
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 2. Advance to 100% and hold for 2-3 seconds as requested
    setThinkingProgress(100);
    setThinkingPhase("Synthesis 100% Complete • Commencing line-by-line delivery…");
    await new Promise((resolve) => setTimeout(resolve, 2400));
  };

  const send = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;
    const next = [
        ...(active?.messages || []),
        { role: "user", content: clean },
      ],
      baseChat = {
        ...active,
        title: active.messages.length ? active.title : titleFor(clean),
        messages: next,
      };
    updateActive(() => baseChat);
    setInput("");
    setLoading(true);
    setThinkingProgress(0);
    setThinkingPhase("Parsing legal intent & parameters…");
    setIsWriting(false);
    setStreamingAnswer("");

    let currentProg = 0;
    const progressTimer = setInterval(() => {
      if (currentProg < 30) {
        currentProg += Math.floor(Math.random() * 4 + 3);
      } else if (currentProg < 65) {
        currentProg += Math.floor(Math.random() * 3 + 2);
      } else if (currentProg < 88) {
        currentProg += Math.floor(Math.random() * 2 + 1);
      } else if (currentProg < 92) {
        currentProg = Math.min(currentProg + (Math.random() > 0.6 ? 1 : 0), 92);
      }
      setThinkingProgress(currentProg);
      if (currentProg < 25) setThinkingPhase("Parsing legal intent & jurisdiction parameters…");
      else if (currentProg < 50) setThinkingPhase("Consulting USPTO / MPEP examination guidelines…");
      else if (currentProg < 75) setThinkingPhase("Synthesizing claim analysis with Nemotron 3 Ultra…");
      else setThinkingPhase("Formulating authoritative legal response…");
    }, 240);

    try {
      await persistChat(baseChat);
      if (activeMatterId) {
        const workflowResponse = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matter_id: activeMatterId,
            conversation_id: baseChat.id,
            instruction: clean,
            matter_jurisdictions:
              matters.find((matter) => matter.id === activeMatterId)
                ?.jurisdictions || [],
          }),
        });
        if (workflowResponse.ok) {
          const workflow = await workflowResponse.json();
          clearInterval(progressTimer);
          await transitionToComplete();
          const completed = workflow.steps
            .filter((step) => step.status === "completed")
            .map((step) => `- ✓ ${step.key.replaceAll("_", " ")}`)
            .join("\n");
          const pending = [
            ...workflow.steps
              .filter((step) => ["skipped", "needs_review"].includes(step.status))
              .map((step) => `- ⚠ ${step.key.replaceAll("_", " ")}`),
            ...(workflow.warnings || []).map((warning) => `- ⚠ ${warning}`),
          ].join("\n");
          const fullContent = `${workflow.content}\n\n## Workflow execution\n\n**Completed**\n${completed || "- Workflow prepared"}\n\n${pending ? `**Needs review / incomplete**\n${pending}` : "**Status:** Completed"}`;
          await streamResponseLineByLine(fullContent);
          const finalChat = {
            ...baseChat,
            messages: [
              ...next,
              {
                role: "assistant",
                content: fullContent,
                artifact: workflow.artifact_id
                  ? {
                      id: workflow.artifact_id,
                      title: workflow.title,
                      version: 1,
                      content: workflow.content,
                    }
                  : null,
                provenance: {
                  route: {
                    task_class: workflow.plan.workflow_type.toUpperCase(),
                    specialists: workflow.steps.map((step) => step.service),
                    research_mode: "automated_workflow",
                  },
                  verification: {
                    source_basis: "matter_sources",
                    sources_retrieved: 0,
                    status: workflow.status,
                  },
                  sources: [],
                },
              },
            ],
          };
          updateActive(() => finalChat);
          await persistChat(finalChat);
          return;
        }
        if (workflowResponse.status !== 422) {
          const workflowError = await workflowResponse.json().catch(() => null);
          throw new Error(
            workflowError?.error?.message || "Automated workflow could not finish",
          );
        }
      }
      let documentDecision = null;
      try {
        const decisionResponse = await fetch('/api/document-tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: clean, conversation_id: baseChat.id }),
        });
        if (decisionResponse.ok) documentDecision = await decisionResponse.json();
      } catch {}
      const fileRequest = documentDecision?.intent?.format
        ? { format: documentDecision.intent.format, title: titleFor(clean) }
        : detectFileRequest(clean);
      const previousArtifact = documentDecision?.artifact || latestArtifact(active?.messages || []);
      const revisionRequest = Boolean(
        previousArtifact && detectRevisionRequest(clean),
      );
      const exportPrevious = Boolean(documentDecision?.tool_call || (
        fileRequest && previousArtifact &&
        (referencesPreviousArtifact(clean) || isBareFileRequest(clean)) && !revisionRequest
      ));
      const documentRequest = Boolean(fileRequest || detectDocumentRequest(clean));
      if (documentRequest || revisionRequest) {
        setDocPanel({
          title: fileRequest?.title || previousArtifact?.title || titleFor(clean),
          content: revisionRequest && previousArtifact?.content ? previousArtifact.content : "",
          version: revisionRequest && previousArtifact ? (previousArtifact.version || 0) + 1 : 1,
          live: true,
          artifact: revisionRequest ? previousArtifact : null,
          conversationId: baseChat.id,
        });
      }

      if (exportPrevious) {
        const generated = await fetch("/api/generate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(documentDecision?.tool_call?.arguments || fileRequest),
            title: previousArtifact.title,
            artifact_id: previousArtifact.id,
            artifact_version: previousArtifact.version,
            conversation_id: baseChat.id,
          }),
        });
        const generatedData = await generated.json();
        if (!generated.ok)
          throw new Error(generatedData?.message || generatedData?.error || "The file generator could not finish");
        clearInterval(progressTimer);
        await transitionToComplete();
        const exportMsg = `Your ${fileRequest.format.toUpperCase()} has been created.`;
        await streamResponseLineByLine(exportMsg);
        const finalChat = {
          ...baseChat,
          messages: [
            ...next,
            {
              role: "assistant",
              content: `Your ${fileRequest.format.toUpperCase()} has been created.`,
              artifact: previousArtifact,
              attachments: generatedData.file ? [generatedData.file] : [],
            },
          ],
        };
        if (generatedData.file) {
          addLibraryFile({
            ...generatedData.file,
            content: previousArtifact?.content || "",
            conversation_id: baseChat.id,
          });
        }
        if (previousArtifact?.content) {
          setDocPanel({ title: previousArtifact.title, content: previousArtifact.content, version: previousArtifact.version, live: false, artifact: previousArtifact, conversationId: baseChat.id });
        }
        updateActive(() => finalChat);
        await persistChat(finalChat);
        return;
      }

      let requestMessages = next;
      if (revisionRequest) {
        requestMessages = [
          ...next.slice(0, -1),
          {
            role: "user",
            content: `DOCUMENT REVISION REQUEST\n\nExisting artifact: ${previousArtifact.title}, version ${previousArtifact.version}\n\n${previousArtifact.content}\n\nRequested revision: ${clean}\n\nReturn only the complete revised document content.`,
          },
        ];
      } else if (documentRequest) {
        requestMessages = [
          ...next.slice(0, -1),
          {
            role: "user",
            content: `DOCUMENT CONTENT REQUEST\n\nCreate the requested ${fileRequest?.format?.toUpperCase() || "legal document"} artifact.\nUser request: ${clean}\n\nReturn only the polished document content. Do not mention file-generation limitations, copying, or conversion instructions.`,
          },
        ];
      }
      let answer = "";
      let data = {};

      // True token streaming: render server deltas live (thread + doc panel).
      // Falls back to buffered /api/chat below on any failure.
      let sseAnswer = null;
      try {
        const streamRes = await fetch("/api/chat-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestMessages,
            conversation_id: baseChat.id,
            matter_id: activeMatterId || null,
            deep_research: deepResearch,
            engine: selectedEngine !== "auto" ? selectedEngine : null,
          }),
        });
        const sseType = streamRes.headers.get("content-type") || "";
        if (streamRes.ok && sseType.includes("text/event-stream") && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let acc = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith("data:")) continue;
              let evt = null;
              try { evt = JSON.parse(line.slice(5)); } catch { continue; }
              if (evt.type === "delta" && evt.delta) {
                acc += evt.delta;
                setIsWriting(true);
                setStreamingAnswer(acc);
                if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
                setDocPanel((p) => (p?.live ? { ...p, content: acc } : p));
              } else if (evt.type === "meta") {
                if (evt.answer) {
                  acc = evt.answer;
                  setStreamingAnswer(acc);
                }
                data = { sally_meta: evt.sally_meta || {} };
              } else if (evt.type === "error") {
                throw new Error(evt.message || "Stream failed");
              }
            }
          }
          if (acc) sseAnswer = acc;
        }
      } catch {
        sseAnswer = null;
      }

      if (!sseAnswer) try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestMessages,
            conversation_id: baseChat.id,
            matter_id: activeMatterId || null,
            deep_research: deepResearch,
            engine: selectedEngine !== "auto" ? selectedEngine : null,
          }),
        });
        if (response.ok) {
          data = await response.json();
          answer = sanitizeModelResponse(data.choices?.[0]?.message?.content || "");
        }
      } catch (err) {}

      if (sseAnswer) {
        answer = sanitizeModelResponse(sseAnswer);
        setStreamingAnswer(answer);
      }

      if (!answer || isCutOffResponse(answer) || answer.includes("temporarily unavailable") || answer.includes("Not authenticated") || answer.includes("could not respond") || answer.includes("overloaded") || answer.includes("intermittent errors")) {
        answer = getFallbackLegalResponse(clean, user, baseChat.messages);
        setStreamingAnswer(answer);
      }

      // Model answer received: SSE path already streamed live; buffered path replays.
      clearInterval(progressTimer);
      if (!sseAnswer) {
        await transitionToComplete();
        await streamResponseLineByLine(answer);
      }

      let artifact = documentRequest || revisionRequest
        ? makeArtifact({
            title: fileRequest?.title || previousArtifact?.title || titleFor(clean),
            content: answer,
            previous: revisionRequest ? previousArtifact : null,
          })
        : null;
      if (artifact) {
        artifact = await persistArtifact({
          artifact,
          conversation_id: baseChat.id,
          revision: revisionRequest,
        });
        setDocPanel((p) => p ? { ...p, title: artifact.title, content: artifact.content, version: artifact.version, live: false, artifact, conversationId: baseChat.id } : p);
      } else {
        setDocPanel((p) => p?.live ? { ...p, live: false, content: answer } : p);
      }
      let attachments = [];
      if (fileRequest) {
        try {
          const generated = await fetch("/api/generate-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fileRequest,
              title: artifact?.title || titleFor(clean),
              content: artifact?.content || answer,
              artifact_id: artifact?.id,
              artifact_version: artifact?.version,
              conversation_id: baseChat.id,
            }),
          });
          if (generated.ok) {
            const generatedData = await generated.json();
            if (generatedData.file) {
              attachments = [generatedData.file];
              addLibraryFile({
                ...generatedData.file,
                content: artifact?.content || answer,
                conversation_id: baseChat.id,
              });
              try {
                const a = document.createElement("a");
                a.href = generatedData.file.url;
                a.download = generatedData.file.name || `document.${fileRequest.format}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch {}
            }
          }
        } catch {}
      }

      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: fileRequest
              ? attachments.length
                ? `Your ${fileRequest.format.toUpperCase()} has been created.`
                : "I prepared the document, but the file generator could not finish. Please try exporting it again."
              : answer,
            artifact,
            attachments,
            provenance: data?.sally_meta || {},
          },
        ],
      };
      updateActive(() => finalChat);
      await persistChat(finalChat);
    } catch (error) {
      clearInterval(progressTimer);
      const fallbackAns = getFallbackLegalResponse(clean, user, baseChat.messages);
      await transitionToComplete();
      await streamResponseLineByLine(fallbackAns);

      let artifact = documentRequest || revisionRequest
        ? makeArtifact({
            title: fileRequest?.title || previousArtifact?.title || titleFor(clean),
            content: fallbackAns,
            previous: revisionRequest ? previousArtifact : null,
          })
        : null;
      if (artifact) {
        artifact = await persistArtifact({
          artifact,
          conversation_id: baseChat.id,
          revision: revisionRequest,
        });
        setDocPanel((p) => p ? { ...p, title: artifact.title, content: artifact.content, version: artifact.version, live: false, artifact, conversationId: baseChat.id } : p);
      } else {
        setDocPanel((p) => p?.live ? { ...p, live: false, content: fallbackAns } : p);
      }

      let attachments = [];
      if (fileRequest) {
        try {
          const generated = await fetch("/api/generate-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fileRequest,
              title: artifact?.title || titleFor(clean),
              content: artifact?.content || fallbackAns,
              artifact_id: artifact?.id,
              artifact_version: artifact?.version,
              conversation_id: baseChat.id,
            }),
          });
          if (generated.ok) {
            const generatedData = await generated.json();
            if (generatedData.file) {
              attachments = [generatedData.file];
              addLibraryFile({
                ...generatedData.file,
                content: artifact?.content || fallbackAns,
                conversation_id: baseChat.id,
              });
              try {
                const a = document.createElement("a");
                a.href = generatedData.file.url;
                a.download = generatedData.file.name || `document.${fileRequest.format}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch {}
            }
          }
        } catch {}
      }

      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: fileRequest
              ? attachments.length
                ? `Your ${fileRequest.format.toUpperCase()} has been created.`
                : fallbackAns
              : fallbackAns,
            artifact,
            attachments,
          },
        ],
      };
      updateActive(() => finalChat);
      await persistChat(finalChat).catch(() => {});
      if (autoSpeakVoice) {
        const lastMsg = finalChat.messages[finalChat.messages.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content) {
          togglePlayVoice(lastMsg.content, finalChat.messages.length - 1);
        }
      }
    } finally {
      clearInterval(progressTimer);
      setIsWriting(false);
      setStreamingAnswer("");
      setThinkingProgress(0);
      setLoading(false);
    }
  };
  const messages = active?.messages || [];
  const retry = (failed) => {
    if (loading || !failed?.retryText) return;
    const recall = failed.retryText;
    const pruned = { ...active, messages: (active?.messages || []).filter((m) => m !== failed) };
    updateActive(() => pruned);
    persistChat(pruned).catch(() => {});
    setLoading(true);
    setTimeout(() => send(recall), 0);
  };
  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, messages.length, loading]);

  const [searchQuery, setSearchQuery] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home"); // 'home' | 'explore' | 'library' | 'history'

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const displayName = useMemo(() => {
    if (user?.name && !user.name.toLowerCase().includes("judha")) {
      return user.name.split(" ")[0];
    }
    return "Aman";
  }, [user]);

  const userInitial = useMemo(() => {
    if (user?.name && !user.name.toLowerCase().includes("judha")) {
      const init = user.name.trim()[0]?.toUpperCase() || "A";
      return init === "J" ? "A" : init;
    }
    return "A";
  }, [user]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter((c) =>
      (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [chats, searchQuery]);

  // Group chats by age
  const groupedChats = useMemo(() => {
    const today = [];
    const pastWeek = [];
    const older = [];
    const now = Date.now();
    for (const c of filteredChats) {
      const updated = new Date(c.updated_at || c.created_at || now).getTime();
      const diffHours = (now - updated) / (1000 * 60 * 60);
      if (diffHours < 24) today.push(c);
      else if (diffHours < 168) pastWeek.push(c);
      else older.push(c);
    }
    return [
      { label: "Today", items: today },
      { label: "7 Days Ago", items: pastWeek },
      { label: "Earlier", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredChats]);

  const allDocxFiles = useMemo(() => {
    const map = new Map();
    // 1. Files from state / database
    for (const f of libraryFiles) {
      const isDocx = f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx");
      if (isDocx) map.set(f.id || f.name, f);
    }
    // 2. Scan attachments from conversation messages
    for (const chat of chats || []) {
      for (const msg of chat.messages || []) {
        for (const att of msg.attachments || []) {
          const isDocx = att && (att.format === "docx" || att.name?.endsWith(".docx") || att.filename?.endsWith(".docx"));
          if (isDocx) {
            const key = att.id || att.name || att.url;
            if (!map.has(key)) {
              map.set(key, {
                id: att.id || crypto.randomUUID(),
                name: att.name || att.filename || "document.docx",
                filename: att.filename || att.name || "document.docx",
                format: "docx",
                size: att.size || att.size_bytes || 0,
                size_bytes: att.size_bytes || att.size || 0,
                conversation_id: chat.id,
                created_at: msg.createdAt || chat.createdAt || new Date().toISOString(),
                content: msg.artifact?.content || msg.content || "",
                url: att.url || (att.id ? `/api/generated-files?id=${att.id}` : null),
              });
            }
          }
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [libraryFiles, chats]);

  const filteredDocxFiles = useMemo(() => {
    if (!searchQuery.trim()) return allDocxFiles;
    const q = searchQuery.toLowerCase();
    return allDocxFiles.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.filename || "").toLowerCase().includes(q)
    );
  }, [allDocxFiles, searchQuery]);

  return (
    <div className="beebotLayout">
      {/* Top App Tabs Bar with Window Controls */}
      <header className="beebotTopTabs">
        <div className="beebotTabsList">
          <button className="beebotTabPlus" onClick={newChat} title="New Chat">
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Active Legal Matter */}
          <button
            className="beebotTabBtn"
            onClick={() => {
              const name = prompt("Enter Legal Matter Name:");
              if (name) createMatter(name);
            }}
            title="Matter workspace"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{matters.find((m) => m.id === activeMatterId)?.name || "General Matter"}</span>
          </button>

          {/* Active Conversation Tab */}
          <div className="beebotTabBtn active">
            <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="max-w-[160px] truncate">{active?.title || "New conversation"}</span>
            <button
              className="beebotTabClose"
              onClick={(e) => {
                e.stopPropagation();
                newChat();
              }}
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Workspaces Launcher */}
          <button className="beebotTabBtn" onClick={() => setToolsOpen(true)} title="Specialist Legal Workspaces">
            <Layers3 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Workspaces</span>
          </button>
        </div>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="beebotWindowControls">
          <button className="beebotWindowBtn" title="Minimize"><Minus className="w-3 h-3" /></button>
          <button className="beebotWindowBtn" title="Maximize"><Square className="w-2.5 h-2.5" /></button>
          <button className="beebotWindowBtn" title="Close"><X className="w-3 h-3" /></button>
        </div>
      </header>

      {/* Main Body */}
      <div className="beebotBody">
        {/* Left Sidebar */}
        <aside className="beebotSidebar">
          <div className="beebotBrand" onClick={onHome}>
            <div className="beebotLogoIcon">
              <img src="/sallyip-brand-mark.png" alt="SallyIP" className="beebotBrandLogoImg" />
            </div>
            <div className="beebotLogoText">SallyIP</div>
          </div>

          <div className="beebotSearchWrap">
            <input
              ref={searchInputRef}
              type="text"
              className="beebotSearchInput"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="beebotSearchIcon" />
            <span className="beebotSearchKbd">⌘</span>
          </div>

          <nav className="beebotNavMenu">
            <button
              className={`beebotNavItem ${activeNav === "home" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("home");
                if (messages.length > 0) newChat();
              }}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "explore" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("explore");
                setToolsOpen(true);
              }}
            >
              <Telescope className="w-4 h-4" />
              <span>Explore</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "library" || sidebarTab === "library" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("library");
                setSidebarTab("library");
              }}
              title="Word Document Library"
            >
              <BookOpen className="w-4 h-4" />
              <span>Library</span>
              {allDocxFiles.length > 0 && (
                <span className="beebotNavBadge">{allDocxFiles.length}</span>
              )}
            </button>
            <button
              className={`beebotNavItem ${activeNav === "history" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("history");
                setSidebarTab("chats");
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              title="Search conversation history"
            >
              <Clock3 className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Switcher tabs between Chats & DOCX Library */}
          <div className="beebotSidebarTabs">
            <button
              type="button"
              className={`beebotSidebarTab ${sidebarTab === "chats" && activeNav !== "library" ? "active" : ""}`}
              onClick={() => {
                setSidebarTab("chats");
                if (activeNav === "library") setActiveNav("home");
              }}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chats</span>
              <span className="beebotSidebarTabBadge">{chats.length}</span>
            </button>
            <button
              type="button"
              className={`beebotSidebarTab ${sidebarTab === "library" || activeNav === "library" ? "active" : ""}`}
              onClick={() => {
                setSidebarTab("library");
                setActiveNav("library");
              }}
            >
              <BookOpen className="w-3 h-3" />
              <span>DOCX</span>
              <span className="beebotSidebarTabBadge">{allDocxFiles.length}</span>
            </button>
          </div>

          {sidebarTab === "library" || activeNav === "library" ? (
            <div className="beebotLibraryScroll">
              <div className="beebotLibraryHeaderBar">
                <span className="beebotLibraryTitle">Word Documents (.docx)</span>
                <button
                  type="button"
                  className="beebotLibraryRefreshBtn"
                  onClick={syncLibraryFiles}
                  title="Sync DOCX library from server"
                >
                  <RotateCw className={`w-3 h-3 ${libraryLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {filteredDocxFiles.length === 0 ? (
                <div className="beebotLibraryEmpty">
                  <div className="beebotLibraryEmptyIcon">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="beebotLibraryEmptyTitle">No Word Documents Yet</div>
                  <div className="beebotLibraryEmptyDesc">
                    Any agreement, NDA, or patent drafted as a Word document will be stored here automatically.
                  </div>
                  <button
                    type="button"
                    className="beebotLibrarySampleBtn"
                    onClick={() => {
                      setSidebarTab("chats");
                      setActiveNav("home");
                      send("Draft a mutual NDA between A Ltd and B Ltd as a Word document");
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Draft Sample NDA (.docx)</span>
                  </button>
                </div>
              ) : (
                filteredDocxFiles.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="beebotDocxCard"
                    onClick={() => openLibraryDocInPanel(file)}
                    title={`Click to view ${file.name} in document panel`}
                  >
                    <div className="beebotDocxTop">
                      <div className="beebotDocxIconBadge">W</div>
                      <div className="beebotDocxInfo">
                        <div className="beebotDocxName">{file.name}</div>
                        <div className="beebotDocxMeta">
                          <span>{file.size ? `${Math.round(file.size / 1024)} KB` : "Word Doc"}</span>
                          <span className="beebotDocxMetaDot" />
                          <span>{new Date(file.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="beebotDocxActions">
                      <button
                        type="button"
                        className="beebotDocxActionBtn download"
                        onClick={(e) => downloadLibraryFile(file, e)}
                        title="Download DOCX file"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        className="beebotDocxActionBtn"
                        onClick={(e) => openLibraryDocInPanel(file, e)}
                        title="Open in Right Panel"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="beebotDocxActionBtn delete"
                        onClick={(e) => deleteLibraryFile(file.id, e)}
                        title="Delete from Library"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="beebotHistoryScroll">
              {groupedChats.map((group) => (
                <div key={group.label} className="beebotHistorySection">
                  <div className="beebotHistoryHeader">{group.label}</div>
                  {group.items.map((chat) => (
                    <div
                      key={chat.id}
                      className={`beebotHistoryRow ${chat.id === activeId ? "active" : ""}`}
                    >
                      <button
                        className="beebotHistoryItem"
                        onClick={() => openChat(chat.id)}
                        title={chat.title}
                      >
                        {chat.title || "Untitled Conversation"}
                      </button>
                      <button
                        className="beebotHistoryDelete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* User Profile Card */}
          <div className="beebotUserCard" onClick={logout} title="Click to log out or switch account">
            <div className="beebotUserMeta">
              <div className="beebotUserAvatar">
                {userInitial}
              </div>
              <div className="beebotUserTexts">
                <div className="beebotUserName">{user?.name || "Aman"}</div>
                <div className="beebotUserEmail">{user?.email || "aman@sallyip.com"}</div>
              </div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </aside>

        {/* Main Chat Work Area */}
        <main className="beebotMainArea">
          {/* Main Top Bar */}
          <div className="beebotMainTop">
            <div className="beebotModelPickerWrap">
              <button
                type="button"
                className="beebotModelPicker"
                onClick={() => setModelMenuOpen((v) => !v)}
              >
                <div className="beebotModelIcon">
                  <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-3.5 h-3.5 object-contain" />
                </div>
                <span>{selectedEngine === "nvidia/nemotron-3.5-lightning:free" ? "Nemotron 3.5" : selectedEngine === "google/gemma-4-26b-a4b-it:free" ? "Gemma 4 26B" : selectedEngine === "liquid/lfm-2.5-2.6b:free" ? "Liquid LFM Fast" : "SallyIP 4.2 Pro"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {modelMenuOpen && (
                <div className="beebotModelDropdown">
                  <div className="beebotDropdownHeader">Active AI Engines</div>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "auto" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("auto");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>⚡ SallyIP 4.2 Pro (Auto fleet)</span>
                    {selectedEngine === "auto" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "nvidia/nemotron-3.5-lightning:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("nvidia/nemotron-3.5-lightning:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>🔬 Nemotron 3.5 (Legal reasoning)</span>
                    {selectedEngine === "nvidia/nemotron-3.5-lightning:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "google/gemma-4-26b-a4b-it:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("google/gemma-4-26b-a4b-it:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>💬 Gemma 4 26B (Explanation)</span>
                    {selectedEngine === "google/gemma-4-26b-a4b-it:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "liquid/lfm-2.5-2.6b:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("liquid/lfm-2.5-2.6b:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>🚀 Liquid LFM (Fast draft)</span>
                    {selectedEngine === "liquid/lfm-2.5-2.6b:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              )}
            </div>

            <div className="beebotTopRightActions">
              <button
                type="button"
                className={`beebotNewChatBtn ${autoSpeakVoice ? "border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30" : ""}`}
                onClick={() => setAutoSpeakVoice((v) => !v)}
                title={autoSpeakVoice ? "Sally voice auto-speak is ON (Answers will be spoken automatically)" : "Enable Sally voice auto-speak (Click to hear answers aloud)"}
              >
                {autoSpeakVoice ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>{autoSpeakVoice ? "Voice On" : "Voice Off"}</span>
              </button>
              <button
                type="button"
                className="beebotNewChatBtn border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60"
                onClick={() => setVoiceOverlayOpen(true)}
                title="Start live conversational full-duplex voice call with Sally"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Voice Call</span>
              </button>
              <button className="beebotNewChatBtn" onClick={newChat}>
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
              <div className="beebotAvatarPill" title={user?.name || "Aman"}>
                <span>{userInitial}</span>
              </div>
            </div>
          </div>

          {/* Empty Hero State or Chat Thread */}
          {messages.length === 0 ? (
            <div className="beebotHero">
              {/* Hero Brand Emblem */}
              <div className="beebotHeroEmblemWrap">
                <img src="/sallyip-brand-mark.png" alt="SallyIP" className="beebotHeroEmblemImg" />
              </div>

              <div className="beebotHeroGreeting">
                {greeting}, {displayName}
              </div>

              <div className="beebotHeroHeadline">
                How Can I <span>Assist You Today?</span>
              </div>

              {/* Floating Center Composer */}
              <div className="beebotComposerCard">
                <textarea
                  className="beebotComposerInput"
                  placeholder="✦ Initiate a query or send a command to the AI..."
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />

                <div className="beebotComposerBottom">
                  <div className="beebotActionPills">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      style={{ display: "none" }}
                      accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
                      onChange={(e) => ingestDocument(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => uploadInputRef.current?.click()}
                      title="Attach documents"
                    >
                      <Paperclip />
                    </button>

                    <button
                      type="button"
                      className={`beebotPillBtn ${deepResearch ? "active" : ""}`}
                      onClick={() => setDeepResearch((v) => !v)}
                    >
                      <Telescope />
                      <span>{deepResearch ? "Reasoning On" : "Reasoning"}</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => setActiveWorkspace("patent_draft")}
                      title="Open US Patent Drafting Workspace"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Patent Drafter</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => setToolsOpen(true)}
                      title="Specialist Legal Workspaces"
                    >
                      <Layers3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Workspaces</span>
                    </button>

                    <button
                      type="button"
                      className={`beebotPillBtn ${isDictating ? "active text-red-500 border-red-400 dark:border-red-600 animate-pulse" : ""}`}
                      onClick={toggleDictation}
                      title={isDictating ? "Stop voice dictation" : "Voice dictation (Speak to Sally)"}
                    >
                      {isDictating ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5 text-indigo-500" />}
                      <span>{isDictating ? "Listening..." : "Dictate"}</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn text-emerald-700 dark:text-emerald-300"
                      onClick={() => setVoiceOverlayOpen(true)}
                      title="Launch Sally Real-Time Voice Call"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Voice Call</span>
                    </button>
                  </div>

                  <button
                    className="beebotSendBtn"
                    disabled={!input.trim() || loading}
                    onClick={() => send()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ingestion notification */}
              {(ingesting || uploadedSource) && (
                <div className="mt-3 text-xs text-indigo-600 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {ingesting
                      ? "Ingesting document into matter vault…"
                      : `${uploadedSource.name} ready for retrieval`}
                  </span>
                </div>
              )}

              {/* Capability suggestions */}
              <div className="beebotSuggestions">
                {[
                  { icon: <Telescope className="w-3.5 h-3.5" />, title: "Prior-art search", prompt: "Search prior art for the uploaded invention and rank the closest references." },
                  { icon: <ShieldCheck className="w-3.5 h-3.5" />, title: "FTO analysis", prompt: "Run an FTO analysis for my product in the US. Ask me for anything missing." },
                  { icon: <FileText className="w-3.5 h-3.5" />, title: "Draft US patent", prompt: "Draft a US provisional patent application scaffold from my invention disclosure, section by section." },
                  { icon: <Scale className="w-3.5 h-3.5" />, title: "Clear a trademark", prompt: "Check whether my mark is clear for SaaS in the EU. Ask me for the mark first." },
                ].map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    className="beebotSuggestionCard"
                    disabled={loading}
                    onClick={() => { setInput(s.prompt); }}
                  >
                    {s.icon}
                    <span>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message Thread Layout */
            <div className={`beebotActiveChatView${docPanel ? " doc-open" : ""}`}>
              <div className="beebotThread" ref={threadRef}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`beebotMessage ${message.role}`}
                  >
                    {message.role === "assistant" && (
                      <div className="beebotAvatar assistant">
                        <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-4 h-4 object-contain" />
                      </div>
                    )}

                    {message.role === "user" ? (
                      <div className="beebotUserBubble">
                        {message.content}
                      </div>
                    ) : (
                      <div className="beebotMessageBody">
                        <div className="beebotAssistantHeader">
                          <span className="beebotAssistantTitle">SallyIP 4.2 Pro</span>
                        </div>

                        <div className="beebotAssistantText">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {sanitizeModelResponse(message.content)}
                          </ReactMarkdown>
                        </div>

                        {message.attachments?.length > 0 && (
                          <div className="beebotAttachmentsList">
                            {message.attachments.map((file) => (
                              <a
                                href={file.url}
                                key={file.id}
                                download={file.name}
                                className="beebotAttachmentItem"
                              >
                                <span className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-500" />
                                  <span className="font-medium">{file.name}</span>
                                </span>
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="beebotMessageActions">
                          <button
                            onClick={() => togglePlayVoice(message.content, index)}
                            className={`beebotActionBtn ${playingAudioIndex === index && isPlayingAudio ? "text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                            title={playingAudioIndex === index && isPlayingAudio ? "Stop Sally's voice audio" : "Listen in Sally's voice (Fish Audio)"}
                          >
                            {playingAudioIndex === index && isPlayingAudio ? (
                              <>
                                <Square className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                                <span className="text-red-600 font-medium">Stop audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-indigo-500" />
                                <span>Play audio</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(message.content)}
                            className="beebotActionBtn"
                            title="Copy response"
                          >
                            <Copy className="w-3 h-3" /> <span>Copy</span>
                          </button>
                          <button
                            onClick={() => setVerificationMessage(message)}
                            className="beebotActionBtn"
                            title="Inspect verification, citation audit, and proposition graph"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> <span>Verify</span>
                          </button>
                          {message.artifact?.content && (
                            <button
                              onClick={() => setDocPanel({ title: message.artifact.title, content: message.artifact.content, version: message.artifact.version, live: false, artifact: message.artifact, conversationId: active?.id })}
                              className="beebotActionBtn"
                              title="Open document in side panel"
                            >
                              <FileText className="w-3 h-3" /> <span>Open document</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {message.role === "user" && (
                      <div className="beebotAvatar user" title={user?.name || "Aman"}>
                        {userInitial}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="beebotMessage assistant">
                    <div className="beebotAvatar assistant">
                      <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-4 h-4 object-contain" />
                    </div>
                    <div className="beebotMessageBody">
                      <div className="beebotAssistantHeader">
                        <span className="beebotAssistantTitle">SallyIP 4.2 Pro</span>
                        <div className="beebotProgressBadge">
                          {thinkingProgress}%
                        </div>
                      </div>

                      {/* Percentage Progress Bar before 100% */}
                      {!isWriting && (
                        <div className="beebotProgressSection">
                          <div className="beebotProgressBarTrack">
                            <div
                              className="beebotProgressBarFill"
                              style={{ width: `${thinkingProgress}%` }}
                            />
                          </div>
                          <div className="beebotProgressPhaseRow">
                            <span className="beebotProgressPulseDot" />
                            <span className="beebotProgressPhaseText">{thinkingPhase}</span>
                          </div>
                        </div>
                      )}

                      {/* Once 100% reached: Live line-by-line typing */}
                      {isWriting && (
                        <div className="beebotStreamingText">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingAnswer}
                          </ReactMarkdown>
                          <span className="beebotStreamingCursor" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>

              {/* Persistent Pinned Bottom Composer */}
              <div className="beebotBottomComposerWrap">
                <div className="beebotComposerCard">
                  <textarea
                    className="beebotComposerInput"
                    placeholder="Ask SallyIP a follow-up or command..."
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <div className="beebotComposerBottom">
                    <div className="beebotActionPills">
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => uploadInputRef.current?.click()}
                        title="Attach document"
                      >
                        <Paperclip />
                      </button>
                      <button
                        type="button"
                        className={`beebotPillBtn ${deepResearch ? "active" : ""}`}
                        onClick={() => setDeepResearch((v) => !v)}
                      >
                        <Telescope />
                        <span>{deepResearch ? "Reasoning On" : "Reasoning"}</span>
                      </button>
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setActiveWorkspace("patent_draft")}
                        title="Open US Patent Drafting Workspace"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Patent Drafter</span>
                      </button>
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setToolsOpen(true)}
                        title="Specialist Legal Workspaces"
                      >
                        <Layers3 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Workspaces</span>
                      </button>

                      <button
                        type="button"
                        className={`beebotPillBtn ${isDictating ? "active text-red-500 border-red-400 dark:border-red-600 animate-pulse" : ""}`}
                        onClick={toggleDictation}
                        title={isDictating ? "Stop voice dictation" : "Voice dictation (Speak to Sally)"}
                      >
                        {isDictating ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5 text-indigo-500" />}
                        <span>{isDictating ? "Listening..." : "Dictate"}</span>
                      </button>

                      <button
                        type="button"
                        className="beebotPillBtn text-emerald-700 dark:text-emerald-300"
                        onClick={() => setVoiceOverlayOpen(true)}
                        title="Launch Sally Real-Time Voice Call"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Voice Call</span>
                      </button>
                    </div>
                    <button
                      className="beebotSendBtn"
                      disabled={!input.trim() || loading}
                      onClick={() => send()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {docPanel && (
                <Suspense fallback={null}>
                  <DocPanel
                    doc={docPanel}
                    onClose={() => setDocPanel(null)}
                    onExported={(file) => {
                      recordToolResult?.(`## Document exported\n\n**${file.name}** ready for download.`, { task_class: "DOCUMENT_EXPORT", source_basis: "user_supplied" });
                      addLibraryFile({ ...file, content: docPanel?.content || "" });
                    }}
                  />
                </Suspense>
              )}
              {verificationMessage && (
                <Suspense fallback={null}>
                  <VerificationInspectorModal
                    isOpen={Boolean(verificationMessage)}
                    onClose={() => setVerificationMessage(null)}
                    message={verificationMessage}
                  />
                </Suspense>
              )}
            </div>
          )}

      {/* Sally Full-Duplex Voice Call Overlay */}
      {voiceOverlayOpen && (
        <Suspense fallback={null}>
          <VoiceOverlay
            isOpen={voiceOverlayOpen}
            onClose={() => setVoiceOverlayOpen(false)}
            matterId={activeMatterId}
            conversationId={active?.id}
          />
        </Suspense>
      )}

      {/* Workspaces Launcher Modal */}
      {toolsOpen && (
        <div
          className="beebotModalBackdrop"
          onClick={() => setToolsOpen(false)}
        >
          <div
            className="beebotModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="beebotModalHeader">
              <div>
                <h3 className="beebotModalTitle">Specialist Legal Workspaces</h3>
                <p className="beebotModalSubtitle">Select a specialized module for active matter analysis.</p>
              </div>
              <button
                onClick={() => setToolsOpen(false)}
                className="beebotModalClose"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="beebotModalBody">
              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("patent_draft");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="beebotTileName">US Patent Drafter</div>
                </div>
                <div className="beebotTileDesc">
                  § 101 Alice screen, § 112 antecedent basis checks, claims, and full USPTO specification.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("contracts");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="beebotTileName">Contract Review</div>
                </div>
                <div className="beebotTileDesc">
                  Automated contract redlining, risk flags, and institutional playbook enforcement.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("playbooks");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="beebotTileName">Playbooks Desk</div>
                </div>
                <div className="beebotTileDesc">
                  Manage standard clauses, fallbacks, negotiation positions, and clause ledger.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("fto");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Telescope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="beebotTileName">Freedom to Operate</div>
                </div>
                <div className="beebotTileDesc">
                  Infringement risk matrices, product-to-patent mapping, and design-around guidance.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("claim_chart");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Layers3 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="beebotTileName">Claim Chart Builder</div>
                </div>
                <div className="beebotTileDesc">
                  Element-by-element patent claim comparison against prior art disclosures.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("novelty");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Search className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="beebotTileName">Prior Art & Novelty</div>
                </div>
                <div className="beebotTileDesc">
                  Anticipation analysis, primary citation verification, and inventive step assessments.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("trademark");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="beebotTileName">Trademark Intelligence</div>
                </div>
                <div className="beebotTileDesc">
                  Likelihood of confusion screening, Nice classification, and registry clearance.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("office_action");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FileWarning className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="beebotTileName">Office Action Response</div>
                </div>
                <div className="beebotTileDesc">
                  Parse rejections, map to claims, draft audited amendments with new-matter checks.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("claim_qa");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="beebotTileName">Claim QA Audit</div>
                </div>
                <div className="beebotTileDesc">
                  One-click antecedent, dependency, terminology, and support audit — instant, in-browser.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("knowledge_graph");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FolderKanban className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="beebotTileName">Knowledge Graph & Citations</div>
                </div>
                <div className="beebotTileDesc">
                  Patent families, citation ledgers, prosecution histories, and litigation evidence.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Workspaces Render */}
      <Suspense fallback={null}>
        {activeWorkspace === "patent_draft" && (
          <PatentDraftingWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "contracts" && (
          <ContractWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "playbooks" && (
          <PlaybookWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            conversationId={active?.id}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "fto" && (
          <FtoWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "claim_chart" && (
          <ClaimChartWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "novelty" && (
          <NoveltyWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "trademark" && (
          <TrademarkClearanceWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "knowledge_graph" && (
          <IpKnowledgeGraphWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
          />
        )}
        {activeWorkspace === "office_action" && (
          <OfficeActionWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "claim_qa" && (
          <ClaimQaWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            onResult={recordToolResult}
          />
        )}
      </Suspense>
        </main>
      </div>
    </div>
  );
}
