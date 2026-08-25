const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()
const compact=value=>normalize(value).replace(/\s/g,'')
const similarity=(a,b)=>{a=compact(a);b=compact(b);if(!a&&!b)return 1;if(!a||!b)return 0;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const saved=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));previous=saved}}return 1-row[b.length]/Math.max(a.length,b.length)}
const soundex=value=>{const text=compact(value);if(!text)return'';const map={B:1,F:1,P:1,V:1,C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2,D:3,T:3,L:4,M:5,N:5,R:6};let result=text[0],last=map[text[0]];for(const char of text.slice(1)){const code=map[char];if(code&&code!==last)result+=code;last=code;if(result.length===4)break}return(result+'000').slice(0,4)}
const tokenSet=value=>new Set(normalize(value).split(' ').filter(Boolean))
const jaccard=(a,b)=>{a=tokenSet(a);b=tokenSet(b);const union=new Set([...a,...b]);return union.size?[...a].filter(item=>b.has(item)).length/union.size:0}
const classScore=(a,b)=>{const left=new Set((a||[]).map(Number)),right=new Set((b||[]).map(Number));const union=new Set([...left,...right]);return union.size?[...left].filter(item=>right.has(item)).length/union.size:0}

export function compareTrademarks({markA,markB,classesA=[],classesB=[],goodsA='',goodsB='',jurisdiction=null}){
  const visual=similarity(markA,markB),phonetic=Math.max(soundex(markA)===soundex(markB)?1:0,similarity(soundex(markA),soundex(markB))),conceptual=jaccard(markA,markB),classes=classScore(classesA,classesB),goods=jaccard(goodsA,goodsB),goodsServices=Math.max(classes,goods),overall=.35*visual+.3*phonetic+.15*conceptual+.2*goodsServices
  return{mark_a:normalize(markA),mark_b:normalize(markB),jurisdiction,visual_score:+(visual*100).toFixed(2),phonetic_score:+(phonetic*100).toFixed(2),conceptual_score:+(conceptual*100).toFixed(2),goods_services_score:+(goodsServices*100).toFixed(2),overall_score:+(overall*100).toFixed(2),risk_band:overall>=.75?'high':overall>=.5?'moderate':overall>=.3?'low':'limited',factors:{classes_a:classesA,classes_b:classesB,class_overlap:+(classes*100).toFixed(2),goods_word_overlap:+(goods*100).toFixed(2),screening_only:true,requires_jurisdiction_specific_legal_analysis:true}}
}
