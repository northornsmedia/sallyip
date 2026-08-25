import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SallyIP Brain Observatory — /accessadmin
// Live wire visualization of the multi-engine orchestration brain.

const ENGINE_COLORS = {
  "nvidia/nemotron-3.5-lightning:free": "#76b900",
  "google/gemma-4-26b-a4b-it:free": "#4285f4",
  "stealth/ox-alpha": "#a855f7",
  "liquid/lfm-2.5-2.6b:free": "#00c7b1",
  "auto/best-fast": "#ff4d6d",
  "openrouter/google/gemini-3.5-flash-lite": "#ff4d6d",
};
const ENGINE_SHORT = {
  "nvidia/nemotron-3.5-lightning:free": "NEMOTRON",
  "google/gemma-4-26b-a4b-it:free": "GEMMA",
  "stealth/ox-alpha": "OX·ALPHA",
  "liquid/lfm-2.5-2.6b:free": "LIQUID",
  "auto/best-fast": "OMNI·ROUTE",
  "openrouter/google/gemini-3.5-flash-lite": "OMNI·ROUTE",
};
const engineColor = (slug) => ENGINE_COLORS[slug] || "#8899aa";
const shortName = (slug) =>
  ENGINE_SHORT[slug] || slug.split("/")[1]?.split(":")[0]?.toUpperCase() || slug;

