// Harvests PUBLIC ground truth for benchmarks/patent_retrieval_v1.
// Two phases: (A) seed queries -> XHR top hits; (B) expand via DOCDB family
// members of harvested cases (each independently fetched + verified).
// Resume-capable via harvest-state.json. Polite: long gaps, identifying UA.
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const UA = { 'User-Agent': 'SallyIP-bench/1.0 (public-data research harvest)' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const QUERIES = ['vacuum cleaner', 'drone propeller guard', 'solar panel mounting bracket', 'bicycle gear shifting', 'surgical stapler', 'lithium battery separator', 'hearing aid feedback cancellation', 'irrigation drip valve'];
const TARGET = 50;
const SESSION_LIMIT = 18; // per-session cap to avoid re-triggering throttle (task: +15-20 new cases max)
const STATE_FILE = 'benchmarks/patent_retrieval_v1/harvest-state.json';
const DATASET_FILE = 'benchmarks/patent_retrieval_v1/dataset.json';

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`XHR ${res.status}`);
  return res.json();
}
async function getHtml(pub) {
  const res = await fetch(`https://patents.google.com/patent/${pub}/en`, { headers: UA });
  if (!res.ok) throw new Error(`page ${res.status} for ${pub}`);
  return res.text();
}
const metaAll = (html, name) => [...html.matchAll(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'gi'))].map(m => m[1].trim()).filter(Boolean);

function parsePage(html) {
  const title = (metaAll(html, 'DC.title')[0] || metaAll(html, 'DC.title')[0] || '').slice(0, 250);
  const dates = metaAll(html, 'DC.date');
  const contributors = metaAll(html, 'DC.contributor');
  const appNo = (metaAll(html, 'citation_patent_application_number')[0] || '').replace(/^.*:/, '');
  const relations = metaAll(html, 'DC.relation').filter(v => /^[A-Z]{2}:?\d/i.test(v));
  const backwardRefs = [...new Set(relations.map(v => v.replace(/:/g, '').replace(/\s+/g, '')))].filter(v => /^(US|EP|WO|GB|CN|JP|KR|DE|FR|CA|AU)\d+[A-Z]?\d?$/.test(v)).slice(0, 20);
  const family = [];
  for (const m of html.matchAll(/itemprop="publicationNumber">([A-Z]{2}\d+[A-Z]\d?)<\/span>[\s\S]{0,300}?itemprop="publicationDate">(\d{4}-\d{2}-\d{2})/g)) {
    if (!family.some(f => f.number === m[1])) family.push({ number: m[1], publication_date: m[2] });
  }
  const prio = html.match(/priorit[^<>]{0,80}?(\d{4}-\d{2}-\d{2})/i);
  return { title, dates, contributors, appNo, backwardRefs, family: family.slice(0, 30), priority_date: prio ? prio[1] : null };
}

async function loadState() {
  try { return JSON.parse(await readFile(STATE_FILE, 'utf8')); }
  catch { return { queue: [], done: [], items: [] }; }
}

const state = await loadState();
const seen = new Set(state.done);
const items = state.items;
const KNOWN_GOOD = ['EP3454709B1', 'US20170158320A1', 'CN211908729U', 'RU2463195C1', 'US10952730B2', 'US10319978B2', 'EP2023664B1', 'KR102256529B1'];
if (!state.done.length && !state.queue.length) {
  // Bootstrap from individually-verified publications (XHR search is throttled).
  for (const pub of KNOWN_GOOD) state.queue.push({ pub, query: 'bootstrap seed' });
}

