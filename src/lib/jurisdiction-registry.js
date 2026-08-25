const displayNames=new Intl.DisplayNames(['en'],{type:'region'})

const aliases={
  usa:'US','u.s.':'US','united states of america':'US',
  uk:'GB','u.k.':'GB','great britain':'GB',
  uae:'AE','south korea':'KR','north korea':'KP',
  russia:'RU','vietnam':'VN','bolivia':'BO','iran':'IR',
  taiwan:'TW','tanzania':'TZ','venezuela':'VE',
  'european union':'EU',eu:'EU',epo:'EPO',europe:'EU'
}

const regions=[]
for(let a=65;a<=90;a+=1)for(let b=65;b<=90;b+=1){
  const code=String.fromCharCode(a,b),name=displayNames.of(code)
  if(name&&name!==code&&!/Unknown Region/i.test(name))regions.push({code,name})
}

const tokens=new Map(regions.flatMap(region=>[[region.name.toLowerCase(),region],[region.code.toLowerCase(),region]]))
for(const[alias,code]of Object.entries(aliases)){
  const legacyNames={US:'US',GB:'UK',EU:'EU',EPO:'EPO'}
  const base=regions.find(item=>item.code===code)
  const region={code,name:legacyNames[code]||base?.name||displayNames.of(code)||code}
  tokens.set(alias,region)
}

export const supportedJurisdictions=[...new Map(regions.map(region=>[region.code,region])).values()].sort((a,b)=>a.name.localeCompare(b.name))

export function resolveJurisdiction(text){
  const value=String(text||'').toLowerCase()
  const candidates=[...tokens.entries()].sort((a,b)=>b[0].length-a[0].length)
  for(const[token,region]of candidates){
    const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    if(new RegExp(`(?:^|[^a-z])${escaped}(?:$|[^a-z])`,'i').test(value))return region
  }
  return null
}

export function officialPatentAuthority(jurisdiction){
  const region=resolveJurisdiction(jurisdiction)||supportedJurisdictions.find(item=>item.name===jurisdiction)
  const known={IN:'Indian Patent Office / InPASS',US:'USPTO',GB:'UKIPO',DE:'DPMA and EPO',JP:'JPO',CN:'CNIPA',KR:'KIPO',CA:'CIPO',AU:'IP Australia',BR:'INPI Brazil',MX:'IMPI',FR:'INPI France',EU:'EPO',EPO:'EPO'}
  return known[region?.code]||`${region?.name||jurisdiction||'National'} patent authority`
}
