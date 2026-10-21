import {COUNTRIES} from './countries.js';
import {esc,normalize,continentForRegion,loadRecords,loadExtras,loadJSON,formatValue} from './explore-data.js?v=8';
const names=new Map(COUNTRIES.map(c=>[c.code,c.name]));
const $=id=>document.getElementById(id);
let data,extras,details,pending,bound=false,categories=[];
const countryLinks=e=>(e.countries||[e.code]).map(code=>`<a href="#atlas?country=${code}">${esc(names.get(code))} ↗</a>`).join(' · ');
export function topFive(item){return item.entries.filter(e=>e.rank<=5);}
export function rankingList(item,code=''){
 return `<ol class="record-ranking">${topFive(item).map(e=>`<li class="${e.code===code||e.countries?.includes(code)?'your-country':''}"><span class="rank-number">${String(e.rank).padStart(2,'0')}</span>${e.code?`<img src="assets/flags/${e.code}.svg" alt="">`:'<span class="rank-mark" aria-hidden="true">↗</span>'}<div class="rank-label"><strong>${esc(e.name||names.get(e.code))}</strong><small>${countryLinks(e)}</small>${e.route?`<p>${esc(e.route)}</p>`:''}</div><b class="rank-value">${formatValue(e.value,item.unit,true)}</b><div class="record-bar" aria-hidden="true"><i style="width:${Math.max(1,e.value/item.entries[0].value*100)}%"></i></div></li>`).join('')}</ol>`;
}
function selectedCountry(item,code){
 if(!code)return '';
 const e=item.entries.find(e=>e.code===code||e.countries?.includes(code));
 return `<div class="country-standing"><img src="assets/flags/${code}.svg" alt=""><div><span>${esc(names.get(code))} · ${esc(item.label)}</span><strong>${e?`${e.name?esc(e.name)+' · ':''}#${e.rank} · ${formatValue(e.value,item.unit)}`:'No reported entry'}</strong><small>${e?'Rank among the reporting countries or features in this source.':'Missing coverage does not mean zero.'}</small></div></div>`;
}
export function countryHighlights(code,extra){return `<div class="country-geography"><section><p class="context-kicker">Highest point</p><h3>${esc(extra.highestPoint.split(';')[0])}</h3></section><section><p class="context-kicker">Longest listed river</p><h3>${extra.rivers.length?`${esc(extra.rivers[0].name)} · ${formatValue(extra.rivers[0].length,'km')}`:'No length-ranked river in this source'}</h3><p>${esc(extra.riverNote)}</p>${extra.rivers[0]?.source?`<a class="context-source" href="${esc(extra.rivers[0].source)}" target="_blank" rel="noopener noreferrer">River source ↗</a>`:''}</section></div>`;}
function countryOverview(code){
 if(!code)return '';
 const wins=data.items.flatMap(item=>{const e=item.entries.find(e=>(e.code===code||e.countries?.includes(code))&&e.rank<=5);return e?[{item,e}]:[];});
 return `<details class="records-country-summary"><summary>${esc(names.get(code))}: ${wins.length} top-five appearances & geographic notes</summary>${countryHighlights(code,extras[code])}<div class="record-badges">${wins.map(({item,e})=>`<button data-record-topic="${item.id}"><span>#${e.rank}</span>${esc(item.label)}<small>${esc(item.year)}</small></button>`).join('')||'<p>No top-five entry in this catalogue.</p>'}</div><a class="context-source" href="${esc(extras[code].source)}" target="_blank" rel="noopener noreferrer">Geography source ↗</a></details>`;
}
function topics(){const category=$('records-category').value,q=normalize($('records-search').value);return data.items.filter(i=>(!category||i.category===category)&&(!q||normalize(i.label+' '+i.category+' '+i.group+' '+(i.measure||'')).includes(q)));}
function populateTopics(selected){
 const group=topics();$('records-topic').innerHTML=group.map(i=>`<option value="${i.id}">${esc(i.label)} · ${esc(i.year)}</option>`).join('');
 if(group.some(i=>i.id===selected))$('records-topic').value=selected;
 $('records-topic').disabled=!group.length;
 $('records-matches').textContent=`${group.length} of ${data.items.length} topics`;
}
export function visibleEntries(item,{continent='',limit=10,details={}}={}){
 const rows=item.entries.filter(e=>!continent||(e.countries||[e.code]).some(c=>details[c]&&continentForRegion(details[c].region)===continent));
 return limit==='all'?rows:rows.slice(0,Number(limit));
}
function renderTable(item,code){
 const rows=visibleEntries(item,{continent:$('records-region').value,limit:$('records-limit').value,details});
 $('record-table').innerHTML=`<table class="rank-table"><caption class="visually-hidden">${esc(item.label)} · ${esc(item.year)}. Ranks within this catalogue are retained when a continent is selected.</caption><thead><tr><th scope="col">Rank</th><th scope="col">${item.entries[0].name?'Place / feature':'Country'}</th><th scope="col">${esc(item.unit)}</th><th scope="col">${item.worldTotal?'World share':(/^\d{4}$/.test(item.year)?'Change vs '+(Number(item.year)-1):'Change')}</th></tr></thead><tbody>${rows.map(e=>{const share=item.worldTotal?e.value/item.worldTotal*100:null,change=e.previous>0?(e.value/e.previous-1)*100:null;return `<tr class="${e.code===code||e.countries?.includes(code)?'selected-row':''}"><td>${e.rank}</td><th scope="row"><div class="table-place">${e.code?`<img src="assets/flags/${e.code}.svg" alt="">`:''}<div>${e.code?`<button data-record-country="${e.code}">${esc(e.name||names.get(e.code))}</button>`:`<strong>${esc(e.name)}</strong>`}<small>${e.countries?countryLinks(e):`<a href="#atlas?country=${e.code}">On the map ↗</a>`}</small>${e.observed?`<small class="entry-date">As reported: ${esc(e.observed)}</small><small><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">${esc(e.sourceLabel)} ↗</a></small>`:''}${e.route?`<p>${esc(e.route)}</p>`:''}<i class="table-value-bar" style="width:${Math.max(.5,e.value/item.entries[0].value*100)}%" aria-hidden="true"></i></div></div></th><td title="${esc(formatValue(e.value,item.unit))}">${new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(e.value)}</td><td>${share!==null?share.toFixed(1)+'%':change!==null?(change>0?'+':'')+change.toFixed(1)+'%':'—'}</td></tr>`;}).join('')}</tbody></table>${rows.length?'':'<p class="empty-inline">No reported entries for this continent.</p>'}`;
 $('record-table').querySelectorAll('[data-record-country]').forEach(b=>b.onclick=()=>{$('records-country').value=b.dataset.recordCountry;render();});
 $('record-table-count').textContent=`${rows.length} shown · ${item.entries.length} reported entries. ${$('records-region').value?'Catalogue ranks are retained.':''}`;
}
function render(){
 const item=data.items.find(i=>i.id===$('records-topic').value);
 if(!item){$('records-results').innerHTML='<div class="empty-inline">No matching topics. Try a broader search or choose All categories.</div>';$('records-status').textContent='No matching topics';return;}
 const code=$('records-country').value,lead=item.entries[0],numericYear=/^\d{4}$/.test(item.year),hasPrevious=item.entries.some(e=>e.previous>0);
 $('records-results').innerHTML=`<article class="record-sheet"><div class="record-sheet-heading"><div><p class="record-label">${esc(item.category)} / ${esc(item.year)}</p><h2>${esc(item.label)}</h2><p>${esc(item.measure||item.note)}</p></div><div class="record-leader"><span>01 · Leading entry</span><strong>${esc(lead.name||names.get(lead.code))}</strong><b>${formatValue(lead.value,item.unit,true)}</b></div></div><div class="record-context"><span>${item.entries.length} reported entries</span><span>Source checked ${esc(item.checked||data.checked)}</span>${item.sourceUpdated?`<span>Source updated ${esc(item.sourceUpdated)}</span>`:''}<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a></div>${item.notice?`<p class="record-notice">${esc(item.notice)}</p>`:''}${item.commodity?`<div class="mineral-switch" role="group" aria-label="Compare measures for this mineral">${data.items.filter(i=>i.commodity===item.commodity).map(i=>`<button data-record-topic="${i.id}" aria-pressed="${i.id===item.id}">${esc(i.id==='gold-holdings'?'Official holdings':i.label.split(' — ')[1])}</button>`).join('')}</div>`:''}${selectedCountry(item,code)}<div class="rank-controls"><label>Show<select id="records-limit"><option value="5">Top 5</option><option value="10" selected>Top 10</option><option value="25">Top 25</option><option value="all">All reported entries</option></select></label><label>Continent<select id="records-region"><option value="">Worldwide</option>${['Africa','Asia','Europe','North America','South America','Oceania'].map(c=>`<option>${c}</option>`).join('')}</select></label><button id="records-download" class="text-button">Download this table ↓</button></div><p class="table-note">${item.worldTotal?'Share of the source’s world total.':numericYear&&hasPrevious?'Change uses the preceding year, where available.':'Ranks cover the entries reported here.'}${item.worldTotal||hasPrevious?' Percent changes and shares are rounded.':''}</p><div id="record-table" class="record-table-wrap ${!hasPrevious&&!item.worldTotal?'no-change':''}"></div><p id="record-table-count" class="table-note"></p><details class="record-method"><summary>Definitions & coverage</summary><p>${esc(item.note)}</p><p>${esc(item.coverage)}</p>${lead.detail?`<p>${esc(lead.detail)}</p>`:''}<p>Observation year and source-update date are different. Higher values are not always better; ranks describe the reported measure.</p></details></article>${countryOverview(code)}`;
 const last=tableState.get(item.id);if(last){$('records-limit').value=last.limit;$('records-region').value=last.region;}
 const table=()=>{tableState.set(item.id,{limit:$('records-limit').value,region:$('records-region').value});renderTable(item,code);};
 $('records-limit').onchange=table;$('records-region').onchange=table;table();
 $('records-download').onclick=()=>{const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';const text=[['Rank','Country or feature','Value','Unit','Observation year','Source'],...item.entries.map(e=>[e.rank,e.name||names.get(e.code),e.value,item.unit,e.observed||item.year,e.source||item.source])].map(r=>r.map(cell).join(',')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='flagbook-'+item.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('records-status').textContent=`${item.label}${code?' · '+names.get(code):''}`;
 $('records-results').querySelectorAll('[data-record-topic]').forEach(b=>b.onclick=()=>openTopic(b.dataset.recordTopic));
}
const tableState=new Map();
function openTopic(id){const item=data.items.find(i=>i.id===id);if(!item)return;$('records-search').value='';$('records-category').value=item.category;populateTopics(item.id);render();}
export async function startRecords(params=new URLSearchParams()){
 if(pending)return pending;
 const apply=()=>{const topic=params.get('topic');if(categories.includes(params.get('category')))$('records-category').value=params.get('category');if(names.has(params.get('country')))$('records-country').value=params.get('country');if(topic&&data.items.some(i=>i.id===topic))openTopic(topic);else{populateTopics(data.items.some(i=>i.id===$('records-topic').value)?$('records-topic').value:'cocoa');render();}};
 if(data){apply();return;}
 $('records-status').textContent='Loading the catalogue…';
 pending=(async()=>{try{
  [data,extras,details]=await Promise.all([loadRecords(),loadExtras(),loadJSON('data/country-details.json')]);categories=[...new Set(data.items.map(i=>i.category))].sort();
  $('records-category').innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');
  $('records-country').innerHTML='<option value="">All countries</option>'+COUNTRIES.map(c=>`<option value="${c.code}">${esc(c.name)}</option>`).join('');
  $('records-total').textContent=`${data.items.length} topics · ${data.items.reduce((n,i)=>n+i.entries.length,0).toLocaleString()} reported entries`;
  if(!bound){$('records-category').addEventListener('change',()=>{populateTopics();render();});$('records-search').addEventListener('input',()=>{populateTopics();render();});$('records-topic').addEventListener('change',render);$('records-country').addEventListener('change',render);document.querySelectorAll('[data-topic-shortcut]').forEach(b=>b.onclick=()=>openTopic(b.dataset.topicShortcut));bound=true;}
  for(const id of ['records-category','records-topic','records-country','records-search'])$(id).disabled=false;apply();
 }catch{data=null;$('records-status').textContent='The catalogue couldn’t load.';$('records-results').innerHTML='<button class="secondary" id="records-retry">Try again</button>';$('records-retry').onclick=()=>startRecords(params);}finally{pending=null;}})();return pending;
}
export function bindSectorRankings(container,code){
  const panel=container.querySelector('.sector-rankings');if(!panel)return;
  let active='';
  const show=async category=>{
    active=category;panel.hidden=false;panel.innerHTML='<p role="status">Loading the leaders…</p>';
    container.querySelectorAll('[data-sector-category]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.sectorCategory===category)));
    try{
      const catalogue=await loadRecords();if(active!==category||!container.contains(panel))return;
      const group=catalogue.items.filter(i=>i.category===category||(category==='Industry'&&['Textiles','Energy','Metals & Minerals'].includes(i.category))||(category==='Agriculture'&&i.category==='Food & livestock'));
      const relevant=group.filter(i=>i.entries.some(e=>e.code===code&&e.rank<=5));
      const initial=(relevant[0]||group[0]).id;
      panel.innerHTML=`<div class="section-heading"><div><p class="eyebrow">${esc(category.toUpperCase())} · WORLD LEADERS</p><h4>What ranks where?</h4></div><button class="text-button sector-close">Close</button></div><p class="context-fineprint">${relevant.length?`${esc(names.get(code))} appears in the top five for ${relevant.slice(0,8).map(i=>esc(i.label.toLowerCase())).join(', ')}${relevant.length>8?` and ${relevant.length-8} more measures`:''}.`:'Compare products and see where this country appears in the available data.'}</p><label class="sector-topic-label">Choose a measure<select class="sector-topic">${group.map(i=>`<option value="${i.id}">${esc(i.label)}</option>`).join('')}</select></label><div class="sector-ranking-result"></div><a class="text-link" href="#records?category=${encodeURIComponent(category)}&country=${code}">Open the full record book ↗</a>`;
      const select=panel.querySelector('select');select.value=initial;
      const update=()=>{const item=group.find(i=>i.id===select.value);panel.querySelector('.sector-ranking-result').innerHTML=`${selectedCountry(item,code)}${rankingList(item,code)}<div class="record-method"><p>${esc(item.notice||'')} ${esc(item.note)}</p><small>${esc(item.year)} · ${esc(item.coverage)}</small><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceLabel)} ↗</a></div>`;};
      select.addEventListener('change',update);update();panel.querySelector('.sector-close').onclick=()=>{active='';panel.hidden=true;container.querySelectorAll('[data-sector-category]').forEach(b=>b.setAttribute('aria-expanded','false'));};
    }catch{panel.innerHTML='<p>Rankings couldn’t load. Choose a sector to try again.</p>';}
  };
  container.querySelectorAll('[data-sector-category]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.sectorCategory)));
}
