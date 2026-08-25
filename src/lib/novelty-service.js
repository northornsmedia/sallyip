const FRAMEWORKS = {
  EPO: "Article 54 EPC: one earlier disclosure must directly and unambiguously disclose every claim limitation in an enabling manner.",
  UK: "UK novelty: one prior disclosure must contain clear and unmistakable directions that enable the claimed invention; do not mosaic references.",
  US: "35 U.S.C. § 102: one prior-art reference must disclose every claim element, arranged as claimed, with enabling disclosure.",
};
const clean = (value, max) =>
  String(value || "")
    .trim()
    .slice(0, max) || null;
export function noveltyFramework(jurisdiction = "") {
  const key = /\b(epo|epc|european)\b/i.test(jurisdiction)
    ? "EPO"
    : /\b(uk|united kingdom|england|wales)\b/i.test(jurisdiction)
      ? "UK"
      : /\b(us|usa|united states|uspto)\b/i.test(jurisdiction)
        ? "US"
        : null;
  return {
    framework: key || "UNRESOLVED",
    legal_test: key
      ? FRAMEWORKS[key]
      : "Jurisdiction-specific novelty standard must be selected and verified before acceptance.",
  };
}

async function analysisForUser(sql, userId, id) {
  const [analysis] =
    await sql`SELECT a.*,p.patent_entity_id target_patent_entity_id,p.critical_date,pc.claim_number,pc.claim_text,target.name target_patent_name,target.canonical_identifier target_publication,ref.name reference_title,ref.canonical_identifier reference_publication,c.publication_date,c.timing_status,c.review_status candidate_review_status FROM patent_novelty_analyses a JOIN prior_art_projects p ON p.id=a.prior_art_project_id JOIN patent_claims pc ON pc.id=a.claim_id JOIN prior_art_candidates c ON c.id=a.candidate_id JOIN ip_entities target ON target.id=p.patent_entity_id JOIN ip_entities ref ON ref.id=c.patent_entity_id WHERE a.id=${id} AND a.user_id=${userId}`;
  if (!analysis) throw new Error("Novelty analysis not found");
  return analysis;
}

export async function listNoveltyInputs(sql, userId, matterId) {
  const [matter] =
    await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;
  if (!matter) throw new Error("Matter not found");
  const projects =
      await sql`SELECT p.id,p.title,p.jurisdiction,p.critical_date,p.claim_id,pc.claim_number,e.name patent_name,e.canonical_identifier,count(c.id)::int candidate_count FROM prior_art_projects p JOIN patent_claims pc ON pc.id=p.claim_id JOIN ip_entities e ON e.id=p.patent_entity_id LEFT JOIN prior_art_candidates c ON c.project_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matterId} GROUP BY p.id,pc.claim_number,e.name,e.canonical_identifier ORDER BY p.updated_at DESC`,
    candidates = projects.length
      ? await sql`SELECT c.id,c.project_id,c.publication_date,c.timing_status,c.claim_coverage,c.novelty_status,c.review_status,e.name reference_title,e.canonical_identifier publication_number FROM prior_art_candidates c JOIN prior_art_projects p ON p.id=c.project_id JOIN ip_entities e ON e.id=c.patent_entity_id WHERE p.user_id=${userId} AND p.matter_id=${matterId} ORDER BY c.quality_score DESC`
      : [],
    analyses =
      await sql`SELECT a.id,a.title,a.jurisdiction,a.conclusion,a.review_status,a.updated_at,target.canonical_identifier target_publication,ref.canonical_identifier reference_publication,pc.claim_number FROM patent_novelty_analyses a JOIN patent_claims pc ON pc.id=a.claim_id JOIN prior_art_candidates c ON c.id=a.candidate_id JOIN prior_art_projects p ON p.id=a.prior_art_project_id JOIN ip_entities target ON target.id=p.patent_entity_id JOIN ip_entities ref ON ref.id=c.patent_entity_id WHERE a.user_id=${userId} AND a.matter_id=${matterId} ORDER BY a.updated_at DESC`;
  return { projects, candidates, analyses };
}

