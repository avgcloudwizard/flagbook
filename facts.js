import {COUNTRIES} from './countries.js';
import {Globe,loadAtlas} from './globe.js?v=7';
import {esc,normalize,loadJSON} from './explore-data.js?v=7';
import {FACTS_KEY,chooseFact,dailyFact,readFactState} from './facts-core.js';
const $=id=>document.getElementById(id),names=new Map(COUNTRIES.map(c=>[c.code,c.name]));
let data,atlas,globe,pending,current,seen=new Set(),saved=new Set(),history=[],position=-1,revealed=true,quiz=false,storageOK=true;
function persist(){try{localStorage.setItem(FACTS_KEY,JSON.stringify({seen:[...seen],saved:[...saved]}));}catch{storageOK=false;$('facts-storage').textContent='This browser could not save your reading list. You can still browse and copy facts.';}}
function pool(){const category=$('facts-category').value,country=$('facts-country').value,q=normalize($('facts-search').value),kind=$('facts-kind').value;return data.facts.filter(f=>(!category||f.category===category)&&(!country||f.countries.includes(country))&&(!kind||f.kind===kind)&&(!$('facts-saved-only').checked||saved.has(f.id))&&(!q||normalize(f.title+' '+f.body+' '+f.countries.map(c=>names.get(c)).join(' ')).includes(q)));}
function show(f,{push=true}={}){if(!f){current=null;render();return;}current=f;revealed=!quiz||!f.question||!f.countries.length;if(push){history=history.slice(0,position+1);history.push(f.id);position=history.length-1;}seen.add(f.id);persist();render();}
function next(){show(chooseFact(pool(),seen,current));}
function updateFilter(){history=[];position=-1;next();}
function render(){
 const eligible=pool();$('facts-count').textContent=`${eligible.length.toLocaleString()} cards · ${eligible.filter(f=>!seen.has(f.id)).length.toLocaleString()} unread`;
 $('facts-saved-count').textContent=saved.size;$('facts-read-count').textContent=seen.size;
 $('fact-back').disabled=position<=0;$('fact-next').disabled=!eligible.length;
 $('fact-save').disabled=!current;$('fact-copy').disabled=!current||!revealed;$('fact-link').disabled=!current||!revealed;
 $('fact-save').textContent=current&&saved.has(current.id)?'★ Saved':'☆ Save';$('fact-save').setAttribute('aria-pressed',String(!!current&&saved.has(current.id)));
 $('fact-feedback').textContent='';
 if(!current){$('fact-card').innerHTML='<div class="fact-empty"><h2>No cards here yet.</h2><p>Try a different filter, or turn off “Saved only” to find something worth keeping.</p></div>';$('fact-place').hidden=true;return;}
 const f=current,known=revealed;
 $('fact-card').className='fact-card '+(known?'is-revealed':'is-question');
 $('fact-card').innerHTML=`<div class="fact-card-meta"><span>${esc(f.category)}</span><span>${f.kind==='data'?'Data card':'Field note'} · ${esc(f.year)}</span></div><div class="fact-reading"><p class="fact-place-label">${known?(f.countries.map(c=>esc(names.get(c))).join(' / ')||'Beyond borders'):'GUESS THE PLACE'}</p><h2>${esc(known?f.title:f.question)}</h2>${known?`<p class="fact-body">${esc(f.body)}</p>`:`<div class="fact-options">${choices(f).map(c=>`<button data-fact-choice="${c}">${esc(names.get(c))}</button>`).join('')}</div><button id="fact-reveal" class="text-button">Show me the answer</button>`}</div><div class="fact-card-foot">${known?`<a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">${esc(f.sourceLabel)} ↗</a>${f.topic?`<a href="#records?topic=${encodeURIComponent(f.topic)}&country=${f.countries[0]}">See the ranking →</a>`:''}`:'<span>The source and map appear after the answer.</span>'}</div>`;
 $('fact-place').hidden=!known;
 if(known){const code=f.countries[0];$('fact-map-title').textContent=code?names.get(code):'A shared planet';$('fact-map-link').hidden=!code;if(code){$('fact-map-link').href='#atlas?country='+code;$('fact-map-link').textContent='Explore '+names.get(code)+' →';globe?.select(code);}else globe?.select(null);globe?.resize();}
 $('fact-card').querySelectorAll('[data-fact-choice]').forEach(b=>b.onclick=()=>{const correct=f.countries.includes(b.dataset.factChoice);revealed=true;render();$('fact-feedback').textContent=correct?'Correct. Here’s the story.':'The answer is '+f.countries.map(c=>names.get(c)).join(' / ')+'.';});
 const reveal=$('fact-reveal');if(reveal)reveal.onclick=()=>{revealed=true;render();};
}
function choices(f){const answer=f.countries[0],excluded=new Set([...f.countries,...(f.excludeChoices||[]),...data.facts.filter(x=>x.question===f.question).flatMap(x=>x.countries)]),others=COUNTRIES.filter(c=>!excluded.has(c.code)).sort(()=>Math.random()-.5).slice(0,3).map(c=>c.code);return [...others,answer].map(code=>({code,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.code);}
async function copy(link=false){if(!current)return;const text=link?new URL('#facts?id='+encodeURIComponent(current.id),location.href).href:`${current.title}\n\n${current.body}\n\nSource: ${current.source}\nhttps://avgcloudwizard.github.io/flagbook/#facts?id=${current.id}`;try{await navigator.clipboard.writeText(text);$('fact-feedback').textContent=link?'Link copied.':'Fact and source copied.';}catch{$('fact-copy-fallback').hidden=false;$('fact-copy-text').value=text;$('fact-copy-text').focus();$('fact-copy-text').select();$('fact-feedback').textContent='Copy the selected text below.';}}
export async function startFacts(params=new URLSearchParams()){
 const apply=()=>{const id=params.get('id');if(id&&data.facts.some(f=>f.id===id)){for(const key of ['facts-category','facts-country','facts-kind','facts-search'])$(key).value='';$('facts-saved-only').checked=false;show(data.facts.find(f=>f.id===id));}else if(!current)show(data.facts[0]);else{render();globe?.resize();}};
 if(data){apply();return;}if(pending)return pending;
 pending=(async()=>{try{
  [data,atlas]=await Promise.all([loadJSON('data/fun-facts.json'),loadAtlas()]);
  let raw;try{raw=localStorage.getItem(FACTS_KEY);}catch{storageOK=false;}
  ({seen,saved}=readFactState(raw,new Set(data.facts.map(f=>f.id))));
  $('facts-category').innerHTML='<option value="">All subjects</option>'+[...new Set(data.facts.map(f=>f.category))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
  $('facts-country').innerHTML='<option value="">Anywhere in the world</option>'+COUNTRIES.map(c=>`<option value="${c.code}">${esc(c.name)}</option>`).join('');
  $('facts-intro-count').textContent=`${data.facts.length.toLocaleString()} cards: ${data.counts.story.toLocaleString()} stories and geographic notes, plus ${data.counts.data.toLocaleString()} facts from country data.`;
  for(const id of ['facts-category','facts-country','facts-kind','facts-saved-only']){$(id).disabled=false;$(id).addEventListener('change',updateFilter);}
  $('facts-search').disabled=false;let searchTimer;$('facts-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(updateFilter,250);});
  $('fact-next').onclick=next;$('fact-back').onclick=()=>{if(position>0){position--;show(data.facts.find(f=>f.id===history[position]),{push:false});}};
  $('fact-save').onclick=()=>{if(!current)return;saved.has(current.id)?saved.delete(current.id):saved.add(current.id);persist();if($('facts-saved-only').checked&&!saved.has(current.id))next();else render();};
  $('facts-quiz').onchange=()=>{quiz=$('facts-quiz').checked;revealed=!quiz||!current?.question||!current?.countries.length;render();};
  $('fact-daily').onclick=()=>{for(const id of ['facts-category','facts-country','facts-kind','facts-search'])$(id).value='';$('facts-saved-only').checked=false;show(dailyFact(data.facts,new Date().toLocaleDateString('en-CA')));};
  $('fact-copy').onclick=()=>copy();$('fact-link').onclick=()=>copy(true);
  document.addEventListener('keydown',e=>{if($('facts-view').hidden||e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,button,a,[contenteditable]'))return;if(e.key==='ArrowRight'){e.preventDefault();next();}else if(e.key==='ArrowLeft'&&position>0){e.preventDefault();$('fact-back').click();}});
  globe=new Globe($('fact-globe'),atlas,{interactive:false,compact:true});apply();
 }catch{data=null;$('fact-card').innerHTML='<h2>Facts couldn’t load.</h2><button id="facts-retry" class="secondary">Try again</button>';$('facts-retry').onclick=()=>startFacts(params);}finally{pending=null;}})();return pending;
}
