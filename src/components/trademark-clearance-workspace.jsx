import {useEffect,useState} from 'react'
import {Check,Plus,ScanSearch,ShieldAlert,ShieldCheck,X} from 'lucide-react'

const parseList=value=>value.split(',').map(item=>item.trim()).filter(Boolean)
const parseClasses=value=>parseList(value).map(Number).filter(item=>item>=1&&item<=45)
const channelName=value=>value.replaceAll('_',' ')

export default function TrademarkClearanceWorkspace({matterId,onResult}){
  const[open,setOpen]=useState(false)
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  const[projects,setProjects]=useState([])
  const[project,setProject]=useState(null)
  const[adding,setAdding]=useState(false)
  const[form,setForm]=useState({mark:'',jurisdictions:'EU',nice_classes:'9, 42',goods_services:''})
  const[candidate,setCandidate]=useState({mark:'',identifier:'',nice_classes:'',goods_services:'',jurisdiction:'',source_basis:'user_supplied'})

  useEffect(()=>{if(open&&matterId)loadProjects()},[open,matterId])

  const request=async(url,options)=>{const response=await fetch(url,options),data=await response.json();if(!response.ok)throw new Error(data?.error?.message||'Trademark clearance operation failed');return data}
  const loadProjects=async()=>{setBusy(true);setError('');try{setProjects((await request(`/api/trademark-clearance?matter_id=${encodeURIComponent(matterId)}`)).projects)}catch(err){setError(err.message)}finally{setBusy(false)}}
  const load=async id=>{setBusy(true);setError('');try{setProject(await request(`/api/trademark-clearance?project_id=${encodeURIComponent(id)}`))}catch(err){setError(err.message)}finally{setBusy(false)}}
  const act=async body=>{setBusy(true);setError('');try{const data=await request('/api/trademark-clearance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setProject(data);return data}catch(err){setError(err.message)}finally{setBusy(false)}}
  const create=async event=>{event.preventDefault();if(!matterId)return setError('Select a matter first.');const data=await act({action:'create',matter_id:matterId,mark:form.mark,jurisdictions:parseList(form.jurisdictions),nice_classes:parseClasses(form.nice_classes),goods_services:form.goods_services});if(data)onResult(`## Trademark clearance opened\n\n**${data.project.target_mark}** is now a structured clearance project. No external search has been claimed. Current research gaps: ${data.research_gaps.map(channelName).join(', ')}.`,{task_class:'TRADEMARK_CLEARANCE',specialists:['Sally Trademarks','Sally Brand Protection','Sally Verification'],source_basis:'user_supplied'})}
  const screen=async()=>{const data=await act({action:'screen_matter',project_id:project.project.id});if(data)onResult(`## Matter trademark screen complete\n\nSally screened ${data.candidates.length} trademark entities already stored in this matter. This was **not** a live registry or common-law search. Remaining coverage gaps: ${data.research_gaps.map(channelName).join(', ')}.`,{task_class:'TRADEMARK_CLEARANCE',specialists:['Sally Trademarks','Sally Verification'],source_basis:'retrieved_source'})}
  const searchEuipo=async()=>{setBusy(true);setError('');try{const result=await request('/api/official-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matter_id:project.project.matter_id,provider:'euipo_trademark',task_type:'trademark_search',query:project.project.target_mark,mark:project.project.target_mark,classes:project.project.nice_classes,clearance_project_id:project.project.id,page:0,size:25})});const refreshed=await request(`/api/trademark-clearance?project_id=${encodeURIComponent(project.project.id)}`);setProject(refreshed);onResult(`## EUIPO registry search complete\n\nSally imported **${result.results.length}** results from a completed EUIPO Trademark Search run and screened them against **${project.project.target_mark}**. Registry provenance is recorded under search run \`${result.search_run_id}\`. Remaining coverage gaps: ${refreshed.research_gaps.map(channelName).join(', ')}.`,{task_class:'TRADEMARK_CLEARANCE',specialists:['Sally Trademarks','Sally Brand Protection','Sally Verification'],source_basis:'live_database',search_run_id:result.search_run_id})}catch(err){setError(err.message.includes('not configured')?'EUIPO search is not configured. Add EUIPO_CLIENT_ID and EUIPO_CLIENT_SECRET to the server environment.':err.message)}finally{setBusy(false)}}
  const add=async event=>{event.preventDefault();const data=await act({action:'add_candidate',project_id:project.project.id,...candidate,nice_classes:parseClasses(candidate.nice_classes)});if(data){setAdding(false);setCandidate({mark:'',identifier:'',nice_classes:'',goods_services:'',jurisdiction:'',source_basis:'user_supplied'})}}
  const changeCandidate=(id,key,value)=>setProject(current=>({...current,candidates:current.candidates.map(item=>item.id===id?{...item,[key]:value}:item)}))
  const close=()=>{setOpen(false);setProject(null);setError('');setAdding(false)}

  return <>
    <div className="clearanceLaunch"><button onClick={()=>setOpen(true)}><ScanSearch/>Trademark clearance</button></div>
    {open&&<div className="ipToolOverlay" onMouseDown={event=>event.target===event.currentTarget&&close()}>
      <section className="ipToolModal clearanceModal">
        <header><div><span>SALLY TRADEMARKS / VERIFICATION</span><h2>{project?project.project.title:'Open a clearance matter'}</h2></div><button type="button" onClick={close}><X/></button></header>
        {!matterId?<div className="ipToolError">Select or create a matter first.</div>:project?<ProjectView project={project} busy={busy} adding={adding} setAdding={setAdding} candidate={candidate} setCandidate={setCandidate} screen={screen} searchEuipo={searchEuipo} add={add} act={act} changeCandidate={changeCandidate}/>:<CreateView form={form} setForm={setForm} projects={projects} create={create} load={load} busy={busy}/>} 
        {error&&<div className="ipToolError">{error}</div>}
      </section>
    </div>}
  </>
}

function CreateView({form,setForm,projects,create,load,busy}){return <form onSubmit={create}>
  <div className="ipToolGrid"><label>Target mark<input required value={form.mark} onChange={e=>setForm({...form,mark:e.target.value})}/></label><label>Jurisdictions<input value={form.jurisdictions} onChange={e=>setForm({...form,jurisdictions:e.target.value})} placeholder="EU, UK, US"/></label></div>
  <label>Nice classes<input value={form.nice_classes} onChange={e=>setForm({...form,nice_classes:e.target.value})}/></label>
  <label>Goods and services<textarea required value={form.goods_services} onChange={e=>setForm({...form,goods_services:e.target.value})}/></label>
  {projects.length>0&&<label>Or reopen a clearance project<select defaultValue="" onChange={e=>e.target.value&&load(e.target.value)}><option value="">Select project</option>{projects.map(item=><option key={item.id} value={item.id}>{item.title} · {item.candidate_count} candidates</option>)}</select></label>}
  <p className="officialSearchNote">Creating a project does not perform or imply a registry search. Sally records each search channel separately.</p>
  <footer><span><ShieldCheck/>Matter-scoped clearance record</span><button disabled={busy}>{busy?'Opening…':'Open clearance'}</button></footer>
</form>}

function ProjectView({project,busy,adding,setAdding,candidate,setCandidate,screen,searchEuipo,add,act,changeCandidate}){return <>
  <div className="clearanceSummary"><article><span>TARGET MARK</span><strong>{project.project.target_mark}</strong><small>Classes {project.project.nice_classes.join(', ')||'not specified'}</small></article><article><span>SCREENING RISK</span><strong className={`risk-${project.project.overall_risk}`}>{project.project.overall_risk}</strong><small>Not a legal clearance opinion</small></article><article><span>RESEARCH GAPS</span><strong>{project.research_gaps.length}</strong><small>{project.research_gaps.length?'Coverage incomplete':'All recorded channels completed'}</small></article></div>
  <div className="clearanceCoverage">{project.coverage.map(item=><article key={item.channel} className={item.status==='completed'?'covered':''}><span>{item.status==='completed'?<ShieldCheck/>:<ShieldAlert/>}</span><div><b>{channelName(item.channel)}</b><small>{item.status} · {item.source_basis}</small></div><strong>{item.result_count}</strong></article>)}</div>
  <div className="clearanceActions"><button disabled={busy} onClick={screen}><ScanSearch/>Screen matter graph</button><button disabled={busy} onClick={searchEuipo}><ShieldCheck/>Search EUIPO registry</button><button onClick={()=>setAdding(!adding)}><Plus/>Add sourced candidate</button></div>
  {adding&&<form className="candidateForm" onSubmit={add}><div className="ipToolGrid"><label>Candidate mark<input required value={candidate.mark} onChange={e=>setCandidate({...candidate,mark:e.target.value})}/></label><label>Identifier<input value={candidate.identifier} onChange={e=>setCandidate({...candidate,identifier:e.target.value})} placeholder="Application / registration"/></label><label>Nice classes<input value={candidate.nice_classes} onChange={e=>setCandidate({...candidate,nice_classes:e.target.value})}/></label><label>Jurisdiction<input value={candidate.jurisdiction} onChange={e=>setCandidate({...candidate,jurisdiction:e.target.value})}/></label></div><label>Goods and services<input value={candidate.goods_services} onChange={e=>setCandidate({...candidate,goods_services:e.target.value})}/></label><p className="officialSearchNote">This records a user-supplied candidate. Sally will not label it as a live registry result.</p><button disabled={busy}>Add and screen candidate</button></form>}
  <div className="clearanceCandidates">{project.candidates.map(item=><Candidate key={item.id} item={item} busy={busy} act={act} changeCandidate={changeCandidate}/>)}{!project.candidates.length&&<div className="claimChartEmpty">No candidate marks yet. Screen the matter graph or add a sourced candidate.</div>}</div>
</>}

function Candidate({item,busy,act,changeCandidate}){return <article><div><span>{item.source_basis.replaceAll('_',' ')}</span><h3>{item.candidate_mark}</h3><small>{item.canonical_identifier||'No registry identifier'} · {item.jurisdiction||'Jurisdiction unspecified'}</small></div><div className="similarityBars">{[['Visual',item.visual_score],['Phonetic',item.phonetic_score],['Conceptual',item.conceptual_score],['Goods/services',item.goods_services_score]].map(([label,score])=><label key={label}>{label} <i><b style={{width:`${score}%`}}/></i><strong>{score}%</strong></label>)}</div><div className="clearanceReview"><strong>{item.overall_score}% screen</strong><select value={item.review_status} onChange={e=>changeCandidate(item.id,'review_status',e.target.value)}><option value="unreviewed">Unreviewed</option><option value="relevant">Relevant</option><option value="irrelevant">Irrelevant</option><option value="potential_conflict">Potential conflict</option><option value="needs_research">Needs research</option></select><textarea value={item.review_note||''} onChange={e=>changeCandidate(item.id,'review_note',e.target.value)} placeholder="Legal review note"/><button disabled={busy} onClick={()=>act({action:'review_candidate',candidate_id:item.id,review_status:item.review_status,review_note:item.review_note})}><Check/>Save review</button></div></article>}
