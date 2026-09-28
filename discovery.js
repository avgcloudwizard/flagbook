import {Globe,loadAtlas} from './globe.js';
export const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mounted=new WeakMap();
export function clearDiscovery(container){const old=mounted.get(container);old?.globe?.destroy();mounted.set(container,{});container.hidden=true;container.innerHTML='';}
export async function showDiscovery(container,code){
  clearDiscovery(container);const token={};mounted.set(container,token);container.hidden=false;
  container.innerHTML='<div class="guide-loading" role="status">Opening your country field notes…</div>';
  try{
    const atlas=await loadAtlas();if(mounted.get(container)!==token)return;const c=atlas.details[code];
    const pop=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(c.population.value);
    const capitals=c.capitals.join(' · ');
    container.innerHTML=`<article class="discovery-card" aria-label="Discover ${esc(c.name)}">
      <div class="discovery-heading"><div><p class="eyebrow">BEYOND THE FLAG</p><h2>${esc(c.name)}<span class="country-dot">.</span></h2><p class="region-label">${esc(c.region)}</p></div><img class="discovery-flag" src="assets/flags/${code}.svg" alt="Flag of ${esc(c.name)}"></div>
      <div class="discovery-main"><div class="mini-world"><div class="mini-world-label"><span>FIND IT ON EARTH</span><span aria-hidden="true">↗</span></div><canvas class="mini-globe" role="img" aria-label="Globe with ${esc(c.name)} highlighted"></canvas><p class="globe-caption"><span class="legend-dot"></span> ${esc(c.name)} <span class="coordinates">${Math.abs(c.coordinates[0]).toFixed(1)}° ${c.coordinates[0]<0?'S':'N'} · ${Math.abs(c.coordinates[1]).toFixed(1)}° ${c.coordinates[1]<0?'W':'E'}</span></p></div>
      <div class="country-story"><p class="eyebrow">COLOURS WITH A STORY</p><h3>More than a pattern.</h3>${c.flagStory.slice(0,2).map(p=>`<p>${esc(p)}</p>`).join('')}${c.flagStory.length>2?`<details class="story-more"><summary>A little more history</summary>${c.flagStory.slice(2).map(p=>`<p>${esc(p)}</p>`).join('')}</details>`:''}${c.flagNote?`<p class="source-note">${esc(c.flagNote)}</p>`:''}</div></div>
      <div class="country-numbers"><div><span class="metric-icon" aria-hidden="true">⌖</span><span>${c.capitals.length>1?'CAPITALS / SEATS':'CAPITAL / SEAT'}</span><strong>${esc(capitals)}</strong></div><div><span class="metric-icon" aria-hidden="true">◉</span><span>POPULATION · ${c.population.year}</span><strong title="${c.population.value.toLocaleString('en')}">${pop}</strong><small>${c.population.value.toLocaleString('en')} people · ${esc(c.population.source)}</small></div><div><span class="metric-icon" aria-hidden="true">◎</span><span>${c.currencies.length>1?'CURRENCIES':'CURRENCY'}</span><strong class="currency-value">${c.currencies.map(v=>`${esc(v.name)} <small>${esc(v.code)}</small>`).join('<br>')}</strong></div></div>
      ${c.capitalNote?`<p class="capital-note">${esc(c.capitalNote)}</p>`:''}
      <div class="facts-heading"><h3>Three things to take with you.</h3><span class="small-tag">FIELD NOTES</span></div><div class="fun-facts">${c.facts.map((f,i)=>`<section><span class="fact-index">0${i+1}</span><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></section>`).join('')}</div>
      <div class="guide-sources"><span>Sources & further reading</span><a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">World Factbook archive ↗</a><a href="${esc(c.population.url)}" target="_blank" rel="noopener noreferrer">Population data ↗</a>${c.extraSource?`<a href="${esc(c.extraSource)}" target="_blank" rel="noopener noreferrer">Country update ↗</a>`:''}<small>Guide checked September 2026. Population is a dated estimate.</small></div>
    </article>`;
    token.globe=new Globe(container.querySelector('canvas'),atlas,{interactive:false,compact:true});token.globe.select(code);
  }catch{
    if(mounted.get(container)!==token)return;
    container.innerHTML='<div class="guide-loading"><p>The country guide couldn’t load. Your attempt is still saved.</p><button class="secondary">Try loading the guide again</button></div>';
    container.querySelector('button').addEventListener('click',()=>showDiscovery(container,code));
  }
}
