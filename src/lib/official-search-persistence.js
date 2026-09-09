import {searchCourtListener,searchEpoOps,searchEuipoTrademarks,searchUsptoPatents} from './official-search-service.js'
import {canonicalizeResult,groupIntoFamilies} from './patent-normalize-service.js'
import {importOfficialSearchRunIntoClearance} from './trademark-clearance-service.js'

const PROVIDERS={
  epo_ops:{task:'patent_search',entity:'patent',jurisdiction:result=>result.country,run:async(body,env,fetchImpl)=>searchEpoOps(body.query,env,{range:body.range||'1-25',fetchImpl}),data:result=>result.raw_metadata||{}},
  euipo_trademark:{task:'trademark_search',entity:'trademark',jurisdiction:()=>'EU',run:async(body,env,fetchImpl)=>searchEuipoTrademarks({mark:body.mark||body.query,classes:body.classes||body.filters?.nice_classes||[],query:body.rsql_query,page:body.page,size:body.size},env,{fetchImpl}),data:result=>({application_number:result.application_number,nice_classes:result.nice_classes,owner:result.owner,status:result.status,official_url:result.official_url,raw_metadata:result.raw_metadata})},
  uspto_patent:{task:'patent_search',entity:'patent',jurisdiction:()=>'US',run:async(body,env,fetchImpl)=>searchUsptoPatents(body.query,env,{size:body.size||25,fetchImpl}),data:result=>({patent_date:result.patent_date,official_url:result.official_url,raw_metadata:result.raw_metadata})},
  courtlistener:{task:'case_law_search',entity:'case',jurisdiction:()=>'US',run:async(body,env,fetchImpl)=>searchCourtListener(body.query,env,{size:body.size||25,type:body.filters?.result_type||'o',fetchImpl}),data:result=>({court:result.court,date_filed:result.date_filed,cite_count:result.cite_count,snippet:result.snippet,official_url:result.official_url,raw_metadata:result.raw_metadata})},
}

export async function runOfficialSearch(sql,userId,body,env,{fetchImpl=fetch}={}){
  const query=String(body.query||'').trim();if(query.length<2)throw Object.assign(new Error('A professional search query is required'),{code:'INVALID_QUERY'})
  const[matter]=await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`;if(!matter)throw Object.assign(new Error('Matter not found'),{code:'MATTER_NOT_FOUND'})
  const provider=body.provider||'epo_ops',[run]=await sql`INSERT INTO professional_search_runs(user_id,matter_id,provider,task_type,query,filters) VALUES(${userId},${matter.id},${provider},${body.task_type||PROVIDERS[provider]?.task||'patent_search'},${query},${JSON.stringify(body.filters||{})}::jsonb) RETURNING id`
  try{
    const adapter=PROVIDERS[provider]
    if(!adapter)throw Object.assign(new Error('Provider adapter is not configured'),{code:'PROVIDER_NOT_CONFIGURED'})
    const results=await adapter.run(body,env,fetchImpl),saved=[]
    for(let index=0;index<results.length;index++){const result=results[index],entityData=adapter.data(result);const[entity]=await sql`INSERT INTO ip_entities(user_id,matter_id,entity_type,canonical_identifier,name,jurisdiction,data,source_status) VALUES(${userId},${matter.id},${adapter.entity},${result.external_id||null},${result.title},${adapter.jurisdiction(result)},${JSON.stringify(entityData)}::jsonb,'retrieved') RETURNING id`;const[row]=await sql`INSERT INTO professional_search_results(search_run_id,external_id,title,official_url,entity_id,rank,raw_metadata) VALUES(${run.id},${result.external_id||null},${result.title},${result.official_url||null},${entity.id},${index+1},${JSON.stringify(result.raw_metadata||{})}::jsonb) RETURNING id`;saved.push({...result,id:row.id,entity_id:entity.id,raw_metadata:undefined})}
    // Canonical intelligence layer: normalise patent results from any office
    // into provider_records and resolve families (heuristic, method labelled).
    // Never breaks the search response: failures are logged, not thrown.
    let families=[]
    if((provider==='epo_ops'||provider==='uspto_patent')&&saved.length){
      try{
        const canonRows=results.map((result,index)=>({...canonicalizeResult(provider,result),entity_id:saved[index]?.entity_id||null})).filter(row=>row.external_id)
        const grouped=groupIntoFamilies(canonRows)
        for(const family of grouped)for(const member of family.members){
          await sql`INSERT INTO provider_records(user_id,matter_id,provider,external_id,country,pub_number,kind,normalized_number,title,publication_date,filing_date,priority_date,priority_numbers,family_key,family_method,inventors,assignees,legal_status,entity_id,raw) VALUES(${userId},${matter.id},${provider},${member.external_id},${member.country},${member.pub_number},${member.kind},${member.normalized_number},${member.title},${member.publication_date},${member.filing_date},${member.priority_date},${JSON.stringify(member.priority_numbers)}::jsonb,${member.family_key},${member.family_method},${JSON.stringify(member.inventors)}::jsonb,${JSON.stringify(member.assignees)}::jsonb,${member.legal_status},${member.entity_id},${JSON.stringify(member.raw)}::jsonb) ON CONFLICT(user_id,provider,external_id) DO UPDATE SET title=excluded.title,publication_date=excluded.publication_date,family_key=excluded.family_key,family_method=excluded.family_method,retrieved_at=now()`
        }
        families=grouped.map(family=>({family_key:family.family_key,family_method:family.family_method,members:family.members.map(m=>m.external_id)}))
      }catch(canonicalError){console.warn('canonical ingest skipped:',canonicalError.message?.slice(0,120))}
    }
    await sql`UPDATE professional_search_runs SET status='completed',result_count=${saved.length},finished_at=now() WHERE id=${run.id}`;if(provider==='euipo_trademark'&&body.clearance_project_id)await importOfficialSearchRunIntoClearance(sql,userId,body.clearance_project_id,run.id);return{search_run_id:run.id,provider,source_basis:'live_database',results:saved,families}
  }catch(error){await sql`UPDATE professional_search_runs SET status=${error.code==='PROVIDER_NOT_CONFIGURED'?'not_configured':'failed'},error_code=${error.code||'SEARCH_FAILED'},finished_at=now() WHERE id=${run.id}`;error.searchRunId=run.id;throw error}
}
