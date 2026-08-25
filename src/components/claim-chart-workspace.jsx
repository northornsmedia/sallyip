import { useEffect, useState } from "react";
import { Check, FileSearch, ShieldCheck, Sparkles, X } from "lucide-react";

export default function ClaimChartWorkspace({ matterId, onResult }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [inputs, setInputs] = useState({ claims: [], charts: [] }),
    [chart, setChart] = useState(null);
  const [form, setForm] = useState({
    claim_id: "",
    chart_type: "infringement",
    target_name: "",
    jurisdiction: "",
  });
  useEffect(() => {
    if (!open || !matterId) return;
    setBusy(true);
    fetch(`/api/claim-charts?matter_id=${encodeURIComponent(matterId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error?.message || "Could not load claims");
        setInputs(data);
        setForm((current) => ({
          ...current,
          claim_id: current.claim_id || data.claims[0]?.id || "",
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [open, matterId]);
  const create = async (event) => {
    event.preventDefault();
    if (!matterId) return setError("Select a matter first.");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/claim-charts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matter_id: matterId, ...form }),
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message || "Could not create claim chart");
      setChart(data);
      onResult(
        `## Claim chart created\n\n**${data.chart.title}** contains ${data.rows.length} claim elements. Candidate evidence is only a research suggestion: every mapping starts **unmapped** and requires explicit lawyer review.`,
        {
          task_class:
            data.chart.chart_type === "prior_art"
              ? "PATENT_PRIOR_ART_CHART"
              : "PATENT_INFRINGEMENT_CHART",
          specialists: [
            "Sally Patents",
            "Sally Evidence",
            "Sally Verification",
          ],
          source_basis: "matter_sources",
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const loadChart = async (id) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
          `/api/claim-charts?chart_id=${encodeURIComponent(id)}`,
        ),
        data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message || "Could not load chart");
      setChart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const changeRow = (id, key, value) =>
    setChart((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === id ? { ...row, [key]: value } : row,
      ),
    }));
  const saveRow = async (row) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/claim-charts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "review_row",
            row_id: row.id,
            mapping_status: row.mapping_status,
            review_status: row.review_status,
            evidence_passage_id: row.evidence_passage_id,
            comments: row.comments,
          }),
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message || "Could not save review");
      setChart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const acceptSuggestions = async () => {
    const count =
      chart?.rows.filter(
        (row) => row.evidence_passage_id && row.review_status !== "accepted",
      ).length || 0;
    if (
      !count ||
      !window.confirm(
        `Accept all ${count} evidence-backed mapping suggestions?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/claim-charts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "accept_suggestions",
            chart_id: chart.chart.id,
          }),
        }),
        data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message || "Could not accept suggestions");
      setChart(data);
      onResult(
        `## Claim chart reviewed\n\n**${data.chart.title}** now has ${data.rows.filter((row) => row.review_status === "accepted").length}/${data.rows.length} accepted evidence mappings.`,
        {
          task_class:
            data.chart.chart_type === "prior_art"
              ? "PATENT_PRIOR_ART_CHART"
              : "PATENT_INFRINGEMENT_CHART",
          specialists: [
            "Sally Patents",
            "Sally Evidence",
            "Sally Verification",
          ],
          source_basis: "reviewed_matter_sources",
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    setOpen(false);
    setChart(null);
    setError("");
  };
  return (
    <>
      <div className="claimChartLaunch">
        <button onClick={() => setOpen(true)}>
          <FileSearch />
          Build claim chart
        </button>
      </div>
      {open && (
        <div
          className="ipToolOverlay"
          onMouseDown={(event) =>
            event.target === event.currentTarget && close()
          }
        >
          <section className="ipToolModal claimChartModal">
            <header>
              <div>
                <span>SALLY PATENTS / EVIDENCE</span>
                <h2>
                  {chart ? chart.chart.title : "Evidence-backed claim chart"}
                </h2>
              </div>
              <button type="button" onClick={close}>
                <X />
              </button>
            </header>
            {!matterId ? (
              <div className="ipToolError">
                Select or create a matter before building a claim chart.
              </div>
            ) : chart ? (
              <>
                <div className="claimChartMeta">
                  <span>{chart.chart.chart_type.replace("_", " ")}</span>
                  <span>Claim {chart.chart.claim_number}</span>
                  <span>{chart.chart.status}</span>
                  <button
                    className="acceptSuggestedMappings"
                    disabled={
                      busy ||
                      !chart.rows.some(
                        (row) =>
                          row.evidence_passage_id &&
                          row.review_status !== "accepted",
                      )
                    }
                    onClick={acceptSuggestions}
                  >
                    <Sparkles />
                    {busy ? "Saving…" : "Accept all suggested mappings"}
                  </button>
                </div>
                <div className="claimChartRows">
                  {chart.rows.map((row) => (
                    <article key={row.id}>
                      <div className="claimElement">
                        <b>{row.ordinal}</b>
                        <p>{row.element_text}</p>
                      </div>
                      <div className="candidateEvidence">
                        <span>
                          {row.evidence_passage_id
                            ? "CANDIDATE EVIDENCE"
                            : "EVIDENCE GAP"}
                        </span>
                        {row.evidence_passage_id ? (
                          <>
                            <strong>
                              {row.source_title} · {row.locator_type}{" "}
                              {row.locator}
                            </strong>
                            <p>{row.evidence_content}</p>
                            <small>
                              {row.verified_at
                                ? "Source marked verified"
                                : "Source has not been independently verified"}
                            </small>
                          </>
                        ) : (
                          <p>
                            No matter passage had sufficient lexical overlap.
                            Upload or retrieve evidence before mapping this
                            limitation.
                          </p>
                        )}
                      </div>
                      <div className="claimReviewControls">
                        <select
                          value={row.mapping_status}
                          onChange={(e) =>
                            changeRow(row.id, "mapping_status", e.target.value)
                          }
                        >
                          <option value="unmapped">Unmapped</option>
                          <option value="mapped">Mapped</option>
                          <option value="partial">Partial</option>
                          <option value="missing">Missing</option>
                          <option value="disputed">Disputed</option>
                        </select>
                        <select
                          value={row.review_status}
                          onChange={(e) =>
                            changeRow(row.id, "review_status", e.target.value)
                          }
                        >
                          <option value="unreviewed">Unreviewed</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                          <option value="needs_evidence">Needs evidence</option>
                        </select>
                        <textarea
                          value={row.comments || ""}
                          onChange={(e) =>
                            changeRow(row.id, "comments", e.target.value)
                          }
                          placeholder="Lawyer analysis and qualification"
                        />
                        <button disabled={busy} onClick={() => saveRow(row)}>
                          <Check />
                          Save review
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={create}>
                <label>
                  Parsed claim
                  <select
                    required
                    value={form.claim_id}
                    onChange={(e) =>
                      setForm({ ...form, claim_id: e.target.value })
                    }
                  >
                    <option value="">Select a parsed claim</option>
                    {inputs.claims.map((claim) => (
                      <option key={claim.id} value={claim.id}>
                        {claim.patent_name} · claim {claim.claim_number} (
                        {claim.claim_type})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ipToolGrid">
                  <label>
                    Chart type
                    <select
                      value={form.chart_type}
                      onChange={(e) =>
                        setForm({ ...form, chart_type: e.target.value })
                      }
                    >
                      <option value="infringement">Infringement</option>
                      <option value="prior_art">Prior art</option>
                    </select>
                  </label>
                  <label>
                    Jurisdiction
                    <input
                      value={form.jurisdiction}
                      onChange={(e) =>
                        setForm({ ...form, jurisdiction: e.target.value })
                      }
                      placeholder="Germany / EPO / US"
                    />
                  </label>
                </div>
                <label>
                  {form.chart_type === "prior_art"
                    ? "Prior-art reference"
                    : "Accused product"}
                  <input
                    required
                    value={form.target_name}
                    onChange={(e) =>
                      setForm({ ...form, target_name: e.target.value })
                    }
                    placeholder={
                      form.chart_type === "prior_art"
                        ? "Reference title or publication"
                        : "Product or process name"
                    }
                  />
                </label>
                {inputs.charts.length > 0 && (
                  <label>
                    Or reopen a chart
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        e.target.value && loadChart(e.target.value)
                      }
                    >
                      <option value="">Select existing chart</option>
                      {inputs.charts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} · {item.accepted_count}/{item.row_count}{" "}
                          accepted
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p className="officialSearchNote">
                  Sally may attach candidate passages, but all rows remain
                  unmapped until a reviewer records the legal mapping.
                </p>
                <footer>
                  <span>
                    <ShieldCheck />
                    Matter-scoped with review history
                  </span>
                  <button disabled={busy || !inputs.claims.length}>
                    {busy ? "Preparing…" : "Create chart"}
                  </button>
                </footer>
              </form>
            )}
            {!chart && inputs.claims.length === 0 && !busy && (
              <div className="claimChartEmpty">
                Parse patent claims first, then return here to build the chart.
              </div>
            )}
            {error && <div className="ipToolError">{error}</div>}
          </section>
        </div>
      )}
    </>
  );
}
