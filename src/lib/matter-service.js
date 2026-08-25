export async function getMatterContext(sql, userId, matterId) {
  if (!matterId) return null;
  const [matter] =
    await sql`SELECT id,name,client_name,matter_type,jurisdictions,description,status FROM matters WHERE id=${matterId} AND user_id=${userId}`;
  if (!matter) return null;
  const facts =
    await sql`SELECT fact_type,label,value,confidence,status FROM matter_facts WHERE matter_id=${matter.id} AND status<>'superseded' ORDER BY updated_at DESC LIMIT 80`;
  const entities =
    await sql`SELECT id,entity_type,canonical_identifier,name,jurisdiction,data,source_status FROM ip_entities WHERE matter_id=${matter.id} AND user_id=${userId} ORDER BY updated_at DESC LIMIT 80`;
  const relationships = entities.length
    ? await sql`SELECT r.relationship_type,r.confidence,a.entity_type from_type,a.name from_name,b.entity_type to_type,b.name to_name FROM ip_relationships r JOIN ip_entities a ON a.id=r.from_entity_id JOIN ip_entities b ON b.id=r.to_entity_id WHERE r.matter_id=${matter.id} AND r.user_id=${userId} ORDER BY r.created_at DESC LIMIT 120`
    : [];
  const propositions =
    await sql`SELECT p.id,p.issue,p.proposition,p.jurisdiction,p.confidence,p.verification_status,p.contrary_authority_checked,p.verified_at,coalesce(jsonb_agg(jsonb_build_object('support_type',ps.support_type,'title',s.title,'citation',s.citation,'locator_type',sp.locator_type,'locator',sp.locator,'source_verified',s.verified_at IS NOT NULL)) FILTER(WHERE sp.id IS NOT NULL),'[]'::jsonb) sources FROM legal_propositions p LEFT JOIN proposition_sources ps ON ps.proposition_id=p.id LEFT JOIN source_passages sp ON sp.id=ps.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE p.matter_id=${matter.id} AND p.user_id=${userId} AND p.verification_status IN ('supported','qualified') GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 40`;
  const litigationIssues =
    await sql`SELECT id,title,description,issue_type,status FROM litigation_issues WHERE matter_id=${matter.id} AND user_id=${userId} ORDER BY updated_at DESC LIMIT 60`;
  const chronology =
    await sql`SELECT e.id,e.event_date,e.date_precision,e.title,e.description,e.significance,e.provenance_basis,e.review_status,i.title issue_title,coalesce(jsonb_agg(jsonb_build_object('relation_type',ep.relation_type,'source_title',s.title,'locator_type',sp.locator_type,'locator',sp.locator,'source_verified',s.verified_at IS NOT NULL)) FILTER(WHERE sp.id IS NOT NULL),'[]'::jsonb) evidence FROM chronology_events e LEFT JOIN litigation_issues i ON i.id=e.issue_id LEFT JOIN chronology_event_passages ep ON ep.event_id=e.id LEFT JOIN source_passages sp ON sp.id=ep.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE e.matter_id=${matter.id} AND e.user_id=${userId} AND e.review_status<>'rejected' GROUP BY e.id,i.title ORDER BY e.event_date LIMIT 160`;
  const evidenceMatrix =
    await sql`SELECT mi.id,mi.required_fact,mi.legal_relevance,mi.burden,mi.assessment_status,mi.gap_note,i.title issue_title,w.name witness_name,coalesce(jsonb_agg(jsonb_build_object('evidence_type',mp.evidence_type,'weight',mp.weight,'source_title',s.title,'locator_type',sp.locator_type,'locator',sp.locator,'source_verified',s.verified_at IS NOT NULL)) FILTER(WHERE sp.id IS NOT NULL),'[]'::jsonb) evidence FROM evidence_matrix_items mi JOIN litigation_issues i ON i.id=mi.issue_id LEFT JOIN ip_entities w ON w.id=mi.witness_entity_id LEFT JOIN evidence_matrix_passages mp ON mp.item_id=mi.id LEFT JOIN source_passages sp ON sp.id=mp.passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE mi.matter_id=${matter.id} AND mi.user_id=${userId} GROUP BY mi.id,i.title,w.name ORDER BY i.title,mi.created_at LIMIT 160`;
  const inventiveStepAnalyses =
    await sql`SELECT a.id,a.title,a.framework,a.jurisdiction,a.conclusion,a.conclusion_note,a.review_status,a.contrary_evidence_checked,pc.claim_number,e.canonical_identifier patent_identifier,s.title authority_title,s.citation authority_citation,sp.locator_type authority_locator_type,sp.locator authority_locator,s.verified_at IS NOT NULL authority_verified,(SELECT coalesce(jsonb_agg(jsonb_build_object('ordinal',st.ordinal,'label',st.label,'analysis_text',st.analysis_text,'review_status',st.review_status) ORDER BY st.ordinal),'[]'::jsonb) FROM inventive_step_analysis_steps st WHERE st.analysis_id=a.id) steps,(SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.reference_role,'publication_number',re.canonical_identifier,'name',re.name,'timing_status',c.timing_status,'candidate_review',c.review_status)),'[]'::jsonb) FROM inventive_step_references r JOIN prior_art_candidates c ON c.id=r.candidate_id JOIN ip_entities re ON re.id=c.patent_entity_id WHERE r.analysis_id=a.id) reference_set FROM inventive_step_analyses a JOIN patent_claims pc ON pc.id=a.claim_id JOIN ip_entities e ON e.id=pc.patent_entity_id LEFT JOIN source_passages sp ON sp.id=a.governing_authority_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE a.matter_id=${matter.id} AND a.user_id=${userId} ORDER BY a.updated_at DESC LIMIT 30`;
  const ftoProjects =
    await sql`SELECT p.id,p.title,p.jurisdiction,p.proposed_launch_date,p.scope_note,p.patentability_distinguished,p.overall_conclusion,p.conclusion_note,p.review_status,product.name product_name,(SELECT coalesce(jsonb_agg(jsonb_build_object('ordinal',f.ordinal,'feature_text',f.feature_text,'review_status',f.review_status,'source_verified',s.verified_at IS NOT NULL) ORDER BY f.ordinal),'[]'::jsonb) FROM fto_product_features f LEFT JOIN source_passages sp ON sp.id=f.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE f.project_id=p.id) features,(SELECT coalesce(jsonb_agg(jsonb_build_object('channel',c.channel,'status',c.status,'source_basis',c.source_basis,'result_count',c.result_count)),'[]'::jsonb) FROM fto_search_coverage c WHERE c.project_id=p.id) coverage,(SELECT coalesce(jsonb_agg(jsonb_build_object('patent',pe.canonical_identifier,'claim_number',pc.claim_number,'status_category',r.status_category,'status_as_of',r.status_as_of,'claim_conclusion',r.claim_conclusion,'review_status',r.review_status,'status_verified',ls.verified_at IS NOT NULL,'mapping_total',(SELECT count(*) FROM fto_element_mappings em WHERE em.patent_review_id=r.id),'mapping_accepted',(SELECT count(*) FROM fto_element_mappings em WHERE em.patent_review_id=r.id AND em.review_status='accepted'))),'[]'::jsonb) FROM fto_patent_reviews r JOIN patent_claims pc ON pc.id=r.claim_id JOIN ip_entities pe ON pe.id=r.patent_entity_id LEFT JOIN source_passages lsp ON lsp.id=r.legal_status_passage_id LEFT JOIN legal_sources ls ON ls.id=lsp.source_id WHERE r.project_id=p.id) patent_reviews,(SELECT coalesce(jsonb_agg(jsonb_build_object('title',d.title,'description',d.description,'feasibility',d.feasibility,'review_status',d.review_status)),'[]'::jsonb) FROM fto_design_arounds d WHERE d.project_id=p.id) design_arounds FROM fto_projects p JOIN ip_entities product ON product.id=p.product_entity_id WHERE p.matter_id=${matter.id} AND p.user_id=${userId} ORDER BY p.updated_at DESC LIMIT 30`;
  const trademarkIntelligence =
    await sql`SELECT p.id,p.title,p.base_mark,p.jurisdictions,p.target_languages,p.review_status,p.conclusion_note,(SELECT coalesce(jsonb_agg(jsonb_build_object('language',c.language,'script',c.script,'channel',c.channel,'status',c.status,'note',c.note,'source_verified',s.verified_at IS NOT NULL) ORDER BY c.language,c.channel),'[]'::jsonb) FROM trademark_language_coverage c LEFT JOIN source_passages sp ON sp.id=c.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE c.project_id=p.id) coverage,(SELECT coalesce(jsonb_agg(jsonb_build_object('variant_type',v.variant_type,'language',v.language,'script',v.script,'region',v.region,'variant_text',v.variant_text,'meaning',v.meaning,'review_status',v.review_status,'source_verified',s.verified_at IS NOT NULL) ORDER BY v.language,v.variant_type),'[]'::jsonb) FROM trademark_linguistic_variants v LEFT JOIN source_passages sp ON sp.id=v.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE v.project_id=p.id) variants,(SELECT coalesce(jsonb_agg(jsonb_build_object('description',g.user_description,'wording',g.proposed_wording,'nice_class',g.nice_class,'jurisdiction',g.jurisdiction,'office',g.office,'acceptability_status',g.acceptability_status,'review_status',g.review_status,'source_verified',s.verified_at IS NOT NULL,'authority_tier',s.authority_tier) ORDER BY g.jurisdiction,g.nice_class),'[]'::jsonb) FROM trademark_goods_services_terms g LEFT JOIN source_passages sp ON sp.id=g.source_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE g.project_id=p.id) goods_terms FROM trademark_intelligence_projects p WHERE p.matter_id=${matter.id} AND p.user_id=${userId} ORDER BY p.updated_at DESC LIMIT 30`;
  const noveltyAnalyses =
    await sql`SELECT a.id,a.title,a.jurisdiction,a.legal_test,a.direct_and_unambiguous,a.enabling_disclosure,a.public_availability_checked,a.conclusion,a.conclusion_note,a.review_status,pc.claim_number,target.canonical_identifier target_publication,ref.canonical_identifier reference_publication,c.publication_date,c.timing_status,authority.title authority_title,authority.citation authority_citation,asp.locator_type authority_locator_type,asp.locator authority_locator,authority.verified_at IS NOT NULL authority_verified,(SELECT coalesce(jsonb_agg(jsonb_build_object('ordinal',e.ordinal,'element_text',e.element_text,'disclosure_status',m.disclosure_status,'review_status',m.review_status,'source_title',s.title,'locator_type',sp.locator_type,'locator',sp.locator,'source_verified',s.verified_at IS NOT NULL) ORDER BY e.ordinal),'[]'::jsonb) FROM prior_art_element_mappings m JOIN patent_claim_elements e ON e.id=m.claim_element_id LEFT JOIN source_passages sp ON sp.id=m.evidence_passage_id LEFT JOIN legal_sources s ON s.id=sp.source_id WHERE m.candidate_id=a.candidate_id) mappings FROM patent_novelty_analyses a JOIN patent_claims pc ON pc.id=a.claim_id JOIN prior_art_candidates c ON c.id=a.candidate_id JOIN prior_art_projects p ON p.id=a.prior_art_project_id JOIN ip_entities target ON target.id=p.patent_entity_id JOIN ip_entities ref ON ref.id=c.patent_entity_id LEFT JOIN source_passages asp ON asp.id=a.governing_authority_passage_id LEFT JOIN legal_sources authority ON authority.id=asp.source_id WHERE a.matter_id=${matter.id} AND a.user_id=${userId} ORDER BY a.updated_at DESC LIMIT 40`;
  return {
    matter,
    facts,
    entities,
    relationships,
    propositions,
    litigationIssues,
    chronology,
    evidenceMatrix,
    inventiveStepAnalyses,
    ftoProjects,
    trademarkIntelligence,
    noveltyAnalyses,
  };
}

