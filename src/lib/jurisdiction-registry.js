const displayNames=new Intl.DisplayNames(['en'],{type:'region'})

const aliases={
  usa:'US','u.s.':'US','united states of america':'US',
  uk:'GB','u.k.':'GB','great britain':'GB',
  uae:'AE','south korea':'KR','north korea':'KP',
  russia:'RU','vietnam':'VN','bolivia':'BO','iran':'IR',
  taiwan:'TW','tanzania':'TZ','venezuela':'VE',
  'european union':'EU',eu:'EU',epo:'EPO',ep:'EPO',europe:'EU'
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
  const value=String(text||'')
  const lower=value.toLowerCase()
  // Two-letter codes that collide with common English words only count when
  // written in UPPERCASE ("US", "IN"); lowercase "us"/"as a"/"in the" must not
  // resolve to United States/American Samoa/India.
  const shortStop=new Set(['as','in','on','at','to','be','or','of','by','up','no','so','do','go','we','me','my','is','it','if','an','us','he','ox','ex'])
  const candidates=[...tokens.entries()].sort((a,b)=>b[0].length-a[0].length)
  for(const[token,region]of candidates){
    const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
    if(token.length===2&&shortStop.has(token)){
      if(new RegExp(`(?:^|[^A-Za-z])${token.toUpperCase()}(?:$|[^A-Za-z])`).test(value))return region
      continue
    }
    if(new RegExp(`(?:^|[^A-Za-z])${escaped}(?:$|[^A-Za-z])`,'i').test(value))return region
  }
  return null
}

export function officialPatentAuthority(jurisdiction){
  const region=resolveJurisdiction(jurisdiction)||supportedJurisdictions.find(item=>item.name===jurisdiction)
  const known={IN:'Indian Patent Office / InPASS',US:'USPTO',GB:'UKIPO',DE:'DPMA and EPO',JP:'JPO',CN:'CNIPA',KR:'KIPO',CA:'CIPO',AU:'IP Australia',BR:'INPI Brazil',MX:'IMPI',FR:'INPI France',EU:'EPO',EP:'EPO',EPO:'EPO'}
  return known[region?.code]||`${region?.name||jurisdiction||'National'} patent authority`
}
