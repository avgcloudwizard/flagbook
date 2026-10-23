import {COUNTRIES} from './countries.js';
import {loadAtlas} from './globe.js?v=11';
import {esc,normalize,loadJSON} from './explore-data.js?v=8';
import {FACTS_KEY,chooseFact,dailyFact,readFactState,filterFacts} from './facts-core.js?v=14';
import {connectionMap} from './facts-map.js?v=14';
const $=id=>document.getElementById(id),names=new Map(COUNTRIES.map(c=>[c.code,c.name]));
let data,atlas,pending,current,seen=new Set(),saved=new Set(),history=[],position=-1,revealed=true,quiz=false;
const expanded=new Set();let mapWorld=false;
function persist(){try{localStorage.setItem(FACTS_KEY,JSON.stringify({seen:[...seen],saved:[...saved]}));}catch{$('facts-storage').textContent='Reading history could not be saved in this browser. You can still browse and copy stories.';}}
function pool(){return filterFacts(data.facts,{category:$('facts-category').value,country:$('facts-country').value,region:$('facts-region').value,query:$('facts-search').value,savedOnly:$('facts-saved-only').checked,saved},names);}
function show(f,{push=true}={}){current=f||null;mapWorld=false;if(f){revealed=!quiz||!f.guess;if(push){history=history.slice(0,position+1);history.push(f.id);position=history.length-1;}seen.add(f.id);persist();}render();}
function next(){show(chooseFact(pool(),seen,current));}
function resetFilters(){for(const id of ['facts-category','facts-country','facts-region','facts-search'])$(id).value='';$('facts-saved-only').checked=false;}
function updateFilter(){history=[];position=-1;next();}
function sourceMarkup(f){return `<details id="fact-sources" class="fact-sources"><summary>Read the sources <span>${f.sources.length}</span></summary><ol>${f.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><span>${esc(s.publisher)}${s.published?` · ${esc(s.published)}`:''}</span></li>`).join('')}</ol><p>Claim checked ${esc(f.verified)}${f.accuracyNote?` · ${esc(f.accuracyNote)}`:''}</p></details>`;}
function renderMap(){
 if(!current||!revealed)return;
 const f=current;$('fact-map-title').textContent=f.map.type==='connection'?'Follow the connection':'Place the story';
 $('fact-map').innerHTML=connectionMap(f,atlas,{world:mapWorld});
 $('fact-map-caption').textContent=f.map.caption;
 $('fact-map-locations').innerHTML=f.map.locations.map((p,i)=>`<li><span>${i+1}</span><div>${esc(p.label)}${p.approximate?'<small>Approximate location</small>':''}</div></li>`).join('');
 $('fact-map-world').textContent=mapWorld?'Focus on these places':'See the wider world';
 $('fact-atlas-links').innerHTML=f.countries.map(c=>`<a href="#atlas?country=${c}">${esc(names.get(c))} ↗</a>`).join('');
}
function render(){
 const eligible=pool();$('facts-story').innerHTML=eligible.length?eligible.map(f=>`<option value="${esc(f.id)}">${esc(quiz&&!revealed&&current?.id===f.id?'Guess before opening this story':f.title)}</option>`).join(''):'<option>No matching stories</option>';$('facts-story').disabled=!eligible.length;if(current)$('facts-story').value=current.id;$('facts-count').textContent=`${eligible.length} ${eligible.length===1?'story':'stories'} · ${eligible.filter(f=>!seen.has(f.id)).length} unread`;
 $('facts-saved-count').textContent=saved.size;$('facts-read-count').textContent=seen.size;
 $('fact-back').disabled=position<=0;$('fact-next').disabled=!eligible.length;
 for(const id of ['fact-save','fact-copy','fact-link'])$(id).disabled=!current||(id!=='fact-save'&&!revealed);
 $('fact-save').textContent=current&&saved.has(current.id)?'★ Saved':'☆ Save';$('fact-save').setAttribute('aria-pressed',String(!!current&&saved.has(current.id)));
 $('fact-feedback').textContent='';$('fact-copy-fallback').hidden=true;
 $('fact-place').hidden=!current||!revealed;
 if(!current){$('fact-announcement').textContent='No stories match these filters.';$('fact-card').innerHTML='<div class="fact-empty"><p class="eyebrow">A SMALL, CAREFULLY CHOSEN COLLECTION</p><h2>No stories match yet.</h2><p>Try a broader place or topic, or clear your filters.</p><button id="facts-clear" class="secondary">Clear filters</button></div>';$('facts-clear').onclick=()=>{resetFilters();updateFilter();};return;}
 const f=current;$('fact-announcement').textContent=revealed?f.title:f.guess.question;$('fact-card').className='fact-card '+(revealed?'is-revealed':'is-question');
 const placeNames=f.places.join(' · ');
 $('fact-card').innerHTML=`<div class="fact-card-meta"><span>${esc(f.category)}</span><span>UNEXPECTED CONNECTIONS</span></div><div class="fact-reading"><p class="fact-place-label">${revealed?esc(placeNames):'A LITTLE DETOUR BEFORE THE STORY'}</p><h2 id="fact-story-title">${esc(revealed?f.title:f.guess.question)}</h2>${revealed?`<p class="fact-hook">${esc(f.hook)}</p><p class="fact-body">${esc(f.shortFact)}</p><details id="fact-explanation" class="fact-explanation" ${expanded.has(f.id)?'open':''}><summary>The story behind it <span aria-hidden="true">↗</span></summary><div class="fact-long-read">${f.explanation.split(/\n\n/).map(p=>`<p>${esc(p)}</p>`).join('')}${f.period?`<p class="fact-period">WHEN · ${esc(f.period)}</p>`:''}${f.map.type==='comparison'?comparisonMarkup(f):''}<div class="fact-related"><p class="eyebrow">KEEP FOLLOWING THE THREAD</p>${f.related.map(id=>data.facts.find(r=>r.id===id)).filter(Boolean).map(r=>`<button data-related="${esc(r.id)}">${esc(r.title)} <span aria-hidden="true">→</span></button>`).join('')}</div></div></details>`:`<div class="fact-options">${f.guess.options.map((o,i)=>`<button data-fact-choice="${i}">${esc(o)}</button>`).join('')}</div><button id="fact-reveal" class="text-button">Skip guessing — read the story</button>`}</div>${revealed?sourceMarkup(f):'<p class="fact-guess-note">Optional guessing. No score, no pressure.</p>'}`;
 if(revealed){$('fact-explanation').ontoggle=e=>{e.target.open?expanded.add(f.id):expanded.delete(f.id);};$('fact-card').querySelectorAll('[data-related]').forEach(b=>b.onclick=()=>{resetFilters();show(data.facts.find(r=>r.id===b.dataset.related));});renderMap();$('fact-card').querySelectorAll('[data-measure]').forEach(b=>b.onclick=()=>{const sea=b.dataset.measure==='sea';$('fact-card').querySelectorAll('[data-measure]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('mountain-measure-result').innerHTML=measurementText(f,sea);});}
 else{$('fact-card').querySelectorAll('[data-fact-choice]').forEach(b=>b.onclick=()=>{const correct=f.guess.options[Number(b.dataset.factChoice)]===f.guess.answer;revealed=true;render();$('fact-feedback').textContent=correct?'Exactly. Here’s how it happened.':`The answer is ${f.guess.answer}. Here’s the story.`;});$('fact-reveal').onclick=()=>{revealed=true;render();};}
}
function measurementText(f,sea){
 const c=f.map.comparison;if(!c)return '';
 return sea?c.seaLevel.map(p=>`<div><strong>${esc(p.label)}</strong><span>About ${p.value} ${esc(p.unit)} above sea level</span></div>`).join(''):`<div><strong>${esc(c.earthCentreAdvantage.label)}</strong><span>Its summit is about ${c.earthCentreAdvantage.value} ${esc(c.earthCentreAdvantage.unit)}, measured from Earth’s centre.</span></div>`;
}
function comparisonMarkup(f){
 return `<div class="mountain-comparison"><p class="eyebrow">CHANGE THE MEASUREMENT</p><div class="measurement-buttons"><button data-measure="sea" aria-pressed="true">Above sea level</button><button data-measure="centre" aria-pressed="false">From Earth’s centre</button></div><div id="mountain-measure-result" role="status">${measurementText(f,true)}</div><p>Different measurement origins; the numbers are not drawn to scale. Source: NOAA.</p></div>`;
}

async function copy(link=false){if(!current)return;const url=new URL('#facts?id='+encodeURIComponent(current.slug),location.href).href;const text=link?url:`${current.title}\n\n${current.shortFact}\n\n${current.sources.map(s=>s.title+': '+s.url).join('\n')}\n\n${url}`;try{await navigator.clipboard.writeText(text);$('fact-feedback').textContent=link?'Story link copied.':'Story and sources copied.';}catch{$('fact-copy-fallback').hidden=false;$('fact-copy-text').value=text;$('fact-copy-text').focus();$('fact-copy-text').select();}}
export async function startFacts(params=new URLSearchParams()){
 const apply=()=>{const id=params.get('id'),f=data.facts.find(f=>f.id===id||f.slug===id);if(f){resetFilters();show(f);}else if(!current)show(data.facts[0]);else render();};
 if(data){apply();return;}if(pending)return pending;
 pending=(async()=>{try{
  const [collection,mapData,topology]=await Promise.all([loadJSON('data/unexpected-connections.json?v=14'),loadAtlas(),loadJSON('data/world-50m.json')]);data=collection;atlas={...mapData,topology};
  let raw;try{raw=localStorage.getItem(FACTS_KEY);}catch{}
  ({seen,saved}=readFactState(raw,new Set(data.facts.map(f=>f.id))));
  $('facts-category').innerHTML='<option value="">All subjects</option>'+[...new Set(data.facts.map(f=>f.category))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
  const codes=new Set(data.facts.flatMap(f=>f.countries));$('facts-country').innerHTML='<option value="">All countries</option>'+COUNTRIES.filter(c=>codes.has(c.code)).map(c=>`<option value="${c.code}">${esc(c.name)}</option>`).join('');
  $('facts-region').innerHTML='<option value="">All regions</option>'+[...new Set(data.facts.flatMap(f=>f.regions))].sort().map(r=>`<option>${esc(r)}</option>`).join('');
  $('facts-intro-count').textContent=`${data.facts.length} stories about how people, places and ideas found each other. Follow a connection. Find something worth retelling.`;
  for(const id of ['facts-category','facts-country','facts-region','facts-saved-only']){$(id).disabled=false;$(id).onchange=updateFilter;}
  $('facts-search').disabled=false;let timer;$('facts-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(updateFilter,200);};
  $('facts-story').onchange=()=>show(data.facts.find(f=>f.id===$('facts-story').value));
  $('fact-next').onclick=next;$('fact-back').onclick=()=>{if(position>0){position--;show(data.facts.find(f=>f.id===history[position]),{push:false});}};
  $('fact-save').onclick=()=>{if(!current)return;saved.has(current.id)?saved.delete(current.id):saved.add(current.id);persist();if($('facts-saved-only').checked&&!saved.has(current.id))next();else render();};
  $('facts-quiz').onchange=()=>{quiz=$('facts-quiz').checked;revealed=!quiz||!current?.guess;render();};
  $('fact-daily').onclick=()=>{resetFilters();show(dailyFact(data.facts,new Date().toLocaleDateString('en-CA')));};
  $('fact-copy').onclick=()=>copy();$('fact-link').onclick=()=>copy(true);$('fact-map-world').onclick=()=>{mapWorld=!mapWorld;renderMap();};
  document.addEventListener('keydown',e=>{if($('facts-view').hidden||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,button,a,summary,[contenteditable]'))return;if(e.key==='ArrowRight'){e.preventDefault();next();}else if(e.key==='ArrowLeft'&&position>0){e.preventDefault();$('fact-back').click();}});
  apply();
 }catch(error){data=null;$('fact-card').innerHTML='<h2>Stories couldn’t load.</h2><button id="facts-retry" class="secondary">Try again</button>';$('facts-retry').onclick=()=>startFacts(params);}finally{pending=null;}})();return pending;
}