export default function BrainAdminPage({ onHome }) {
  const [authed, setAuthed] = useState(null); // null = checking
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [overview, setOverview] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [liveMode, setLiveMode] = useState(true);
  const timerRef = useRef(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) return;
      setOverview(await res.json());
      setAuthed(true);
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/admin/overview").then((res) => setAuthed(res.ok)).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadOverview();
    if (!liveMode || selectedTrace) return;
    timerRef.current = setInterval(loadOverview, 4000);
    return () => clearInterval(timerRef.current);
  }, [authed, liveMode, selectedTrace, loadOverview]);

  const login = async (e) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    if (res.ok) setAuthed(true);
    else setLoginError((await res.json().catch(() => ({})))?.error?.message || "Access denied");
  };

  const openTrace = async (id) => {
    const res = await fetch(`/api/admin/trace?id=${id}`);
    if (res.ok) setSelectedTrace(await res.json());
  };

  if (authed === null)
    return (
      <div className="brainWrap"><div className="brainBoot">INITIALIZING NEURAL LINK…</div></div>
    );

  if (!authed)
    return (
      <div className="brainWrap">
        <form className="brainLogin" onSubmit={login}>
          <div className="brainLogo">◉</div>
          <h1>SALLY BRAIN OBSERVATORY</h1>
          <p className="brainSub">Restricted — owners &amp; administrators only</p>
          <input placeholder="Username" value={creds.username} onChange={(e) => setCreds({ ...creds, username: e.target.value })} autoFocus />
          <input placeholder="Password" type="password" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} />
          {loginError && <div className="brainError">{loginError}</div>}
          <button type="submit">ENTER THE BRAIN</button>
          {onHome && <button type="button" className="brainLink" onClick={onHome}>← back to SallyIP</button>}
        </form>
      </div>
    );

  const totals = overview?.totals || {};
  const engines = overview?.engines || [];
  const traces = overview?.recent_traces || [];
  const maxWeight = Math.max(...engines.map((e) => e.base_weight), 1);
  const maxCalls = Math.max(...engines.map((e) => e.successes + e.failures), 1);

  return (
    <div className="brainWrap">
      <header className="brainHeader">
        <div>
          <span className="brainPulse">◉</span>
          <h1>SALLY BRAIN OBSERVATORY</h1>
          <small>neural control · live wire telemetry</small>
        </div>
        <div className="brainHeaderActions">
          <label className="brainLive">
            <input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} /> LIVE
          </label>
          <button onClick={onHome} className="brainLink">Exit</button>
        </div>
      </header>

      {/* ===== KPI strip ===== */}
      <section className="brainKpis">
        <Kpi label="REQUESTS / 24H" value={totals.total_requests ?? 0} />
        <Kpi label="AVG LATENCY" value={`${totals.avg_latency_ms ?? 0}ms`} />
        <Kpi label="ENGINE SUCCESS" value={`${totals.engine_success_pct ?? 0}%`} accent={(totals.engine_success_pct ?? 0) >= 60 ? "good" : "warn"} />
        <Kpi label="OX-ALPHA RESCUES" value={totals.rescues ?? 0} accent={(totals.rescues ?? 0) > 0 ? "rescue" : undefined} />
      </section>

      {/* ===== Neural wire graph ===== */}
      <section className="brainGraphCard">
        <h2>NEURAL WIRE MAP <small>core → parallel engines → synthesis → answer</small></h2>
        <BrainGraph engines={engines} latestTrace={traces[0]} maxWeight={maxWeight} />
      </section>

      {/* ===== Engine health table ===== */}
      <section className="brainTableCard">
        <h2>ENGINE HEALTH <small>adaptive self-tuning weights</small></h2>
        <table className="brainTable">
          <thead><tr><th>ENGINE</th><th>SUCCESS</th><th>FAIL</th><th>FAST-FAIL</th><th>TIMEOUT</th><th>P50 LATENCY</th><th>ADAPTIVE WEIGHT</th><th>LAST SUCCESS</th></tr></thead>
          <tbody>
            {engines.map((e) => {
              const total = e.successes + e.failures;
              const p50 = total > 0 && e.latency_sum_ms > 0 ? `${Math.round(e.latency_sum_ms / total)}ms*` : "—";
              const rate = total ? Math.round((e.successes / total) * 100) : null;
              return (
                <tr key={e.engine_slug}>
                  <td><span className="engineDot" style={{ background: engineColor(e.engine_slug) }} />{shortName(e.engine_slug)}</td>
                  <td>{rate === null ? "—" : `${rate}%`}</td>
                  <td className="dim">{e.failures}</td>
                  <td className="dim">{e.fast_fails}</td>
                  <td className="dim">{e.timeouts}</td>
                  <td className="dim">{p50}</td>
                  <td>
                    <div className="weightBar"><div style={{ width: `${Math.min(100, (e.adaptive_weight / maxWeight) * 100)}%`, background: engineColor(e.engine_slug) }} /></div>
                    <small>{Number(e.adaptive_weight).toFixed(1)}</small>
                  </td>
                  <td className="dim">{e.last_success_at ? new Date(e.last_success_at).toLocaleTimeString() : "never"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <small className="footNote">* mean latency per call · weights auto-adjust from live success-rate + speed</small>
      </section>

      {/* ===== Wire trace log ===== */}
      <section className="brainTraces">
        <h2>WIRE TRACES <small>click a request to replay its neural path</small></h2>
        <div className="traceList">
          <AnimatePresence initial={false}>
            {traces.map((t) => (
              <motion.button key={t.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="traceRow" onClick={() => openTrace(t.id)}>
                <span className={`traceStatus ${t.engines_completed > 0 ? "ok" : "bad"}`}>{t.engines_completed}/{t.engines_requested}</span>
                <span className="tracePrompt">{t.prompt_excerpt?.slice(0, 70) || "(no prompt)"}</span>
                {t.rescue_used && <span className="rescueBadge">RESCUE</span>}
                <span className="traceLatency">{t.total_latency_ms}ms</span>
                <span className="traceTime">{new Date(t.created_at).toLocaleTimeString()}</span>
              </motion.button>
            ))}
          </AnimatePresence>
          {!traces.length && <div className="traceEmpty">No requests yet — send Sally a message and watch the wires light up.</div>}
        </div>
      </section>

      {/* ===== Trace detail modal ===== */}
      <AnimatePresence>
        {selectedTrace && (
          <motion.div className="brainModalBackdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTrace(null)}>
            <motion.div className="brainModal" initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <h3>NEURAL PATH REPLAY</h3>
              <p className="modalPrompt">“{selectedTrace.prompt_excerpt}”</p>
              <WireReplay events={selectedTrace.events || []} />
              <p className="modalAnswer">{selectedTrace.answer_excerpt}…</p>
              <button onClick={() => setSelectedTrace(null)}>CLOSE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className={`kpi ${accent || ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function BrainGraph({ engines, latestTrace, maxWeight }) {
  // Animated SVG: core node left, engine nodes right, wires pulse when the latest trace used them.
  const usedEngines = new Set(
    (latestTrace?.events || []).filter((ev) => ev.label === "node" && ev.status === "success")
      .map((ev) => ev.detail.split(" responded")[0])
  );
  const rescueUsed = latestTrace?.rescue_used;
  const H = 60 + engines.length * 64;
  const coreY = H / 2;
  return (
    <svg viewBox={`0 0 720 ${H}`} className="brainSvg">
      <defs>
        <radialGradient id="coreGlow"><stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15" /></radialGradient>
      </defs>
      {/* Core */}
      <circle cx="90" cy={coreY} r="34" fill="url(#coreGlow)" stroke="#a78bfa" strokeWidth="1.5" className="coreNode" />
      <text x="90" y={coreY - 4} textAnchor="middle" className="svgLabel">SALLY</text>
      <text x="90" y={coreY + 10} textAnchor="middle" className="svgSubLabel">CORE</text>
      {engines.map((e, i) => {
        const y = 44 + i * 64;
        const color = engineColor(e.engine_slug);
        const active = usedEngines.has(e.name) || (rescueUsed && e.engine_slug === "stealth/ox-alpha");
        const isOx = e.engine_slug === "stealth/ox-alpha";
        return (
          <g key={e.engine_slug}>
            <path d={`M 128 ${coreY} C 300 ${coreY}, 420 ${y}, 560 ${y}`} fill="none" stroke={color} strokeWidth={active ? 2.5 : 1} strokeOpacity={active ? 0.95 : 0.22} className={active ? "wireActive" : "wireIdle"} />
            {active && <circle r="4" fill={color} cx="560" cy={y}><animateMotion dur="1.6s" repeatCount="indefinite" path={`M 128 ${coreY} C 300 ${coreY}, 420 ${y}, 560 ${y}`} /></circle>}
            <rect x="565" y={y - 18} width="140" height="36" rx="8" fill="#12141c" stroke={color} strokeOpacity={active ? 0.9 : 0.3} />
            <text x="572" y={y - 4} className="svgEngineName" fill={color}>{isOx ? "OX·ALPHA ⛨" : shortName(e.engine_slug)}</text>
            <text x="572" y={y + 10} className="svgEngineMeta" fill="#667">{e.successes}✓ {e.failures}✗ · w{Math.round(e.adaptive_weight)}</text>
          </g>
        );
      })}
      {/* Synthesis node */}
      <path d={`M 90 ${coreY + 40} L 90 ${H - 24}`} stroke="#a78bfa" strokeOpacity="0.4" />
      <rect x="30" y={H - 46} width="120" height="32" rx="8" fill="#171225" stroke="#a78bfa" strokeOpacity="0.5" />
      <text x="90" y={H - 25} textAnchor="middle" className="svgSubLabel">SYNTHESIS → USER</text>
    </svg>
  );
}

function WireReplay({ events }) {
  const t0 = events[0]?.t || 0;
  return (
    <ol className="wireReplay">
      {events.map((ev, i) => {
        const kindIcon = { wire: "🔌", node: "⚡", rescue: "⛨", request: "📨", response: "📤", synthesis: "🧬", error: "💥" }[ev.label] || "•";
        return (
          <li key={i} className={`replayEvent ${ev.status}`}>
            <span className="replayIcon">{kindIcon}</span>
            <span className="replayDetail">{ev.detail}</span>
            <span className="replayT">+{((ev.t - t0) / 1000).toFixed(1)}s</span>
          </li>
        );
      })}
    </ol>
  );
}