export async function getNoveltyAnalysis(sql, userId, id) {
  const analysis = await analysisForUser(sql, userId, id),
    mappings =
      await sql`SELECT m.*,e.ordinal,e.element_text,sp.locator_type,sp.locator,left(sp.content,900) evidence_content,s.id source_id,s.title source_title,s.citation,s.official_url,s.authority_tier,s.verified_at FROM prior_art_element_mappings m JOIN patent_claim_elements e ON e.id=m.claim_element_id LEFT JOIN source_passages sp ON sp.id=m.evidence_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE m.candidate_id=${analysis.candidate_id} ORDER BY e.ordinal`,
    passages =
      await sql`SELECT s.id source_id,sp.id passage_id,sp.locator_type,sp.locator,left(sp.content,700) content,s.title source_title,s.citation,s.source_type,s.authority_tier,s.jurisdiction,s.verified_at FROM legal_sources s JOIN source_passages sp ON sp.source_id=s.id WHERE s.user_id=${userId} AND s.matter_id=${analysis.matter_id} ORDER BY s.authority_tier,s.created_at DESC LIMIT 800`,
    events =
      await sql`SELECT * FROM patent_novelty_review_events WHERE analysis_id=${analysis.id} ORDER BY created_at DESC LIMIT 100`;
  const disclosed = mappings.filter(
      (m) =>
        m.review_status === "accepted" &&
        ["explicit", "implicit"].includes(m.disclosure_status) &&
        m.verified_at,
    ).length,
    missing = mappings.filter(
      (m) =>
        m.review_status === "accepted" &&
        ["not_found", "disputed"].includes(m.disclosure_status),
    ).length;
  return {
    analysis,
    mappings,
    passages,
    events,
    gaps: {
      total_elements: mappings.length,
      verified_disclosures: disclosed,
      missing_or_disputed: missing,
      unreviewed: mappings.filter((m) => m.review_status !== "accepted").length,
      unknown_timing: analysis.timing_status !== "pre_critical",
      authority_unverified: !analysis.governing_authority_passage_id,
      reference_source_unverified: !analysis.reference_source_id,
    },
  };
}

export async function createNoveltyAnalysis(sql, userId, body) {
  const [project] =
    await sql`SELECT p.*,pc.claim_number FROM prior_art_projects p JOIN patent_claims pc ON pc.id=p.claim_id WHERE p.id=${body.prior_art_project_id} AND p.user_id=${userId}`;
  if (!project) throw new Error("Claim-scoped prior-art project not found");
  const [candidate] =
    await sql`SELECT c.id,c.patent_entity_id,e.name,e.canonical_identifier FROM prior_art_candidates c JOIN ip_entities e ON e.id=c.patent_entity_id WHERE c.id=${body.candidate_id} AND c.project_id=${project.id}`;
  if (!candidate) throw new Error("Single novelty reference not found");
  const framework = noveltyFramework(
      body.jurisdiction || project.jurisdiction || "",
    ),
    [analysis] =
      await sql`INSERT INTO patent_novelty_analyses(user_id,matter_id,prior_art_project_id,claim_id,candidate_id,title,jurisdiction,legal_test) VALUES(${userId},${project.matter_id},${project.id},${project.claim_id},${candidate.id},${clean(body.title, 300) || `Claim ${project.claim_number} novelty over ${candidate.canonical_identifier || candidate.name}`},${body.jurisdiction || project.jurisdiction || "Unresolved"},${clean(body.legal_test, 4000) || framework.legal_test}) RETURNING id`;
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data) VALUES(${userId},${project.matter_id},${candidate.patent_entity_id},'ASSESSES_NOVELTY_OF',${project.patent_entity_id},${JSON.stringify({ analysis_id: analysis.id, claim_id: project.claim_id, candidate_id: candidate.id })}::jsonb) ON CONFLICT DO NOTHING`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}

export async function reviewNoveltyMapping(sql, userId, body) {
  const [analysis] =
    await sql`SELECT a.id,a.review_status,a.matter_id FROM patent_novelty_analyses a JOIN prior_art_element_mappings m ON m.candidate_id=a.candidate_id WHERE a.id=${body.analysis_id} AND m.id=${body.mapping_id} AND a.user_id=${userId}`;
  if (!analysis) throw new Error("Novelty mapping not found");
  if (analysis.review_status === "accepted")
    throw new Error(
      "Accepted novelty analysis must be reopened before mappings change",
    );
  const disclosure = [
      "unreviewed",
      "explicit",
      "implicit",
      "not_found",
      "disputed",
    ].includes(body.disclosure_status)
      ? body.disclosure_status
      : null,
    review = ["unreviewed", "accepted", "rejected", "needs_evidence"].includes(
      body.review_status,
    )
      ? body.review_status
      : null;
  if (!disclosure || !review) throw new Error("Invalid novelty mapping review");
  const evidence = body.evidence_passage_id || null;
  if (["explicit", "implicit"].includes(disclosure) && !evidence)
    throw new Error(
      "Disclosure requires pinpoint evidence from this reference",
    );
  if (evidence) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${evidence} AND s.user_id=${userId} AND s.matter_id=${analysis.matter_id}`;
    if (!passage) throw new Error("Matter evidence passage not found");
  }
  await sql`UPDATE prior_art_element_mappings SET disclosure_status=${disclosure},review_status=${review},evidence_passage_id=${evidence},confidence=${body.confidence == null ? null : Math.min(1, Math.max(0, Number(body.confidence)))},note=${clean(body.note, 4000)},reviewed_at=${review === "unreviewed" ? null : new Date()} WHERE id=${body.mapping_id}`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}

