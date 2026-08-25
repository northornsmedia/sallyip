const CHANNELS = [
  "translation",
  "transliteration",
  "phonetic",
  "conceptual",
  "regional_meaning",
];
const clean = (value, max) =>
  String(value || "")
    .trim()
    .slice(0, max) || null;
export function detectWritingSystem(value) {
  const text = String(value || "");
  if (/[\u0600-\u06ff]/u.test(text)) return "Arabic";
  if (/[\u0400-\u04ff]/u.test(text)) return "Cyrillic";
  if (/[\uac00-\ud7af]/u.test(text)) return "Korean";
  if (/[\u3040-\u30ff]/u.test(text)) return "Japanese";
  if (/[\u3400-\u9fff]/u.test(text)) return "Han";
  return "Latin";
}
export function buildTrademarkSearchSet(baseMark, variants) {
  return [
    ...new Set(
      [
        String(baseMark || "").trim(),
        ...(variants || [])
          .filter((v) => v.review_status === "accepted")
          .map((v) => String(v.variant_text || "").trim()),
      ]
        .filter(Boolean)
        .map((value) => value.normalize("NFKC")),
    ),
  ];
}
async function projectForUser(sql, userId, id) {
  const [project] =
    await sql`SELECT p.*,m.name mark_name FROM trademark_intelligence_projects p JOIN ip_entities m ON m.id=p.mark_entity_id WHERE p.id=${id} AND p.user_id=${userId}`;
  if (!project) throw new Error("Trademark intelligence project not found");
  return project;
}
async function assertMatterPassage(
  sql,
  userId,
  matterId,
  passageId,
  message = "Matter source passage not found",
) {
  if (!passageId) return null;
  const [passage] =
    await sql`SELECT sp.id,s.verified_at,s.authority_tier FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${passageId} AND s.user_id=${userId} AND s.matter_id=${matterId}`;
  if (!passage) throw new Error(message);
  return passage;
}
export async function listTrademarkIntelligenceInputs(sql, userId, matterId) {
  const [matter] =
    await sql`SELECT id FROM matters WHERE id=${matterId} AND user_id=${userId}`;
  if (!matter) throw new Error("Matter not found");
  const marks =
      await sql`SELECT id,name,jurisdiction,data FROM ip_entities WHERE user_id=${userId} AND matter_id=${matterId} AND entity_type='trademark' ORDER BY updated_at DESC`,
    clearance =
      await sql`SELECT p.id,p.title,p.target_mark_entity_id,t.name target_mark FROM trademark_clearance_projects p JOIN ip_entities t ON t.id=p.target_mark_entity_id WHERE p.user_id=${userId} AND p.matter_id=${matterId} ORDER BY p.updated_at DESC`,
    projects =
      await sql`SELECT p.id,p.title,p.base_mark,p.jurisdictions,p.target_languages,p.review_status,p.updated_at,count(DISTINCT v.id)::int variant_count,count(DISTINCT g.id)::int goods_count FROM trademark_intelligence_projects p LEFT JOIN trademark_linguistic_variants v ON v.project_id=p.id LEFT JOIN trademark_goods_services_terms g ON g.project_id=p.id WHERE p.user_id=${userId} AND p.matter_id=${matterId} GROUP BY p.id ORDER BY p.updated_at DESC`;
  return { marks, clearance, projects };
}
export async function getTrademarkIntelligenceProject(sql, userId, id) {
  const project = await projectForUser(sql, userId, id),
    coverage =
      await sql`SELECT * FROM trademark_language_coverage WHERE project_id=${project.id} ORDER BY language,channel`,
    variants =
      await sql`SELECT v.*,sp.locator_type,sp.locator,s.title source_title,s.verified_at FROM trademark_linguistic_variants v LEFT JOIN source_passages sp ON sp.id=v.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE v.project_id=${project.id} ORDER BY v.language,v.variant_type,v.variant_text`,
    goods =
      await sql`SELECT g.*,sp.locator_type,sp.locator,s.title source_title,s.authority_tier,s.verified_at FROM trademark_goods_services_terms g LEFT JOIN source_passages sp ON sp.id=g.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE g.project_id=${project.id} ORDER BY g.jurisdiction,g.nice_class,g.created_at`,
    passages =
      await sql`SELECT sp.id passage_id,sp.locator_type,sp.locator,left(sp.content,700) content,s.title source_title,s.citation,s.source_type,s.authority_tier,s.jurisdiction,s.verified_at FROM legal_sources s JOIN source_passages sp ON sp.source_id=s.id WHERE s.user_id=${userId} AND s.matter_id=${project.matter_id} ORDER BY s.authority_tier,s.created_at DESC LIMIT 800`,
    events =
      await sql`SELECT * FROM trademark_intelligence_review_events WHERE project_id=${project.id} ORDER BY created_at DESC LIMIT 100`;
  return {
    project,
    coverage,
    variants,
    goods_terms: goods,
    passages,
    events,
    search_set: buildTrademarkSearchSet(project.base_mark, variants),
    gaps: {
      language_channels: coverage.filter(
        (c) =>
          c.required && !["completed", "not_applicable"].includes(c.status),
      ).length,
      variants_unreviewed: variants.filter(
        (v) => !["accepted", "rejected"].includes(v.review_status),
      ).length,
      goods_unaccepted: goods.filter((g) => g.review_status !== "accepted")
        .length,
    },
  };
}
export async function createTrademarkIntelligenceProject(sql, userId, body) {
  const [matter] =
    await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;
  if (!matter) throw new Error("Matter not found");
  const languages = [
    ...new Set(
      (Array.isArray(body.target_languages) ? body.target_languages : [])
        .map((v) => String(v).trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
  if (!languages.length)
    throw new Error("At least one target language is required");
  let mark,
    clearance = null;
  if (body.clearance_project_id) {
    [clearance] =
      await sql`SELECT p.id,p.target_mark_entity_id,t.name FROM trademark_clearance_projects p JOIN ip_entities t ON t.id=p.target_mark_entity_id WHERE p.id=${body.clearance_project_id} AND p.user_id=${userId} AND p.matter_id=${matter.id}`;
    if (!clearance) throw new Error("Clearance project not found");
    mark = { id: clearance.target_mark_entity_id, name: clearance.name };
  } else if (body.mark_entity_id)
    [mark] =
      await sql`SELECT id,name FROM ip_entities WHERE id=${body.mark_entity_id} AND user_id=${userId} AND matter_id=${matter.id} AND entity_type='trademark'`;
  else {
    const baseMark = clean(body.base_mark, 200);
    if (!baseMark) throw new Error("Target mark is required");
    [mark] =
      await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,name,jurisdiction,data,source_status) VALUES(${userId},${matter.id},'trademark',${baseMark},${(body.jurisdictions || []).join(", ") || null},'{}'::jsonb,'user_supplied') RETURNING id,name`;
  }
  if (!mark || !mark.name) throw new Error("Target mark is required");
  const jurisdictions = [
      ...new Set(
        (Array.isArray(body.jurisdictions) ? body.jurisdictions : [])
          .map(String)
          .filter(Boolean),
      ),
    ],
    [project] =
      await sql`INSERT INTO trademark_intelligence_projects(user_id,matter_id,mark_entity_id,clearance_project_id,title,base_mark,jurisdictions,target_languages) VALUES(${userId},${matter.id},${mark.id},${clearance?.id || null},${clean(body.title, 300) || `${mark.name} language and goods intelligence`},${mark.name},${jurisdictions},${languages}) RETURNING id`;
  for (const language of languages)
    for (const channel of CHANNELS)
      await sql`INSERT INTO trademark_language_coverage(project_id,language,script,channel) VALUES(${project.id},${language},${body.scripts?.[language] || "Unknown"},${channel})`;
  return getTrademarkIntelligenceProject(sql, userId, project.id);
}
export async function addTrademarkVariant(sql, userId, body) {
  const project = await projectForUser(sql, userId, body.project_id),
    text = clean(body.variant_text, 300);
  if (!text) throw new Error("Variant text is required");
  await assertMatterPassage(
    sql,
    userId,
    project.matter_id,
    body.source_passage_id,
    "Matter language source passage not found",
  );
  if (
    ![
      "translation",
      "transliteration",
      "phonetic_equivalent",
      "conceptual_equivalent",
      "regional_meaning",
      "slang",
    ].includes(body.variant_type)
  )
    throw new Error("Invalid linguistic variant type");
  const script = body.script || detectWritingSystem(text),
    [variant] =
      await sql`INSERT INTO trademark_linguistic_variants(project_id,variant_type,language,script,region,variant_text,meaning,source_passage_id,source_basis,reviewer_note) VALUES(${project.id},${body.variant_type},${body.language || "und"},${script},${clean(body.region, 150)},${text},${clean(body.meaning, 2000)},${body.source_passage_id || null},${body.source_basis || "user_supplied"},${clean(body.reviewer_note, 3000)}) RETURNING id`,
    [entity] =
      await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${project.matter_id},'trademark_variant',${`trademark-variant:${variant.id}`},${text},${project.jurisdictions.join(", ") || null},${JSON.stringify({ variant_type: body.variant_type, language: body.language || "und", script, meaning: body.meaning || null })}::jsonb,'inferred') RETURNING id`;
  await sql`UPDATE trademark_linguistic_variants SET variant_entity_id=${entity.id} WHERE id=${variant.id}`;
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${userId},${project.matter_id},${entity.id},'LINGUISTIC_VARIANT_OF',${project.mark_entity_id},${JSON.stringify({ project_id: project.id, variant_type: body.variant_type, language: body.language || "und" })}::jsonb,null) ON CONFLICT DO NOTHING`;
  return getTrademarkIntelligenceProject(sql, userId, project.id);
}
export async function reviewTrademarkVariant(sql, userId, body) {
  const [variant] =
    await sql`SELECT v.*,p.user_id,p.matter_id,p.mark_entity_id FROM trademark_linguistic_variants v JOIN trademark_intelligence_projects p ON p.id=v.project_id WHERE v.id=${body.variant_id} AND p.user_id=${userId}`;
  if (!variant) throw new Error("Linguistic variant not found");
  if (
    ![
      "proposed",
      "accepted",
      "rejected",
      "needs_evidence",
      "needs_linguist_review",
    ].includes(body.review_status)
  )
    throw new Error("Invalid linguistic review status");
  if (body.source_passage_id) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.source_passage_id} AND s.user_id=${userId} AND s.matter_id=${variant.matter_id}`;
    if (!passage) throw new Error("Matter language source passage not found");
  }
  await sql`UPDATE trademark_linguistic_variants SET source_passage_id=${body.source_passage_id || null},review_status=${body.review_status},reviewer_note=${clean(body.reviewer_note, 3000)},reviewed_at=${body.review_status === "proposed" ? null : new Date()} WHERE id=${variant.id}`;
  if (variant.variant_entity_id)
    await sql`UPDATE ip_entities SET source_status=${body.review_status === "accepted" ? "verified" : body.review_status === "rejected" ? "inferred" : "inferred"},updated_at=now() WHERE id=${variant.variant_entity_id}`;
  await sql`INSERT INTO trademark_intelligence_review_events(user_id,project_id,variant_id,action,previous_status,new_status,note) VALUES(${userId},${variant.project_id},${variant.id},'variant_review',${variant.review_status},${body.review_status},${clean(body.reviewer_note, 1000)})`;
  return getTrademarkIntelligenceProject(sql, userId, variant.project_id);
}
export async function updateTrademarkLanguageCoverage(sql, userId, body) {
  const [coverage] =
    await sql`SELECT c.*,p.user_id,p.matter_id FROM trademark_language_coverage c JOIN trademark_intelligence_projects p ON p.id=c.project_id WHERE c.id=${body.coverage_id} AND p.user_id=${userId}`;
  if (!coverage) throw new Error("Language coverage channel not found");
  if (
    !["not_started", "in_progress", "completed", "not_applicable"].includes(
      body.status,
    )
  )
    throw new Error("Invalid language coverage status");
  if (body.source_passage_id) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.source_passage_id} AND s.user_id=${userId} AND s.matter_id=${coverage.matter_id}`;
    if (!passage) throw new Error("Matter language source passage not found");
  }
  await sql`UPDATE trademark_language_coverage SET status=${body.status},source_passage_id=${body.source_passage_id || null},note=${clean(body.note, 3000)},reviewed_at=${["completed", "not_applicable"].includes(body.status) ? new Date() : null} WHERE id=${coverage.id}`;
  return getTrademarkIntelligenceProject(sql, userId, coverage.project_id);
}
export async function addTrademarkGoodsTerm(sql, userId, body) {
  const project = await projectForUser(sql, userId, body.project_id),
    description = clean(body.user_description, 3000),
    wording = clean(body.proposed_wording, 3000);
  if (!description || !wording)
    throw new Error(
      "Goods/services description and proposed wording are required",
    );
  await assertMatterPassage(
    sql,
    userId,
    project.matter_id,
    body.source_passage_id,
    "Office classification passage not found",
  );
  const [term] =
      await sql`INSERT INTO trademark_goods_services_terms(project_id,user_description,proposed_wording,nice_class,jurisdiction,office,acceptability_status,related_terms,source_passage_id,reviewer_note) VALUES(${project.id},${description},${wording},${body.nice_class || null},${body.jurisdiction || project.jurisdictions[0] || "Unresolved"},${body.office || "Unresolved"},${body.acceptability_status || "unverified"},${Array.isArray(body.related_terms) ? body.related_terms : []},${body.source_passage_id || null},${clean(body.reviewer_note, 3000)}) RETURNING id`,
    [entity] =
      await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${project.matter_id},'goods_service_term',${`goods-term:${term.id}`},${wording},${body.jurisdiction || project.jurisdictions[0] || null},${JSON.stringify({ nice_class: body.nice_class || null, office: body.office || null, acceptability_status: body.acceptability_status || "unverified" })}::jsonb,'inferred') RETURNING id`;
  await sql`UPDATE trademark_goods_services_terms SET term_entity_id=${entity.id} WHERE id=${term.id}`;
  await sql`INSERT INTO ip_relationships(user_id,matter_id,from_entity_id,relationship_type,to_entity_id,data,confidence) VALUES(${userId},${project.matter_id},${entity.id},'CLASSIFIES_GOODS_FOR',${project.mark_entity_id},${JSON.stringify({ project_id: project.id, nice_class: body.nice_class || null, office: body.office || null })}::jsonb,null) ON CONFLICT DO NOTHING`;
  return getTrademarkIntelligenceProject(sql, userId, project.id);
}
export async function reviewTrademarkGoodsTerm(sql, userId, body) {
  const [term] =
    await sql`SELECT g.*,p.user_id,p.matter_id FROM trademark_goods_services_terms g JOIN trademark_intelligence_projects p ON p.id=g.project_id WHERE g.id=${body.goods_term_id} AND p.user_id=${userId}`;
  if (!term) throw new Error("Goods/services term not found");
  if (
    ![
      "proposed",
      "accepted",
      "rejected",
      "needs_evidence",
      "needs_classification_review",
    ].includes(body.review_status) ||
    ![
      "unverified",
      "accepted_wording",
      "requires_amendment",
      "rejected",
      "unknown",
    ].includes(body.acceptability_status)
  )
    throw new Error("Invalid goods/services review status");
  if (body.source_passage_id) {
    const [passage] =
      await sql`SELECT sp.id FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=${body.source_passage_id} AND s.user_id=${userId} AND s.matter_id=${term.matter_id}`;
    if (!passage) throw new Error("Office classification passage not found");
  }
  await sql`UPDATE trademark_goods_services_terms SET proposed_wording=${clean(body.proposed_wording, 3000) || term.proposed_wording},nice_class=${body.nice_class || null},acceptability_status=${body.acceptability_status},source_passage_id=${body.source_passage_id || null},review_status=${body.review_status},reviewer_note=${clean(body.reviewer_note, 3000)},reviewed_at=${body.review_status === "proposed" ? null : new Date()} WHERE id=${term.id}`;
  if (term.term_entity_id)
    await sql`UPDATE ip_entities SET name=${clean(body.proposed_wording, 3000) || term.proposed_wording},data=data||${JSON.stringify({ nice_class: body.nice_class || null, acceptability_status: body.acceptability_status })}::jsonb,source_status=${body.review_status === "accepted" ? "verified" : "inferred"},updated_at=now() WHERE id=${term.term_entity_id}`;
  await sql`INSERT INTO trademark_intelligence_review_events(user_id,project_id,goods_term_id,action,previous_status,new_status,note) VALUES(${userId},${term.project_id},${term.id},'goods_review',${term.review_status},${body.review_status},${clean(body.reviewer_note, 1000)})`;
  return getTrademarkIntelligenceProject(sql, userId, term.project_id);
}
export async function finalizeTrademarkIntelligence(sql, userId, body) {
  const project = await projectForUser(sql, userId, body.project_id);
  if (
    !["draft", "in_review", "accepted", "reopened"].includes(body.review_status)
  )
    throw new Error("Invalid trademark intelligence status");
  await sql`UPDATE trademark_intelligence_projects SET review_status=${body.review_status},conclusion_note=${clean(body.conclusion_note, 8000)},updated_at=now() WHERE id=${project.id}`;
  await sql`INSERT INTO trademark_intelligence_review_events(user_id,project_id,action,previous_status,new_status,note) VALUES(${userId},${project.id},'project_review',${project.review_status},${body.review_status},${clean(body.conclusion_note, 1000)})`;
  return getTrademarkIntelligenceProject(sql, userId, project.id);
}
export async function syncTrademarkIntelligenceToClearance(sql, userId, body) {
  const project = await projectForUser(sql, userId, body.project_id);
  if (!project.clearance_project_id)
    throw new Error(
      "Trademark intelligence project is not linked to clearance",
    );
  if (project.review_status !== "accepted")
    throw new Error(
      "Only accepted trademark intelligence can sync to clearance",
    );
  const variants =
      await sql`SELECT variant_text FROM trademark_linguistic_variants WHERE project_id=${project.id} AND review_status='accepted'`,
    goods =
      await sql`SELECT proposed_wording,nice_class FROM trademark_goods_services_terms WHERE project_id=${project.id} AND review_status='accepted'`,
    niceClasses = [...new Set(goods.map((g) => Number(g.nice_class)))],
    wording = goods.map((g) => g.proposed_wording).join("; ");
  await sql`UPDATE trademark_clearance_projects SET nice_classes=${niceClasses},goods_services=${wording},updated_at=now() WHERE id=${project.clearance_project_id} AND user_id=${userId}`;
  await sql`UPDATE ip_entities SET data=data||${JSON.stringify({ linguistic_variants: variants.map((v) => v.variant_text), nice_classes: niceClasses, goods_services: wording, intelligence_project_id: project.id })}::jsonb,updated_at=now() WHERE id=${project.mark_entity_id} AND user_id=${userId}`;
  return getTrademarkIntelligenceProject(sql, userId, project.id);
}
