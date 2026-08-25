import {
  BrainCircuit,
  Check,
  Database,
  GitMerge,
  Layers3,
  Scale,
  Search,
  Sparkles,
  Workflow,
} from "lucide-react";
import TransparencyCharts from "./transparency-charts";

const engines = [
  {
    name: "Nemotron 3.5 Lightning",
    slug: "nvidia/nemotron-3.5-lightning:free",
    weight: 16,
    type: "Reasoning",
    use: "Fast legal-technical analysis and a strong first interpretation of the question.",
  },
  {
    name: "Liquid LFM 2.5 2.6B",
    slug: "liquid/lfm-2.5-2.6b:free",
    weight: 12,
    type: "Reasoning",
    use: "Efficient structured analysis and fast issue decomposition.",
  },
  {
    name: "Gemma 4 26B",
    slug: "google/gemma-4-26b-a4b-it:free",
    weight: 13,
    type: "Reasoning",
    use: "Clear language, explanation quality, and accessible organization.",
  },
  {
    name: "OX Alpha",
    slug: "stealth/ox-alpha",
    weight: 50,
    type: "Reasoning · 4.7s p50",
    use: "Primary deep synthesis, edge-case review, and conflict resolution.",
  },
  {
    name: "Dots 3 Note",
    slug: "dots-studio/dots-3-note-preview:free",
    weight: 9,
    type: "Reasoning",
    use: "Long-form evidence organization, note synthesis, and supporting detail.",
  },
];
const support = [
  {
    name: "Liquid LFM 2.5 Embedding",
    slug: "liquid/lfm-2.5-embedding-350m:free",
    type: "Embedding · 1,024 dimensions",
    icon: Database,
    use: "Turns questions and approved SallyIP knowledge into comparable vectors for semantic retrieval.",
  },
  {
    name: "Nemotron Rerank VL",
    slug: "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
    type: "Multimodal reranker",
    icon: Scale,
    use: "Scores text and image evidence—and candidate answers—by relevance before synthesis.",
  },
];
export default function TransparencyPage() {
  return (
    <div className="transparencyV2">
      <header className="transparencyHero">
        <div>
          <span>MODEL TRANSPARENCY / SALLYIP 4.1 PRO</span>
          <h1>
            Many signals.
            <br />
            <em>One intelligence: Sally.</em>
          </h1>
        </div>
        <p>
          Users never select or speak to an underlying provider model. Every
          question is processed by Sally’s internal intelligence stack and
          returned as one merged Sally answer.
        </p>
      </header>
      <section className="identityRule">
        <div className="sallyCore">
          <img src="/sallyip-logo.png" alt="SallyIP" />
          <span>
            <small>PUBLIC IDENTITY</small>
            <b>SallyIP 4.1 Pro</b>
            <em>Sally</em>
          </span>
        </div>
        <div>
          <Check />
          <p>
            Sally is the only assistant identity presented to users. Internal
            engines are infrastructure—not separate assistants, personalities,
            or selectable chat modes.
          </p>
        </div>
      </section>
      <TransparencyCharts />
      <section className="engineSection">
        <div className="sectionLabel">
          <span>01 / WEIGHTED REASONING</span>
          <h2>
            Five independent readings.
            <br />
            One resolved answer.
          </h2>
          <p>
            The percentages are orchestration influence—not neural-network
            parameters. Availability, relevance, and evaluation signals can
            reduce an engine’s effective contribution for a specific request.
          </p>
        </div>
        <div className="engineGrid">
          {engines.map((engine, index) => (
            <article key={engine.slug}>
              <div className="engineTop">
                <span>0{index + 1}</span>
                <small>{engine.type}</small>
              </div>
              <h3>{engine.name}</h3>
              <code>{engine.slug}</code>
              <div className="weight">
                <div>
                  <i style={{ width: `${engine.weight}%` }} />
                </div>
                <strong>{engine.weight}%</strong>
              </div>
              <p>{engine.use}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="supportSection">
        <div className="sectionLabel">
          <span>02 / DATA INTELLIGENCE</span>
          <h2 className="singleLineTitle">
            The layer between answers and evidence.
          </h2>
        </div>
        <div className="supportGrid">
          {support.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.slug}>
                <Icon />
                <div>
                  <small>{item.type}</small>
                  <h3>{item.name}</h3>
                  <code>{item.slug}</code>
                  <p>{item.use}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="sallyFlow">
        <div className="sectionLabel">
          <span>03 / EVERY QUESTION</span>
          <h2>
            How Sally creates
            <br />a final response.
          </h2>
        </div>
        <div className="flowSteps">
          {[
            [
              Search,
              "Understand",
              "The embedding layer represents the question and retrieves semantically relevant approved context.",
            ],
            [
              BrainCircuit,
              "Reason × 4",
              "All five reasoning engines receive the same conversation and independently produce candidate answers within a shared latency budget.",
            ],
            [
              Scale,
              "Rank",
              "The reranker scores candidates for relevance while Sally applies the disclosed orchestration weights.",
            ],
            [
              GitMerge,
              "Merge",
              "The synthesis layer resolves conflicts, removes repetition, preserves caveats, and creates one answer.",
            ],
            [
              Sparkles,
              "Present as Sally",
              "Only the final Sally response reaches the user. Internal chain-of-thought and provider identities remain hidden.",
            ],
          ].map(([Icon, title, text], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="learningSection">
        <div>
          <span>04 / HOW SALLY LEARNS</span>
          <h2>
            Memory now.
            <br />
            <em>Controlled learning later.</em>
          </h2>
        </div>
        <div className="learningCards">
          <article>
            <Database />
            <h3>Conversation memory</h3>
            <p>
              Neon securely stores the user’s conversation history so Sally can
              preserve context across sessions and devices.
            </p>
          </article>
          <article>
            <Layers3 />
            <h3>Knowledge retrieval</h3>
            <p>
              Embeddings let approved documents become searchable knowledge.
              Retrieval changes the context Sally sees, not the underlying
              provider weights.
            </p>
          </article>
          <article>
            <Workflow />
            <h3>Evaluated improvement</h3>
            <p>
              Feedback, benchmarks, provenance, and rights-cleared datasets can
              improve retrieval policies and Sally’s evaluated orchestration.
              Private chats are not used to train provider models.
            </p>
          </article>
        </div>
      </section>
      <section className="transparencyLimit">
        <Sparkles />
        <div>
          <span>IMPORTANT DISTINCTION</span>
          <h2>Sally synthesizes; she does not invent consensus.</h2>
          <p>
            Multiple engines can still share mistakes. Sally highlights
            uncertainty where possible, but responses remain research
            assistance—not legal advice. Verify important conclusions against
            authoritative sources and qualified counsel.
          </p>
        </div>
      </section>
    </div>
  );
}
