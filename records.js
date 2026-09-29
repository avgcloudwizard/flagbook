import {COUNTRIES} from './countries.js';
import {esc,loadRecords,loadExtras,formatValue} from './explore-data.js';
import {landscape} from './landscape.js';
const names=new Map(COUNTRIES.map(c=>[c.code,c.name]));
const $=id=>document.getElementById(id);
let data,extras,pending,bound=false;
const categories=['Nature','Agriculture','Textiles','Industry','Services'];
const countryLinks=entry=>(entry.countries||[entry.code]).map(code=>`<a href="#atlas?country=${code}">${esc(names.get(code))} ↗</a>`).join(' · ');
export function topFive(item){return item.entries.filter(e=>e.rank<=5);}
export function rankingList(item,code=''){
  return `<ol class="record-ranking">${topFive(item).map(e=>`<li class="${e.code===code||e.countries?.includes(code)?'your-country':''}"><span class="rank-number">${String(e.rank).padStart(2,'0')}</span>${e.code?`<img src="assets/flags/${e.code}.svg" alt="">`:'<span class="rank-mark" aria-hidden="true">↗</span>'}<div class="rank-label"><strong>${esc(e.name||names.get(e.code))}</strong><small>${e.countries?countryLinks(e):`<a href="#atlas?country=${e.code}">Find on the atlas ↗</a>`}</small>${e.route?`<p>${esc(e.route)}</p>`:''}</div><b class="rank-value">${formatValue(e.value,item.unit,true)}</b><div class="record-bar" aria-hidden="true"><i style="width:${Math.max(1,e.value/item.entries[0].value*100)}%"></i></div></li>`).join('')}</ol>`;
}
function selectedCountry(item,code){
  if(!code)return '';
  const entry=item.entries.find(e=>e.code===code||e.countries?.includes(code));
  return `<div class="country-standing"><img src="assets/flags/${code}.svg" alt=""><div><span>${esc(names.get(code))} · ${esc(item.label)}</span><strong>${entry?`${entry.name?esc(entry.name)+' · ':''}#${entry.rank} · ${formatValue(entry.value,item.unit)}`:'No ranked entry in this dataset'}</strong><small>${entry?'Position in the cited dataset.':'This is missing coverage, not a claim that the country has none.'}</small></div></div>`;
}
export function countryHighlights(code,extra){
  return `<div class="country-geography"><section><span class="geography-symbol" aria-hidden="true">△</span><p class="context-kicker">HIGHEST POINT</p><h3>${esc(extra.highestPoint.split(';')[0])}</h3></section><section><span class="geography-symbol" aria-hidden="true">≈</span><p class="context-kicker">LONGEST LISTED RIVER</p><h3>${extra.rivers.length?`${esc(extra.rivers[0].name)} · ${formatValue(extra.rivers[0].length,'km')}`:'No length-ranked river in this source'}</h3><p>${esc(extra.riverNote)}</p>${extra.rivers[0]?.source?`<a class="context-source" href="${esc(extra.rivers[0].source)}" target="_blank" rel="noopener noreferrer">River source ↗</a>`:''}</section></div>`;
}
function renderCountryOverview(code){
  if(!code)return '';
  const wins=data.items.flatMap(item=>{const e=item.entries.find(e=>(e.code===code||e.countries?.includes(code))&&e.rank<=5);return e?[{item,e}]:[];});
  return `<section class="records-country-summary"><div class="section-heading"><div><p class="eyebrow">YOUR COUNTRY LENS</p><h2>${esc(names.get(code))}, in perspective.</h2></div><a class="text-link" href="#atlas?country=${code}">Find it on the globe ↗</a></div>${countryHighlights(code,extras[code])}<h3>Where it appears in the top five</h3><div class="record-badges">${wins.length?wins.map(({item,e})=>`<button data-record-topic="${item.id}"><span>#${e.rank}</span>${esc(item.label)}<small>${esc(item.year)}</small></button>`).join(''):'<p class="muted">No top-five entry in this catalogue. Explore a topic below for any recorded value.</p>'}</div><a class="context-source" href="${esc(extras[code].source)}" target="_blank" rel="noopener noreferrer">Country geography source ↗</a></section>`;
}
function populateTopics(selected){
  const group=data.items.filter(i=>i.category===$('records-category').value);
  $('records-topic').innerHTML=group.map(i=>`<option value="${i.id}">${esc(i.label)}</option>`).join('');
  if(group.some(i=>i.id===selected))$('records-topic').value=selected;
}
function render(){
  const item=data.items.find(i=>i.id===$('records-topic').value);if(!item)return;
  const code=$('records-country').value,leader=item.entries[0];
  $('records-results').innerHTML=`${renderCountryOverview(code)}<article class="record-feature theme-${item.art}"><div class="record-hero">${landscape(item.art)}<div class="record-hero-copy"><p class="eyebrow">${esc(item.category.toUpperCase())} · ${esc(item.year)}</p><h2>${esc(item.label)}.</h2><p class="record-superlative">${item.category==='Nature'?'A world of extremes.':'The places behind the products.'}</p><div class="record-champion"><span>01 / ${item.category==='Nature'?'THE RECORD':'LEADING COUNTRY'}</span><h3>${esc(leader.name||names.get(leader.code))}</h3><strong>${formatValue(leader.value,item.unit,true)}</strong></div></div></div><div class="record-body">${selectedCountry(item,code)}<div class="section-heading"><h3>The top five</h3><span class="small-tag">${esc(item.year)}</span></div>${rankingList(item,code)}${leader.detail?`<p class="record-story">${esc(leader.detail)}</p>`:''}<div class="record-method"><p>${esc(item.note)}</p><small>${esc(item.coverage)}</small><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a></div></div></article>`;
  $('records-status').textContent=`${item.label}${code?' · '+names.get(code):' · worldwide'}`;
  $('records-results').querySelectorAll('[data-record-topic]').forEach(button=>button.addEventListener('click',()=>{const target=data.items.find(i=>i.id===button.dataset.recordTopic);$('records-category').value=target.category;populateTopics(target.id);render();}));
}
export async function startRecords(params=new URLSearchParams()){
  if(pending)return pending;
  const apply=()=>{
    if(categories.includes(params.get('category')))$('records-category').value=params.get('category');
    if(params.get('country')&&names.has(params.get('country')))$('records-country').value=params.get('country');
    populateTopics(params.get('topic')||$('records-topic').value);render();
  };
  if(data){apply();return;}
  $('records-status').textContent='Opening the world’s record book…';
  pending=(async()=>{try{
    [data,extras]=await Promise.all([loadRecords(),loadExtras()]);
    $('records-category').innerHTML=categories.map(c=>`<option>${c}</option>`).join('');
    $('records-country').innerHTML='<option value="">All countries · worldwide</option>'+[...COUNTRIES].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.code}">${esc(c.name)}</option>`).join('');
    if(!bound){$('records-category').addEventListener('change',()=>{populateTopics();render();});$('records-topic').addEventListener('change',render);$('records-country').addEventListener('change',render);bound=true;}
    for(const id of ['records-category','records-topic','records-country'])$(id).disabled=false;
    apply();
  }catch{data=null;$('records-status').textContent='The record book couldn’t load.';$('records-results').innerHTML='<button class="secondary" id="records-retry">Try again</button>';$('records-retry').onclick=()=>startRecords(params);}finally{pending=null;}})();return pending;
}
export function bindSectorRankings(container,code){
  const panel=container.querySelector('.sector-rankings');if(!panel)return;
  let active='';
  const show=async category=>{
    active=category;panel.hidden=false;panel.innerHTML='<p role="status">Loading the leaders…</p>';
    container.querySelectorAll('[data-sector-category]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sectorCategory===category)));
    try{
      const catalogue=await loadRecords();if(active!==category||!container.contains(panel))return;
      const group=catalogue.items.filter(i=>i.category===category||(category==='Industry'&&i.category==='Textiles'));
      const relevant=group.filter(i=>i.entries.some(e=>e.code===code&&e.rank<=5));
      const initial=(relevant[0]||group[0]).id;
      panel.innerHTML=`<div class="section-heading"><div><p class="eyebrow">${esc(category.toUpperCase())} · WORLD LEADERS</p><h4>What ranks where?</h4></div><button class="text-button sector-close">Close</button></div><p class="context-fineprint">${relevant.length?`${esc(names.get(code))} appears in the top five for ${relevant.map(i=>esc(i.label.toLowerCase())).join(', ')}.`:'Compare products and see where this country appears in the available data.'}</p><label class="sector-topic-label">Choose a measure<select class="sector-topic">${group.map(i=>`<option value="${i.id}">${esc(i.label)}</option>`).join('')}</select></label><div class="sector-ranking-result"></div><a class="text-link" href="#records?category=${encodeURIComponent(category)}&country=${code}">Open the full record book ↗</a>`;
      const select=panel.querySelector('select');select.value=initial;
      const update=()=>{const item=group.find(i=>i.id===select.value);panel.querySelector('.sector-ranking-result').innerHTML=`${selectedCountry(item,code)}${rankingList(item,code)}<div class="record-method"><p>${esc(item.note)}</p><small>${esc(item.year)} · ${esc(item.coverage)}</small><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a></div>`;};
      select.addEventListener('change',update);update();panel.querySelector('.sector-close').onclick=()=>{active='';panel.hidden=true;container.querySelectorAll('[data-sector-category]').forEach(b=>b.setAttribute('aria-expanded','false'));};
    }catch{panel.innerHTML='<p>Rankings couldn’t load. Choose a sector to try again.</p>';}
  };
  container.querySelectorAll('[data-sector-category]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.sectorCategory)));
}