export async function finalizeNoveltyAnalysis(sql, userId, body) {
  const analysis = await analysisForUser(sql, userId, body.analysis_id);
  if (
    !["draft", "in_review", "accepted", "reopened"].includes(
      body.review_status,
    ) ||
    ![
      "unreviewed",
      "anticipated",
      "not_anticipated",
      "insufficient_evidence",
    ].includes(body.conclusion)
  )
    throw new Error("Invalid novelty review state");
  if (body.governing_authority_passage_id) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.governing_authority_passage_id} AND s.user_id=${userId} AND s.matter_id=${analysis.matter_id}`;
    if (!passage) throw new Error("Governing authority passage not found");
  }
  if (body.reference_source_id) {
    const [source] =
      await sql`SELECT id FROM legal_sources WHERE id=${body.reference_source_id} AND user_id=${userId} AND matter_id=${analysis.matter_id}`;
    if (!source) throw new Error("Selected-reference source record not found");
  }
  await sql`UPDATE patent_novelty_analyses SET reference_source_id=${body.reference_source_id || null},governing_authority_passage_id=${body.governing_authority_passage_id || null},direct_and_unambiguous=${body.direct_and_unambiguous === true},enabling_disclosure=${body.enabling_disclosure === true},public_availability_checked=${body.public_availability_checked === true},conclusion=${body.conclusion},conclusion_note=${clean(body.conclusion_note, 8000)},review_status=${body.review_status},updated_at=now() WHERE id=${analysis.id}`;
  if (body.review_status === "accepted") {
    const noveltyStatus =
      body.conclusion === "anticipated"
        ? "potentially_anticipates"
        : body.conclusion === "not_anticipated"
          ? "does_not_anticipate"
          : "insufficient_evidence";
    await sql`UPDATE prior_art_candidates SET novelty_status=${noveltyStatus},review_status='accepted',review_note=${clean(body.conclusion_note, 4000)},reviewed_at=now() WHERE id=${analysis.candidate_id}`;
  } else if (body.review_status === "reopened") {
    await sql`UPDATE prior_art_candidates SET novelty_status='unreviewed',review_status='needs_research',review_note='Novelty analysis reopened',reviewed_at=now() WHERE id=${analysis.candidate_id}`;
  }
  await sql`INSERT INTO patent_novelty_review_events(user_id,analysis_id,action,previous_status,new_status,note) VALUES(${userId},${analysis.id},'analysis_review',${analysis.review_status},${body.review_status},${clean(body.conclusion_note, 1000)})`;
  return getNoveltyAnalysis(sql, userId, analysis.id);
}
