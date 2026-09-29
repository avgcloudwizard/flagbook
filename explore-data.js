export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalize=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('en').trim();
export const CONTINENTS=['Africa','Asia','Europe','North America','South America','Oceania'];
export function continentForRegion(region){
  for(const c of ['Africa','Asia','Europe'])if(region.endsWith(c))return c;
  if(['North America','Central America','Caribbean'].includes(region))return 'North America';
  if(region==='South America')return region;
  if(['Australia and New Zealand','Melanesia','Micronesia','Polynesia'].includes(region))return 'Oceania';
  throw new Error(`Unknown region: ${region}`);
}
const cache=new Map();
export function loadJSON(path){
  if(!cache.has(path))cache.set(path,fetch(path).then(r=>{if(!r.ok)throw new Error('Data unavailable');return r.json();}).catch(e=>{cache.delete(path);throw e;}));
  return cache.get(path);
}
export const loadExtras=()=>loadJSON('data/country-extras.json');
export const loadRecords=()=>loadJSON('data/world-records.json');
export const loadRates=()=>loadJSON('data/exchange-rates.json');
export function formatValue(value,unit,compact=false){
  if(['m','km'].includes(unit))compact=false;
  const n=new Intl.NumberFormat('en',{notation:compact?'compact':'standard',maximumFractionDigits:compact?1:2}).format(value);
  return unit==='US$'?`US$${n}`:`${n} ${unit}`;
}
export function countrySummary(c,extra,context){
  const population=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(c.population.value);
  const goods=(context.economy.exports||context.economy.industries||'').split(/[,;]/).slice(0,3).join(', ').replace(/\s*\([^)]*\)\s*$/,'');
  const languages=extra.languages.slice(0,3).join(', ');
  return `${c.name} is in ${c.region}, with about ${population} people (${c.population.year}). ${goods?`${context.economy.exports?'Its exports include':'Its industries include'} ${goods}. `:''}${languages?`Languages include ${languages}. `:''}Its highest point is ${extra.highestPoint.split(';')[0]}.${extra.rivers.length?` Its longest river listed in our source is ${extra.rivers[0].name} (${extra.rivers[0].length.toLocaleString('en')} km across its whole course).`:''}`;
}
export function currencyReference(code,fx){
  const r=fx?.rates?.[code];
  if(!r||!Number.isFinite(r.value)||r.value<=0)return '<small class="fx-rate">INR reference unavailable</small>';
  const value=new Intl.NumberFormat('en',{maximumSignificantDigits:4}).format(r.value);
  return `<small class="fx-rate">(₹1 ≈ ${value} ${esc(code)})</small><small class="fx-date">${esc(r.date)}${r.note?` · ${esc(r.note)}`:''}${r.source?` <a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`:''}</small>`;
}
export function languageCard(extra){
  return `<section class="language-note"><div><p class="eyebrow">WORDS OF A PLACE</p><h3>How the country speaks.</h3><h4>Official & spoken languages</h4><p>${esc(extra.languageText)}</p>${extra.languageNote?`<details><summary>Language context</summary><p>${esc(extra.languageNote)}</p></details>`:''}<a class="context-source" href="${esc(extra.languageSource)}" target="_blank" rel="noopener noreferrer">Language source ↗</a></div><div class="writing-samples">${extra.transcripts?.length?`<p class="context-kicker">A SENTENCE IN ${esc(extra.transcripts[0].language.toUpperCase())}</p><figure class="sentence-sample"><blockquote dir="auto">${esc(extra.transcripts[0].text)}</blockquote><figcaption>${esc(extra.transcripts[0].language)}<span>English: ${esc(extra.transcripts[0].meaning)}</span></figcaption><a class="context-source" href="${esc(extra.source)}" target="_blank" rel="noopener noreferrer">Written-sample source ↗</a></figure>`:''}<p class="context-kicker">THE COUNTRY’S NAME, IN ITS OWN WORDS</p>${extra.writingSamples.slice(0,4).map(s=>`<figure><blockquote dir="auto">${esc(s.text)}</blockquote><figcaption>${esc(s.language)} · ${esc(s.kind)}<span>English: ${esc(s.meaning)}</span></figcaption></figure>`).join('')}${extra.writingSamples.length>4?`<details><summary>${extra.writingSamples.length-4} more writing samples</summary>${extra.writingSamples.slice(4).map(s=>`<p><bdi>${esc(s.text)}</bdi> · ${esc(s.language)}</p>`).join('')}</details>`:''}<a class="context-source" href="${esc(extra.namesSource)}" target="_blank" rel="noopener noreferrer">Native-name source ↗</a></div></section>`;
}
