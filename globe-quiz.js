import {COUNTRIES} from './countries.js';
import {BY_CODE} from './core.js';
import {Globe,loadAtlas} from './globe.js';
import {showDiscovery,clearDiscovery,esc} from './discovery.js';
import {GLOBE_KEY,checkGlobeAnswer,validateGlobeEvents,mergeGlobeEvents,globeSummary} from './globe-core.js';
const $=id=>document.getElementById(id);
let events=[],session=null,globe=null,atlas=null,starting=null,healthy=true;
try{const raw=localStorage.getItem(GLOBE_KEY);if(raw){const data=JSON.parse(raw);if(data.version!==1)throw new Error();events=validateGlobeEvents(data.events);if(data.session&&BY_CODE.has(data.session.code)&&['country','capital','complete'].includes(data.session.stage))session=data.session;}}
catch{healthy=false;}
function save(){if(!healthy)return;try{localStorage.setItem(GLOBE_KEY,JSON.stringify({version:1,events,session}));}catch{healthy=false;renderTotals();}}
export function getGlobeEvents(){return events;}
export function prepareGlobeImport(imported=[]){return mergeGlobeEvents(events,imported);}
export function applyGlobeImport(merged){events=merged;save();renderTotals();}
function message(text,type=''){ $('globe-feedback').textContent=text;$('globe-feedback').className=type; }
function record(type,answer,correct){events.push({id:crypto.randomUUID(),code:session.code,stage:session.stage,type,answer,correct,at:new Date().toISOString()});save();renderTotals();}
function choose(code){session={code,stage:'country'};globe.select(code,{focus:false});save();renderQuiz();$('globe-answer').focus({preventScroll:true});if(matchMedia('(max-width:980px)').matches)$('globe-question-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}
function randomCountry(){if(!atlas)return;const pool=COUNTRIES.filter(c=>c.code!==session?.code);const code=pool[Math.floor(Math.random()*pool.length)].code;choose(code);globe.select(code);}
function renderQuiz(){
 clearDiscovery($('globe-discovery'));message('');
 const stage=session?.stage||'pick',c=session?atlas.details[session.code]:null;
 $('globe-input-area').hidden=stage==='pick'||stage==='complete';$('globe-completed').hidden=stage!=='complete';$('globe-idle').hidden=stage!=='pick';
 $('globe-step-country').classList.toggle('current',stage==='country'||stage==='pick');$('globe-step-country').classList.toggle('done',stage==='capital'||stage==='complete');
 $('globe-step-capital').classList.toggle('current',stage==='capital');$('globe-step-capital').classList.toggle('done',stage==='complete');
 $('globe-stage-tag').textContent=stage==='pick'?'YOUR NEXT DISCOVERY':stage==='country'?'STEP 01 / COUNTRY':stage==='capital'?'STEP 02 / CAPITAL':'DISCOVERY COMPLETE';
 $('globe-question-title').textContent=stage==='pick'?'Where will you go?':stage==='country'?'Name the highlighted country.':stage==='capital'?`You found ${c.name}.`:`Hello, ${c.name}.`;
 $('globe-answer').value='';$('globe-answer').removeAttribute('aria-invalid');
 $('globe-question-label').textContent=stage==='capital'?(session.code==='nr'?'Which district is its seat of government?':c.capitals.length>1?'Name a capital or seat of government.':'What is its capital?'):'Which country is it?';
 $('globe-answer').placeholder=stage==='capital'?'Type the capital…':'Type the country…';
 $('globe-answer').disabled=false;$('globe-check').disabled=false;
 $('globe-answer-help').textContent=stage==='capital'&&c.capitals.length>1?'More than one valid capital or seat is accepted. Exact spelling still counts.':'Exact spelling. Capitalization doesn’t matter.';
 $('globe-country-badge').hidden=stage==='country'||stage==='pick';
 if(c&&stage!=='country')$('globe-country-badge').innerHTML=`<img src="assets/flags/${session.code}.svg" alt="">${esc(c.region)}`;
 if(stage==='complete'){ $('globe-capital-result').textContent=c.capitals.join(' · ');showDiscovery($('globe-discovery'),session.code); }
 $('globe-canvas').setAttribute('aria-label','Interactive globe. Drag to rotate; use arrow keys to rotate and Enter to select the centre country. Country names are hidden during the quiz.');
}
function submit(e){
 e.preventDefault();if(!session||!['country','capital'].includes(session.stage)||!atlas)return;
 const answer=$('globe-answer').value.trim();if(!answer){message('Type your answer first.','error');$('globe-answer').focus();return;}
 const correct=checkGlobeAnswer(atlas.details[session.code],session.code,session.stage,answer);
 record('guess',answer,correct);
 if(correct){const was=session.stage;session.stage=was==='country'?'capital':'complete';save();renderQuiz();message(was==='country'?'Country correct. Now try its capital.':'Capital correct. Another place you know.','success');if(was==='country')$('globe-answer').focus({preventScroll:true});}
 else{message('Not quite. Check the name and spelling, then try again.','error');$('globe-answer').setAttribute('aria-invalid','true');$('globe-answer').focus();$('globe-answer').select();}
}
function reveal(){
 if(!session||!['country','capital'].includes(session.stage))return;
 const was=session.stage;record('reveal','',false);session.stage=was==='country'?'capital':'complete';save();renderQuiz();
 message(was==='country'?`This is ${atlas.details[session.code].name}. Try its capital next.`:`The answer: ${atlas.details[session.code].capitals.join(' / ')}.`, 'revealed');
 if(was==='country')$('globe-answer').focus({preventScroll:true});
}
export function renderTotals(){
 const s=globeSummary(events);
 $('globe-country-count').textContent=s.countries;$('globe-capital-count').textContent=s.capitals;
 $('globe-save-label').textContent=healthy?'Your globe attempts are saved here.':'Globe progress cannot be saved. Download a backup before closing.';
 $('globe-save-label').classList.toggle('error-text',!healthy);
 $('globe-progress-summary').innerHTML=`<div class="globe-progress-heading"><div><p class="eyebrow">GLOBE EXPLORER</p><h2>A world you can name.</h2></div><a class="text-link" href="#globe">Open the globe ↗</a></div><div class="globe-progress-values"><div><strong>${s.countries}</strong><span>countries identified</span></div><div><strong>${s.capitals}</strong><span>capitals recalled</span></div><div><strong>${s.accuracy===null?'—':s.accuracy+'%'}</strong><span>answer accuracy</span></div><div><strong>${s.attempts}</strong><span>answers & reveals</span></div></div><p class="muted">Globe scores are separate from flag scores. Reveals count as missed answers.</p>`;
 const recent=events.slice(-30).reverse();
 $('globe-attempt-history').innerHTML=recent.length?`<details class="globe-history"><summary>Recent globe attempts (${Math.min(events.length,30)} of ${events.length})</summary><div class="table-wrap"><table><thead><tr><th>Country</th><th>Step</th><th>Your answer</th><th>Result</th></tr></thead><tbody>${recent.map(e=>`<tr><td>${esc(BY_CODE.get(e.code).name)}</td><td>${e.stage==='country'?'Country':'Capital'}</td><td class="answer-cell">${esc(e.answer||'—')}</td><td class="${e.correct?'success-text':'error-text'}">${e.type==='reveal'?'Revealed':e.correct?'Correct':'Incorrect'}</td></tr>`).join('')}</tbody></table></div></details>`:'';
}
export async function startGlobe(){
 if(globe){globe.resize();return;}if(starting)return starting;
 $('globe-loading').hidden=false;
 starting=(async()=>{
  try{
   atlas=await loadAtlas();globe=new Globe($('globe-canvas'),atlas,{onSelect:choose,onMessage:message});
   $('globe-loading').hidden=true;$('globe-random').disabled=false;$('globe-random-idle').disabled=false;
   if(session)globe.select(session.code);renderQuiz();
  }catch{ $('globe-loading').innerHTML='<p>The globe couldn’t load.</p><button class="secondary" id="retry-globe">Try again</button>';$('retry-globe').onclick=()=>startGlobe(); }
  finally{starting=null;}
 })();return starting;
}
$('globe-answer-form').addEventListener('submit',submit);$('globe-reveal').addEventListener('click',reveal);
$('globe-random').addEventListener('click',randomCountry);$('globe-random-idle').addEventListener('click',randomCountry);$('globe-next').addEventListener('click',randomCountry);
$('globe-zoom-in').addEventListener('click',()=>globe?.setZoom(globe.zoom*1.3));$('globe-zoom-out').addEventListener('click',()=>globe?.setZoom(globe.zoom/1.3));$('globe-reset').addEventListener('click',()=>globe?.reset());
window.addEventListener('storage',e=>{if(e.key!==GLOBE_KEY||!e.newValue)return;try{events=mergeGlobeEvents(events,JSON.parse(e.newValue).events);renderTotals();}catch{healthy=false;renderTotals();}});
renderTotals();
