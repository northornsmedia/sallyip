import {XMLParser} from 'fast-xml-parser'

export const officialProviders={
  epo_ops:{name:'EPO Open Patent Services',source:'EPO bibliographic and worldwide patent data',credentials:['EPO_OPS_KEY','EPO_OPS_SECRET'],officialUrl:'https://www.epo.org/en/searching-for-patents/data/web-services/ops'},
  euipo_trademark:{name:'EUIPO Trademark Search',source:'EUIPO trademark database',credentials:['EUIPO_CLIENT_ID','EUIPO_CLIENT_SECRET'],officialUrl:'https://dev.euipo.europa.eu/product/trademark-search_100'},
}

export function providerStatus(env){return Object.entries(officialProviders).map(([id,provider])=>({id,name:provider.name,source:provider.source,official_url:provider.officialUrl,configured:provider.credentials.every(key=>Boolean(env[key]))}))}
const array=value=>value==null?[]:Array.isArray(value)?value:[value]
const text=value=>typeof value==='object'?(value?.['#text']??value?.$t??''):value??''

export function parseEpoSearchXml(xml){
  const parsed=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,attributeNamePrefix:'@_'}).parse(xml),root=parsed?.['world-patent-data']||parsed
  const documents=array(root?.['biblio-search']?.['search-result']?.['exchange-documents']?.['exchange-document']||root?.['search-result']?.['exchange-documents']?.['exchange-document'])
  return documents.map((document,index)=>{const biblio=document?.['bibliographic-data']||{},publication=array(biblio?.['publication-reference']?.['document-id'])[0]||{},country=text(publication?.country),number=text(publication?.['doc-number']),kind=text(publication?.kind),externalId=[country,number,kind].filter(Boolean).join(''),titles=array(biblio?.['invention-title']),title=text(titles.find(item=>item?.['@_lang']==='en')||titles[0])||`Patent result ${index+1}`;return{external_id:externalId,title,publication_number:externalId,country,kind,official_url:externalId?`https://worldwide.espacenet.com/patent/search?q=pn%3D${encodeURIComponent(externalId)}`:null,raw_metadata:document}}).filter(result=>result.external_id||result.title)
}