// Phase A: seed one fresh query per run (gentle), then Phase B expansion.
if (!state.seedsDone) {
  const remaining = QUERIES.filter(q => !(state.queried || []).includes(q));
  const query = remaining[0];
  if (query) {
    try {
      const data = await getJson(`https://patents.google.com/xhr/query?url=${encodeURIComponent(`q=${query}&language=ENGLISH&type=PATENT`)}&exp=`);
      const clusters = data?.results?.cluster || [];
      console.log(`seed query "${query}": ${clusters.length} clusters`);
      for (const c of clusters) {
        const pub = c?.result?.[0]?.patent?.publication_number;
        if (pub && !seen.has(pub)) state.queue.push({ pub, query });
      }
      state.queried = [...(state.queried || []), query];
    } catch (e) { console.log(`seed query failed: ${e.message.slice(0, 80)}`); }
    await sleep(25000);
  } else state.seedsDone = true;
}

async function harvestOne(pub, query) {
  const html = await getHtml(pub);
  const parsed = parsePage(html);
  const item = {
    test_id: `ret-${String(items.length + 1).padStart(3, '0')}`,
    query, target_publication: pub,
    title: parsed.title,
    publication_date: parsed.dates[1] || parsed.dates[0] || null,
    filing_date: parsed.dates[0] || null,
    priority_date: parsed.priority_date,
    inventors: parsed.contributors.filter(c => !/LLC|Inc|GmbH|Ltd|Corp|Gmb|AB\b|Co\.|AG\b|KK|S\.A\.|L\.L\.C/i.test(c)).slice(0, 12),
    assignee: parsed.contributors.find(c => /LLC|Inc|GmbH|Ltd|Corp|Gmb|AB\b|Co\.|AG\b|KK|S\.A\.|L\.L\.C/i.test(c)) || null,
    expected_family_members: parsed.family.map(f => f.number),
    expected_family_dates: Object.fromEntries(parsed.family.map(f => [f.number, f.publication_date])),
    expected_backward_refs: parsed.backwardRefs,
    expected_country: pub.slice(0, 2),
    source_url: `https://patents.google.com/patent/${pub}/en`,
    ground_truth_confidence: parsed.family.length >= 2 ? 'A' : 'B',
    jurisdiction: pub.slice(0, 2),
  };
  // Phase B fuel: family members become candidates.
  for (const f of parsed.family) {
    if (!seen.has(f.number) && !state.queue.some(q => q.pub === f.number)) state.queue.push({ pub: f.number, query: query + ' (family expansion)' });
  }
  return item;
}

let fetched = 0;
const START_COUNT = items.length;
while (items.length < TARGET && state.queue.length && (items.length - START_COUNT) < SESSION_LIMIT) {
  const next = state.queue.shift();
  if (seen.has(next.pub)) continue;
  seen.add(next.pub);
  try {
    const item = await harvestOne(next.pub, next.query);
    // Honesty gate: every number/date must come from a fetched page; skip incomplete cases.
    if (!item.title || !item.publication_date || !item.filing_date || !item.expected_family_members.length) {
      console.log(`SKIP incomplete ${next.pub}: title=${!!item.title} pubdate=${item.publication_date} filing=${item.filing_date} fam=${item.expected_family_members.length}`);
      state.done.push(next.pub);
    } else {
      state.done.push(next.pub);
      items.push(item);
      fetched++;
      console.log(`+ ${next.pub} fam=${item.expected_family_members.length} refs=${item.expected_backward_refs.length} total=${items.length}`);
    }
  } catch (e) { console.log(`SKIP ${next.pub}: ${e.message.slice(0, 80)}`); }
  await mkdir('benchmarks/patent_retrieval_v1', { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify({ queue: state.queue.slice(0, 400), done: state.done, queried: state.queried || [], seedsDone: state.seedsDone, items }, null, 1));
  if (items.length) {
    await writeFile(DATASET_FILE, JSON.stringify({ version: 'v1-frozen', frozen_at: new Date().toISOString(), source: 'Google Patents public pages (aggregated official office data); each case links its source URL', items }, null, 1));
  }
  await sleep(25000);
}
console.log(`CASES:${items.length} QUEUE:${state.queue.length} FETCHED_THIS_RUN:${fetched}`);
