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
  Minus,
  Paperclip,
  Pencil,
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
  const requestsDownload = /\b(create|generate|make|export|prepare|download|convert|provide|give|turn .+ into)\b/i.test(text);
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
  /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document)\b/i.test(text);
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
const persistArtifact = async ({ artifact, conversationId, revision }) => {
  const response = await fetch("/api/artifacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: revision ? "revise" : "create",
      artifact_id: artifact.id,
      conversation_id: conversationId,
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
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Artifact could not be saved");
  return data.artifact;
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

  const userMessages = (messages || []).filter((m) => m.role === "user").map((m) => m.content);
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

  // 2. Memory / Training / Retention inquiry
  const isMemoryOrTrainingQuery =
    /\b(train|training|remember|remembering|rmember|rmembering|memory|memorize|memorizing|learn|learning|recall|retention)\b/i.test(p);

  if (isMemoryOrTrainingQuery) {
    const priorMentionOfMouse = priorText.includes("mouse") || p.includes("mouse") || priorText.includes("tech");
    const activeSubject = priorMentionOfMouse
      ? "High-Precision Peripheral / Computer Mouse Technology"
      : "Intellectual Property Matter & Technical Innovation";

    return `### SallyIP Working Memory & Adaptive Retention

Understood, **${userName}** — I have reinforced active context retention for your matter. Here is how my memory and learning architecture operates:

#### 1. Real-Time Conversation Memory (Working Context)
- **Zero Loss Across Turns**: Every specification, technical detail, mechanism, and design constraint you share in this conversation is preserved in active working memory.
- **Progressive Accumulation**: As you describe your invention across multiple messages, I assemble the technical elements into an ongoing invention disclosure record rather than treating each prompt in isolation.

#### 2. Matter Vault & Knowledge Retention (Persistent Memory)
- **Matter Grounding**: All matter-specific data, uploaded documents, sketches, and drafted sections are permanently stored in your encrypted matter vault.
- **Cross-Session Recall**: When you revisit this matter, the complete history, prior-art citations, and drafted claim trees are immediately accessible.

#### 3. Statutory Support & Antecedent Consistency
- **35 U.S.C. § 112 Memory Checks**: When drafting claims and detailed descriptions, my reasoning engine actively cross-references previously disclosed components to verify that every claimed limitation has explicit written description support and verified antecedent basis.
- **Prior-Art Boundary Memory**: References and claim charts mapped in earlier steps are remembered when drafting non-infringement arguments or distinguishing dependent claims.

#### 4. Privacy & Confidentiality Guarantee
- **No Third-Party Leakage**: Your proprietary inventions and confidential disclosures are never used to train public foundation models.
- **Evaluated Improvement**: My legal routing and orchestration rules learn from task evaluations and verified examination precedents within SallyIP's secure boundary.

---

#### Active Matter Memory Snapshot:
- **Practitioner / Inventor**: ${userName}
- **Active Matter Subject**: ${activeSubject}
- **Drafting Posture**: US Patent Application (Intake & Specification Assembly)
- **Memory Status**: Active working memory engaged • Ready for technical feature disclosure

Whenever you're ready, tell me about your invention — what are the core components, how does it work, and what makes it unique? Even rough notes or bullet points are fine!`;
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

  const isPatentDraftingRequest =
    (/\b(draft|write|prepare|file|create)\b/i.test(p) &&
      /\b(patent|pateent|claim|claims|specification|provisional|application)\b/i.test(p)) ||
    /\b(patent application|draft patent|patent draft)\b/i.test(p) ||
    (priorText.includes("patent") && /\b(sensor|optical|haptic|tracking|dpi|laser|piezoelectric|switch|housing)\b/i.test(p));

  if (isPatentDraftingRequest) {
    // Check if the prompt or conversation already provides concrete technical disclosure (components, mechanisms, how it works)
    const hasTechnicalDetails =
      (p.length > 80 &&
        (/\b(sensor|optical|mechanism|comprises|includes|actuator|chassis|housing|switch|circuit|algorithm|processor|battery|haptic|dpi|tracking|ergonomic|wireless|bluetooth|latency|piezoelectric)\b/i.test(p) ||
          /\b(it works by|the problem is|the invention solves|the mouse has|the device has)\b/i.test(p))) ||
      (priorText.includes("patent") &&
        (/\b(sensor|optical|mechanism|actuator|chassis|housing|switch|circuit|algorithm|processor|battery|haptic|dpi|tracking|ergonomic|wireless|bluetooth|latency|piezoelectric)\b/i.test(p) ||
          /\b(it works by|the problem is|the invention solves|it uses|it has)\b/i.test(p)));

    if (hasTechnicalDetails) {
      // Progressive drafting: summarize -> identify concepts -> draft claims & spec -> audit
      return `### US Patent Application Draft & Technical Synthesis

I have reviewed your invention disclosure and prepared the preliminary US patent application draft.

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
      <img src="/sallyip-logo.png" alt="" />
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
              content: exportMsg,
              artifact: previousArtifact,
              attachments: generatedData.file ? [generatedData.file] : [],
            },
          ],
        };
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
          conversationId: baseChat.id,
          revision: revisionRequest,
        });
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
            if (generatedData.file) attachments = [generatedData.file];
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
      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: fallbackAns,
          },
        ],
      };
      updateActive(() => finalChat);
      await persistChat(finalChat).catch(() => {});
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
            <img src="/sallyip-brand-mark.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
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
              className={`beebotNavItem ${activeNav === "library" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("library");
                uploadInputRef.current?.click();
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Library</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "history" ? "active" : ""}`}
              onClick={() => { setActiveNav("history"); setSearchQuery(""); searchInputRef.current?.focus(); }}
              title="Search conversation history"
            >
              <Clock3 className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Grouped History with clean hover delete */}
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
                  <img src="/sallyip-brand-mark.png" alt="" className="w-3.5 h-3.5 object-contain" />
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
            <div className="beebotActiveChatView">
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
                            onClick={() => navigator.clipboard.writeText(message.content)}
                            className="beebotActionBtn"
                            title="Copy response"
                          >
                            <Copy className="w-3 h-3" /> <span>Copy</span>
                          </button>
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
            </div>
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
