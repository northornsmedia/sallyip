import { useEffect, useState } from "react";
import {
  Check,
  Languages,
  LibraryBig,
  Link2,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
const label = (value) => String(value || "").replaceAll("_", " ");
const list = (value) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export default function TrademarkIntelligenceWorkspace({ matterId, onResult }) {
  const [open, setOpen] = useState(false),
    [inputs, setInputs] = useState(null),
    [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      clearance_project_id: "",
      base_mark: "",
      jurisdictions: "EU",
      target_languages: "English",
    }),
    [variant, setVariant] = useState({
      variant_type: "translation",
      language: "English",
      script: "Latin",
      region: "",
      variant_text: "",
      meaning: "",
      source_basis: "user_supplied",
    }),
    [goods, setGoods] = useState({
      user_description: "",
      proposed_wording: "",
      nice_class: "",
      jurisdiction: "EU",
      office: "EUIPO",
      acceptability_status: "unverified",
    }),
    [finalForm, setFinalForm] = useState({
      review_status: "in_review",
      conclusion_note: "",
    });
  const request = async (url, options) => {
    const response = await fetch(url, options),
      payload = await response.json();
    if (!response.ok)
      throw new Error(
        payload?.error?.message || "Trademark intelligence operation failed",
      );
    return payload;
  };
  const loadInputs = async () => {
    if (!matterId) return;
    setBusy(true);
    setError("");
    try {
      setInputs(
        await request(
          `/api/trademark-intelligence?matter_id=${encodeURIComponent(matterId)}`,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const load = async (id) => {
    setBusy(true);
    setError("");
    try {
      const next = await request(
        `/api/trademark-intelligence?project_id=${encodeURIComponent(id)}`,
      );
      setData(next);
      setFinalForm({
        review_status: next.project.review_status,
        conclusion_note: next.project.conclusion_note || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (open) loadInputs();
  }, [open, matterId]);
  const post = async (body) => {
    setBusy(true);
    setError("");
    try {
      const next = await request("/api/trademark-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setData(next);
      return next;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  };
  const create = async (e) => {
    e.preventDefault();
    try {
      const next = await post({
        action: "create",
        matter_id: matterId,
        clearance_project_id: form.clearance_project_id || null,
        base_mark: form.base_mark,
        jurisdictions: list(form.jurisdictions),
        target_languages: list(form.target_languages),
      });
      onResult(
        `## Trademark language and goods intelligence opened\n\nSally created **${next.project.title}** across ${next.project.target_languages.join(", ")}. No translation, transliteration, meaning, Nice class, or office wording is accepted until its source and lawyer review are recorded.`,
        {
          task_class: "TRADEMARK_INTELLIGENCE",
          specialists: [
            "Sally Trademarks",
            "Sally Translation",
            "Sally Brand Protection",
            "Sally Evidence",
            "Sally Verification",
          ],
          source_basis: "user_supplied",
        },
      );
    } catch {}
  };
  const updateCoverage = (id, key, value) =>
    setData((current) => ({
      ...current,
      coverage: current.coverage.map((c) =>
        c.id === id ? { ...c, [key]: value } : c,
      ),
    }));
  const saveCoverage = (c) =>
    post({
      action: "update_coverage",
      coverage_id: c.id,
      status: c.status,
      source_passage_id: c.source_passage_id || null,
      note: c.note,
    });
  const addVariant = async (e) => {
    e.preventDefault();
    try {
      await post({
        action: "add_variant",
        project_id: data.project.id,
        ...variant,
      });
      setVariant({ ...variant, variant_text: "", meaning: "" });
    } catch {}
  };
  const updateVariant = (id, key, value) =>
    setData((current) => ({
      ...current,
      variants: current.variants.map((v) =>
        v.id === id ? { ...v, [key]: value } : v,
      ),
    }));
  const saveVariant = (v) =>
    post({
      action: "review_variant",
      variant_id: v.id,
      source_passage_id: v.source_passage_id || null,
      review_status: v.review_status,
      reviewer_note: v.reviewer_note,
    });
  const addGoods = async (e) => {
    e.preventDefault();
    try {
      await post({
        action: "add_goods",
        project_id: data.project.id,
        ...goods,
        nice_class: Number(goods.nice_class) || null,
      });
      setGoods({
        ...goods,
        user_description: "",
        proposed_wording: "",
        nice_class: "",
        acceptability_status: "unverified",
      });
    } catch {}
  };
  const updateGoods = (id, key, value) =>
    setData((current) => ({
      ...current,
      goods_terms: current.goods_terms.map((g) =>
        g.id === id ? { ...g, [key]: value } : g,
      ),
    }));
  const saveGoods = (g) =>
    post({
      action: "review_goods",
      goods_term_id: g.id,
      proposed_wording: g.proposed_wording,
      nice_class: Number(g.nice_class) || null,
      acceptability_status: g.acceptability_status,
      source_passage_id: g.source_passage_id || null,
      review_status: g.review_status,
      reviewer_note: g.reviewer_note,
    });
  const finalize = async (e) => {
    e.preventDefault();
    try {
      const next = await post({
        action: "finalize",
        project_id: data.project.id,
        ...finalForm,
      });
      onResult(
        `## Trademark intelligence ${next.project.review_status}\n\nAccepted query set: **${next.search_set.join(" · ")}**  \nUnresolved language channels: **${next.gaps.language_channels}**  \nUnaccepted goods/services terms: **${next.gaps.goods_unaccepted}**.`,
        {
          task_class: "TRADEMARK_INTELLIGENCE_REVIEW",
          specialists: [
            "Sally Trademarks",
            "Sally Translation",
            "Sally Evidence",
            "Sally Verification",
          ],
          source_basis: "retrieved_source",
        },
      );
    } catch {}
  };
  const sync = async () => {
    try {
      const next = await post({
        action: "sync_clearance",
        project_id: data.project.id,
      });
      onResult(
        `## Accepted trademark intelligence synced\n\nClearance now uses ${next.search_set.length} accepted mark forms and ${next.goods_terms.length} verified goods/services entries.`,
        {
          task_class: "TRADEMARK_CLEARANCE_ENRICHMENT",
          specialists: [
            "Sally Trademarks",
            "Sally Brand Protection",
            "Sally Verification",
          ],
          source_basis: "verified",
        },
      );
    } catch {}
  };
  const close = () => {
    setOpen(false);
    setData(null);
    setError("");
  };
  return (
    <>
      <div className="tmIntelLaunch">
        <button onClick={() => setOpen(true)}>
          <Languages />
          Trademark language & goods
        </button>
      </div>
      {open && (
        <div
          className="ipToolOverlay"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <section className="ipToolModal tmIntelModal">
            <header>
              <div>
                <span>
                  SALLY TRADEMARKS / TRANSLATION / CLASSIFICATION / VERIFICATION
                </span>
                <h2>
                  {data
                    ? data.project.title
                    : "Trademark language and goods intelligence"}
                </h2>
              </div>
              <button onClick={close}>
                <X />
              </button>
            </header>
            {!matterId ? (
              <div className="ipToolError">
                Select or create a matter first.
              </div>
            ) : data ? (
              <Project
                {...{
                  data,
                  busy,
                  variant,
                  setVariant,
                  addVariant,
                  updateCoverage,
                  saveCoverage,
                  updateVariant,
                  saveVariant,
                  goods,
                  setGoods,
                  addGoods,
                  updateGoods,
                  saveGoods,
                  finalForm,
                  setFinalForm,
                  finalize,
                  sync,
                }}
              />
            ) : (
              <Create {...{ inputs, form, setForm, create, load, busy }} />
            )}
            {error && <div className="ipToolError">{error}</div>}
          </section>
        </div>
      )}
    </>
  );
}
function Create({ inputs, form, setForm, create, load, busy }) {
  return (
    <form className="tmIntelCreate" onSubmit={create}>
      <label>
        Linked clearance project
        <select
          value={form.clearance_project_id}
          onChange={(e) => {
            const c = inputs?.clearance.find((x) => x.id === e.target.value);
            setForm({
              ...form,
              clearance_project_id: e.target.value,
              base_mark: c?.target_mark || form.base_mark,
            });
          }}
        >
          <option value="">Create standalone intelligence project</option>
          {inputs?.clearance.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.target_mark}
            </option>
          ))}
        </select>
      </label>
      <label>
        Base mark
        <input
          required={!form.clearance_project_id}
          value={form.base_mark}
          onChange={(e) => setForm({ ...form, base_mark: e.target.value })}
        />
      </label>
      <div className="ipToolGrid">
        <label>
          Jurisdictions
          <input
            value={form.jurisdictions}
            onChange={(e) =>
              setForm({ ...form, jurisdictions: e.target.value })
            }
          />
        </label>
        <label>
          Target languages
          <input
            required
            value={form.target_languages}
            onChange={(e) =>
              setForm({ ...form, target_languages: e.target.value })
            }
            placeholder="English, Arabic, Chinese"
          />
        </label>
      </div>
      {inputs?.projects.length > 0 && (
        <label>
          Or reopen project
          <select
            defaultValue=""
            onChange={(e) => e.target.value && load(e.target.value)}
          >
            <option value="">Select project</option>
            {inputs.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {label(p.review_status)}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="officialSearchNote">
        Sally records candidate linguistic and classification work, but only
        verified and lawyer-accepted outputs enter the clearance query set.
      </p>
      <footer>
        <span>
          <ShieldCheck />
          Source and office-wording gates enabled
        </span>
        <button disabled={busy}>
          {busy ? "Opening…" : "Open intelligence project"}
        </button>
      </footer>
    </form>
  );
}
function Project(props) {
  const { data } = props;
  return (
    <div className="tmIntelBody">
      <div className="tmIntelStats">
        <article>
          <span>BASE MARK</span>
          <strong>{data.project.base_mark}</strong>
        </article>
        <article>
          <span>ACCEPTED QUERY FORMS</span>
          <strong>{data.search_set.length}</strong>
        </article>
        <article>
          <span>LANGUAGE GAPS</span>
          <strong>{data.gaps.language_channels}</strong>
        </article>
        <article>
          <span>GOODS TERMS</span>
          <strong>
            {data.goods_terms.length - data.gaps.goods_unaccepted}/
            {data.goods_terms.length}
          </strong>
        </article>
      </div>
      <Coverage {...props} />
      <Variants {...props} />
      <Goods {...props} />
      <Final {...props} />
    </div>
  );
}
function Coverage({ data, busy, updateCoverage, saveCoverage }) {
  return (
    <section className="tmIntelPanel">
      <h3>1 · Language coverage</h3>
      <div className="tmCoverage">
        {data.coverage.map((c) => (
          <article key={c.id}>
            <b>{c.language}</b>
            <span>{label(c.channel)}</span>
            <select
              value={c.status}
              onChange={(e) => updateCoverage(c.id, "status", e.target.value)}
            >
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="not_applicable">Not applicable</option>
            </select>
            <select
              value={c.source_passage_id || ""}
              onChange={(e) =>
                updateCoverage(c.id, "source_passage_id", e.target.value)
              }
            >
              <option value="">No verified source</option>
              {data.passages.map((p) => (
                <option key={p.passage_id} value={p.passage_id}>
                  {p.source_title} · {p.locator} ·{" "}
                  {p.verified_at ? "verified" : "unverified"}
                </option>
              ))}
            </select>
            <input
              value={c.note || ""}
              onChange={(e) => updateCoverage(c.id, "note", e.target.value)}
              placeholder="Review rationale"
            />
            <button disabled={busy} onClick={() => saveCoverage(c)}>
              <Check />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function Variants({
  data,
  busy,
  variant,
  setVariant,
  addVariant,
  updateVariant,
  saveVariant,
}) {
  return (
    <section className="tmIntelPanel">
      <h3>2 · Linguistic variants</h3>
      <form className="tmVariantForm" onSubmit={addVariant}>
        <select
          value={variant.variant_type}
          onChange={(e) =>
            setVariant({ ...variant, variant_type: e.target.value })
          }
        >
          <option value="translation">Translation</option>
          <option value="transliteration">Transliteration</option>
          <option value="phonetic_equivalent">Phonetic equivalent</option>
          <option value="conceptual_equivalent">Conceptual equivalent</option>
          <option value="regional_meaning">Regional meaning</option>
          <option value="slang">Slang</option>
        </select>
        <input
          required
          value={variant.language}
          onChange={(e) => setVariant({ ...variant, language: e.target.value })}
          placeholder="Language"
        />
        <input
          value={variant.script}
          onChange={(e) => setVariant({ ...variant, script: e.target.value })}
          placeholder="Script"
        />
        <input
          required
          value={variant.variant_text}
          onChange={(e) =>
            setVariant({ ...variant, variant_text: e.target.value })
          }
          placeholder="Candidate mark form"
        />
        <input
          value={variant.meaning}
          onChange={(e) => setVariant({ ...variant, meaning: e.target.value })}
          placeholder="Meaning / context"
        />
        <button disabled={busy}>
          <Plus />
          Add candidate
        </button>
      </form>
      <div className="tmVariants">
        {data.variants.map((v) => (
          <article key={v.id}>
            <div>
              <b>{v.variant_text}</b>
              <span>
                {v.language} · {v.script} · {label(v.variant_type)}
              </span>
              <small>{v.meaning}</small>
            </div>
            <select
              value={v.source_passage_id || ""}
              onChange={(e) =>
                updateVariant(v.id, "source_passage_id", e.target.value)
              }
            >
              <option value="">No verified source</option>
              {data.passages.map((p) => (
                <option key={p.passage_id} value={p.passage_id}>
                  {p.source_title} · {p.locator}
                </option>
              ))}
            </select>
            <select
              value={v.review_status}
              onChange={(e) =>
                updateVariant(v.id, "review_status", e.target.value)
              }
            >
              <option value="proposed">Proposed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="needs_evidence">Needs evidence</option>
              <option value="needs_linguist_review">
                Needs linguist review
              </option>
            </select>
            <button disabled={busy} onClick={() => saveVariant(v)}>
              <Check />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function Goods({
  data,
  busy,
  goods,
  setGoods,
  addGoods,
  updateGoods,
  saveGoods,
}) {
  return (
    <section className="tmIntelPanel">
      <h3>3 · Goods and services intelligence</h3>
      <form className="tmGoodsForm" onSubmit={addGoods}>
        <input
          required
          value={goods.user_description}
          onChange={(e) =>
            setGoods({ ...goods, user_description: e.target.value })
          }
          placeholder="Business description"
        />
        <input
          required
          value={goods.proposed_wording}
          onChange={(e) =>
            setGoods({ ...goods, proposed_wording: e.target.value })
          }
          placeholder="Proposed office wording"
        />
        <input
          type="number"
          min="1"
          max="45"
          value={goods.nice_class}
          onChange={(e) => setGoods({ ...goods, nice_class: e.target.value })}
          placeholder="Nice class"
        />
        <input
          value={goods.jurisdiction}
          onChange={(e) => setGoods({ ...goods, jurisdiction: e.target.value })}
        />
        <input
          value={goods.office}
          onChange={(e) => setGoods({ ...goods, office: e.target.value })}
        />
        <button disabled={busy}>
          <Plus />
          Add wording
        </button>
      </form>
      <div className="tmGoods">
        {data.goods_terms.map((g) => (
          <article key={g.id}>
            <div>
              <span>{g.user_description}</span>
              <textarea
                value={g.proposed_wording}
                onChange={(e) =>
                  updateGoods(g.id, "proposed_wording", e.target.value)
                }
              />
            </div>
            <input
              type="number"
              min="1"
              max="45"
              value={g.nice_class || ""}
              onChange={(e) => updateGoods(g.id, "nice_class", e.target.value)}
            />
            <select
              value={g.acceptability_status}
              onChange={(e) =>
                updateGoods(g.id, "acceptability_status", e.target.value)
              }
            >
              <option value="unverified">Unverified</option>
              <option value="accepted_wording">Office-accepted wording</option>
              <option value="requires_amendment">Requires amendment</option>
              <option value="rejected">Rejected</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={g.source_passage_id || ""}
              onChange={(e) =>
                updateGoods(g.id, "source_passage_id", e.target.value)
              }
            >
              <option value="">No Tier-1 office source</option>
              {data.passages.map((p) => (
                <option key={p.passage_id} value={p.passage_id}>
                  {p.source_title} · {p.locator} · Tier {p.authority_tier}
                </option>
              ))}
            </select>
            <select
              value={g.review_status}
              onChange={(e) =>
                updateGoods(g.id, "review_status", e.target.value)
              }
            >
              <option value="proposed">Proposed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="needs_evidence">Needs evidence</option>
              <option value="needs_classification_review">Needs review</option>
            </select>
            <button disabled={busy} onClick={() => saveGoods(g)}>
              <Check />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
function Final({ data, busy, finalForm, setFinalForm, finalize, sync }) {
  return (
    <form className="tmIntelFinal" onSubmit={finalize}>
      <h3>4 · Intelligence quality gate</h3>
      <div>
        <span>Accepted query set</span>
        <strong>{data.search_set.join(" · ")}</strong>
      </div>
      <select
        value={finalForm.review_status}
        onChange={(e) =>
          setFinalForm({ ...finalForm, review_status: e.target.value })
        }
      >
        <option value="draft">Draft</option>
        <option value="in_review">In review</option>
        <option value="accepted">Accepted</option>
        <option value="reopened">Reopened</option>
      </select>
      <textarea
        value={finalForm.conclusion_note}
        onChange={(e) =>
          setFinalForm({ ...finalForm, conclusion_note: e.target.value })
        }
        placeholder="Language limitations, jurisdictions, classification scope, office wording, and remaining clearance searches"
      />
      <button disabled={busy}>
        <ShieldCheck />
        Apply quality gate
      </button>
      {data.project.clearance_project_id && (
        <button
          type="button"
          disabled={busy || data.project.review_status !== "accepted"}
          onClick={sync}
        >
          <Link2 />
          Sync accepted intelligence to clearance
        </button>
      )}
    </form>
  );
}