export async function searchEpoOps(query,env,{fetchImpl=fetch,range='1-25'}={}){
  if(!env.EPO_OPS_KEY||!env.EPO_OPS_SECRET){const error=new Error('EPO OPS is not configured');error.code='PROVIDER_NOT_CONFIGURED';throw error}
  const credentials=Buffer.from(`${env.EPO_OPS_KEY}:${env.EPO_OPS_SECRET}`).toString('base64'),tokenResponse=await fetchImpl('https://ops.epo.org/3.2/auth/accesstoken',{method:'POST',headers:{Authorization:`Basic ${credentials}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
  if(!tokenResponse.ok){const error=new Error('EPO authentication failed');error.code='PROVIDER_AUTH_FAILED';throw error}const token=await tokenResponse.json()
  const response=await fetchImpl(`https://ops.epo.org/3.2/rest-services/published-data/search?q=${encodeURIComponent(query)}`,{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/exchange+xml',Range:range}})
  if(!response.ok){const error=new Error(`EPO search failed (${response.status})`);error.code='PROVIDER_SEARCH_FAILED';throw error}
  return parseEpoSearchXml(await response.text())
}

const first=(...values)=>values.find(value=>value!==undefined&&value!==null&&String(value).trim()!=='')
const niceClasses=item=>array(first(item.niceClasses,item.niceClassification,item.goodsAndServices)).flatMap(value=>{if(typeof value==='number'||typeof value==='string')return Number(value)||[];return Number(first(value.classNumber,value.niceClass,value.classificationNumber))||[]}).filter(value=>value>=1&&value<=45)

export function buildEuipoTrademarkQuery(mark,classes=[]){
  const safe=String(mark||'').normalize('NFKC').replace(/[^\p{L}\p{N} .'-]+/gu,' ').replace(/\s+/g,' ').trim().slice(0,200);if(!safe)throw Object.assign(new Error('A trademark name is required'),{code:'INVALID_QUERY'})
  const validClasses=[...new Set(classes.map(Number).filter(value=>value>=1&&value<=45))],markQuery=`verbalElement==*${safe}*`
  return validClasses.length?`${markQuery} and niceClasses=in=(${validClasses.join(',')})`:markQuery
}

export function parseEuipoTrademarkResults(payload){
  const items=array(first(payload?.trademarks,payload?.items,payload?.results,payload?.content))
  return items.map((item,index)=>{const applicationNumber=String(first(item.applicationNumber,item.trademarkNumber,item.tradeMarkNumber,item.registrationNumber,'')).trim(),mark=String(first(item.verbalElement,item.wordMarkSpecification?.verbalElement,item.representation?.wordPhrase,item.markName,item.name,`EUIPO trademark ${index+1}`)).trim(),classes=niceClasses(item),owner=first(item.applicants?.[0]?.name,item.owners?.[0]?.name,item.owner?.name),status=first(item.status,item.tradeMarkStatus,item.registrationStatus),officialUrl=applicationNumber?`https://api.euipo.europa.eu/trademark-search/trademarks/${encodeURIComponent(applicationNumber)}`:null;return{external_id:applicationNumber||null,title:mark,mark,application_number:applicationNumber||null,jurisdiction:'EU',nice_classes:classes,owner:owner||null,status:status||null,official_url:officialUrl,raw_metadata:item}}).filter(item=>item.external_id||item.mark)
}

export async function searchEuipoTrademarks({mark,classes=[],query,page=0,size=25},env,{fetchImpl=fetch}={}){
  if(!env.EUIPO_CLIENT_ID||!env.EUIPO_CLIENT_SECRET){const error=new Error('EUIPO Trademark Search is not configured');error.code='PROVIDER_NOT_CONFIGURED';throw error}
  const authUrl=env.EUIPO_AUTH_URL||'https://auth.euipo.europa.eu/oidc/accessToken',apiBase=(env.EUIPO_API_BASE||'https://api.euipo.europa.eu').replace(/\/$/,'')
  if(/sandbox/i.test(authUrl)||/sandbox/i.test(apiBase)){const error=new Error('EUIPO sandbox endpoints are not permitted for production evidence');error.code='SANDBOX_NOT_ALLOWED';throw error}
  const tokenBody=new URLSearchParams({client_id:env.EUIPO_CLIENT_ID,client_secret:env.EUIPO_CLIENT_SECRET,grant_type:'client_credentials',scope:'uid'}),tokenResponse=await fetchImpl(authUrl,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:tokenBody.toString()})
  if(!tokenResponse.ok){const error=new Error('EUIPO authentication failed');error.code='PROVIDER_AUTH_FAILED';throw error}const token=await tokenResponse.json();if(!token.access_token){const error=new Error('EUIPO authentication returned no access token');error.code='PROVIDER_AUTH_FAILED';throw error}const rsql=query||buildEuipoTrademarkQuery(mark,classes),url=new URL(`${apiBase}/trademark-search/trademarks`);url.searchParams.set('query',rsql);url.searchParams.set('page',String(Math.max(0,Number(page)||0)));url.searchParams.set('size',String(Math.min(100,Math.max(10,Number(size)||25))))
  const response=await fetchImpl(url.toString(),{headers:{Authorization:`Bearer ${token.access_token}`,'X-IBM-Client-Id':env.EUIPO_CLIENT_ID,Accept:'application/json','Accept-Language':'en'}})
  if(!response.ok){const error=new Error(`EUIPO trademark search failed (${response.status})`);error.code='PROVIDER_SEARCH_FAILED';throw error}
  return parseEuipoTrademarkResults(await response.json())
}