export function matterContextPrompt(context) {
  if (!context)
    return "NO ACTIVE MATTER. Do not imply persistent matter facts are available.";
  const facts =
    context.facts
      .map(
        (f) =>
          `${f.fact_type} | ${f.label}: ${JSON.stringify(f.value)} [${f.status}; confidence ${f.confidence ?? "unrated"}]`,
      )
      .join("\n") || "None recorded";
  const entities =
    context.entities
      .map(
        (e) =>
          `${e.entity_type} | ${e.canonical_identifier || "unidentified"} | ${e.name} | ${e.jurisdiction || "jurisdiction unknown"} | basis ${e.source_status}`,
      )
      .join("\n") || "None recorded";
  const links =
    context.relationships
      .map(
        (r) =>
          `${r.from_type}:${r.from_name} --${r.relationship_type}--> ${r.to_type}:${r.to_name}`,
      )
      .join("\n") || "None recorded";
  const propositions =
    context.propositions
      .map(
        (p) =>
          `${p.verification_status.toUpperCase()} | ${p.confidence} confidence | ${p.jurisdiction || "jurisdiction unresolved"} | ${p.proposition}\nEvidence: ${p.sources.map((s) => `${s.support_type}: ${s.citation || s.title} (${s.locator_type} ${s.locator}; source ${s.source_verified ? "verified" : "unverified"})`).join("; ") || "none"} | contrary authority ${p.contrary_authority_checked ? "checked" : "not checked"}`,
      )
      .join("\n") || "None recorded";
  const chronology =
    (context.chronology || [])
      .map(
        (e) =>
          `${String(e.event_date).slice(0, 10)} | ${e.review_status.toUpperCase()} | ${e.title} | issue ${e.issue_title || "unlinked"} | ${e.significance || "significance not recorded"} | basis ${e.provenance_basis} | evidence ${e.evidence.map((source) => `${source.relation_type}:${source.source_title} ${source.locator_type} ${source.locator} [${source.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}`,
      )
      .join("\n") || "None recorded";
  const evidenceMatrix =
    (context.evidenceMatrix || [])
      .map(
        (item) =>
          `${item.assessment_status.toUpperCase()} | issue ${item.issue_title} | required fact: ${item.required_fact} | relevance: ${item.legal_relevance || "not recorded"} | witness: ${item.witness_name || "none"} | gap: ${item.gap_note || "none recorded"} | evidence: ${item.evidence.map((source) => `${source.evidence_type}:${source.source_title} ${source.locator_type} ${source.locator} [${source.weight}; ${source.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}`,
      )
      .join("\n") || "None recorded";
  const inventiveStep =
    (context.inventiveStepAnalyses || [])
      .map(
        (a) =>
          `${a.review_status.toUpperCase()} | ${a.framework} | ${a.jurisdiction} | ${a.patent_identifier || "patent"} claim ${a.claim_number} | conclusion ${a.conclusion} | contrary evidence ${a.contrary_evidence_checked ? "checked" : "not checked"}\nClosest/reference set: ${a.reference_set.map((r) => `${r.role}:${r.publication_number || r.name} [${r.timing_status}; ${r.candidate_review}]`).join("; ") || "none"}\nAuthority: ${a.authority_citation || a.authority_title || "none"} ${a.authority_locator_type || ""} ${a.authority_locator || ""} [${a.authority_verified ? "verified" : "unverified"}]\nFramework steps: ${a.steps.map((step) => `${step.ordinal}.${step.label} [${step.review_status}]: ${step.analysis_text || "no accepted analysis"}`).join(" | ")}\nConclusion note: ${a.conclusion_note || "none recorded"}`,
      )
      .join("\n") || "None recorded";
  const fto =
    (context.ftoProjects || [])
      .map(
        (p) =>
          `${p.review_status.toUpperCase()} | ${p.product_name} | territory ${p.jurisdiction} | launch ${p.proposed_launch_date ? String(p.proposed_launch_date).slice(0, 10) : "not recorded"} | conclusion ${p.overall_conclusion} | FTO/patentability distinction ${p.patentability_distinguished ? "recorded" : "missing"}\nFeatures: ${p.features.map((f) => `${f.ordinal}.${f.feature_text} [${f.review_status}; ${f.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}\nCoverage: ${p.coverage.map((c) => `${c.channel}:${c.status} [${c.source_basis}; ${c.result_count} results]`).join("; ") || "none"}\nPatent reviews: ${p.patent_reviews.map((r) => `${r.patent || "patent"} claim ${r.claim_number}: ${r.status_category} as of ${r.status_as_of ? String(r.status_as_of).slice(0, 10) : "unknown"}; ${r.claim_conclusion}; ${r.review_status}; mappings ${r.mapping_accepted}/${r.mapping_total}; status ${r.status_verified ? "verified" : "unverified"}`).join(" | ") || "none"}\nDesign-arounds: ${p.design_arounds.map((d) => `${d.title} [${d.feasibility}; ${d.review_status}]: ${d.description}`).join(" | ") || "none"}\nConclusion note: ${p.conclusion_note || "none recorded"}`,
      )
      .join("\n") || "None recorded";
  const trademarkIntelligence =
    (context.trademarkIntelligence || [])
      .map(
        (p) =>
          `${p.review_status.toUpperCase()} | ${p.base_mark} | jurisdictions ${p.jurisdictions.join(", ") || "unresolved"} | languages ${p.target_languages.join(", ") || "none"}\nLanguage coverage: ${p.coverage.map((c) => `${c.language}/${c.channel}:${c.status} [${c.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}\nCandidate variants: ${p.variants.map((v) => `${v.variant_text} (${v.language}; ${v.variant_type}) [${v.review_status}; ${v.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}\nGoods/services: ${p.goods_terms.map((g) => `Class ${g.nice_class || "unresolved"} ${g.wording} (${g.office}/${g.jurisdiction}) [${g.review_status}; ${g.acceptability_status}; Tier ${g.authority_tier || "unrated"}; ${g.source_verified ? "verified" : "unverified"}]`).join("; ") || "none"}\nConclusion note: ${p.conclusion_note || "none recorded"}`,
      )
      .join("\n") || "None recorded";
  const novelty =
    (context.noveltyAnalyses || [])
      .map(
        (a) =>
          `${a.review_status.toUpperCase()} | ${a.jurisdiction} | ${a.target_publication || "target patent"} claim ${a.claim_number} against single reference ${a.reference_publication || "unidentified"} | conclusion ${a.conclusion}\nTiming: ${a.timing_status}; publication ${a.publication_date ? String(a.publication_date).slice(0, 10) : "unknown"}; availability checked ${a.public_availability_checked ? "yes" : "no"}\nLegal test: ${a.legal_test}\nAuthority: ${a.authority_citation || a.authority_title || "none"} ${a.authority_locator_type || ""} ${a.authority_locator || ""} [${a.authority_verified ? "verified" : "unverified"}]\nFindings: direct/unambiguous ${a.direct_and_unambiguous ? "yes" : "no"}; enabling ${a.enabling_disclosure ? "yes" : "no"}\nLimitations: ${a.mappings.map((m) => `${m.ordinal}.${m.element_text} [${m.disclosure_status}; ${m.review_status}; ${m.source_verified ? "verified" : "unverified"}; ${m.source_title || "no source"} ${m.locator_type || ""} ${m.locator || ""}]`).join(" | ") || "none"}\nConclusion note: ${a.conclusion_note || "none recorded"}`,
      )
      .join("\n") || "None recorded";
  return `ACTIVE MATTER\nName: ${context.matter.name}\nClient: ${context.matter.client_name || "not recorded"}\nType: ${context.matter.matter_type}\nJurisdictions: ${context.matter.jurisdictions.join(", ") || "not resolved"}\n\nSTRUCTURED FACTS\n${facts}\n\nIP GRAPH ENTITIES\n${entities}\n\nIP GRAPH RELATIONSHIPS\n${links}\n\nVERIFIED / QUALIFIED LEGAL PROPOSITIONS\n${propositions}\n\nTRADEMARK LANGUAGE AND GOODS/SERVICES INTELLIGENCE\n${trademarkIntelligence}\n\nPATENT NOVELTY ANALYSES\n${novelty}\n\nPATENT INVENTIVE-STEP ANALYSES\n${inventiveStep}\n\nFREEDOM-TO-OPERATE PROJECTS\n${fto}\n\nMATTER CHRONOLOGY\n${chronology}\n\nEVIDENCE MATRIX\n${evidenceMatrix}\n\nRespect every review status. Novelty is a single-reference test: never combine or mosaic references to supply missing limitations. Only an accepted analysis with verified pre-critical timing, verified limitation evidence, enabling/direct-and-unambiguous findings, and verified governing authority may support anticipation. Proposed or unverified mark variants are not clearance search terms. Accepted variants may expand a search query but are not automatically similar or conflicting. Office wording and Nice classifications remain scoped to their recorded office and jurisdiction; never universalize them. Never invent translations, transliterations, meanings, classes, or office acceptance. Never confuse FTO with patentability or treat an incomplete search as clearance. Never mix inventive-step frameworks across jurisdictions. Draft or reopened analyses are not final opinions. Proposed events are not established facts. A gap or partially supported item is not proved. Do not upgrade qualified propositions, omit contrary evidence, or treat unverified passages as verified.`;
}
