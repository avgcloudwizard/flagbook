import { COUNTRIES } from './countries.js';
import { BY_CODE, STORAGE_KEY, isCorrect, shuffled, summarize, validateEvents, parseBackup } from './core.js';
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid = () => crypto.randomUUID();
let events = [], round, mode = 'all', deck = [], deckSize = 0, timer, imageReady = false, historyLimit = 30, storageHealthy = true;
let summary = summarize(events);
function warnStorage(message) { storageHealthy = false; $('storage-warning').hidden = false; $('storage-warning').textContent = message; $('save-note').textContent = 'Not saved — download a backup'; }
function readStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (data.version !== 1) throw new Error('Unsupported saved data');
  validateEvents(data.events);
  return data;
}
let initial;
try { initial = readStore(); if (initial) events = initial.events; }
catch { warnStorage('Your saved progress couldn’t be read. It has been left untouched. New attempts will work here, but download a backup to keep them.'); }
function save() {
  if (!storageHealthy) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version:1, events, session:{round, mode, deck, deckSize} }));
    $('save-note').textContent = 'Progress saved in this browser';
  } catch { warnStorage('This browser couldn’t save your progress. You can keep practising, but download a backup from My progress before closing this page.'); }
}
function record(type, answer = '') {
  events.push({id:uuid(), question:round.id, code:round.code, type, answer, at:new Date().toISOString()});
  if (type === 'reveal' || isCorrect(BY_CODE.get(round.code), answer)) round.status = type === 'reveal' ? 'revealed' : 'correct';
  save(); renderStats();
}
function eligible() { return mode === 'missed' ? summarize(events).missed.map(s => s.code) : COUNTRIES.map(c => c.code); }
function newDeck(previous) { deck = shuffled(eligible(), previous); deckSize = deck.length; }
function nextFlag() {
  clearTimeout(timer);
  const previous = round?.code;
  if (!deck.length) newDeck(previous);
  if (!deck.length) { mode='all'; newDeck(previous); }
  round = { id:uuid(), code:deck.shift(), status:'answering' };
  save(); renderRound();
}
function feedback(message, type='') { $('feedback').textContent=message; $('feedback').className=type; }
function renderRound() {
  imageReady=false;
  $('all-mode').classList.toggle('active',mode==='all'); $('all-mode').setAttribute('aria-pressed',String(mode==='all'));
  $('missed-mode').classList.toggle('active',mode==='missed'); $('missed-mode').setAttribute('aria-pressed',String(mode==='missed'));
  $('deck-position').textContent=`${deckSize-deck.length} / ${deckSize}`;
  $('answer').value=''; $('answer').removeAttribute('aria-invalid');
  $('flag-error').hidden=true; $('flag').hidden=false;
  $('flag').alt='Country flag to identify';
  $('answer').disabled=round.status!=='answering'; $('check-answer').disabled=true; $('reveal').disabled=true;
  $('next-flag').hidden=true;
  feedback('');
  $('flag').src=`assets/flags/${round.code}.svg`;
  if (round.status==='revealed') {
    const country=BY_CODE.get(round.code);
    feedback(`This is ${country.name}. Take a look, then try the next flag.`, 'revealed');
    $('flag').alt=`Flag of ${country.name}`;
    $('next-flag').hidden=false;
  } else if (round.status==='correct') {
    feedback(`Correct — ${BY_CODE.get(round.code).name}!`, 'success');
    timer=setTimeout(nextFlag,1000);
  }
}
$('flag').addEventListener('load', () => {
  imageReady=true;
  $('check-answer').disabled=round.status!=='answering'; $('reveal').disabled=round.status!=='answering';
  if (round.status==='answering' && !location.hash.includes('progress')) $('answer').focus({preventScroll:true});
});
$('flag').addEventListener('error', () => { imageReady=false; $('flag').hidden=true; $('flag-error').hidden=false; });
$('retry-image').addEventListener('click',renderRound);
function submitAnswer(answer) {
  if (round.status!=='answering' || !imageReady) return {accepted:false,reason:'This flag is not ready for an answer.'};
  if (typeof answer!=='string' || !answer.trim() || answer.length>160) {
    feedback('Type a country name first.','error'); $('answer').focus(); return {accepted:false,reason:'A country name is required.'};
  }
  const correct=isCorrect(BY_CODE.get(round.code),answer);
  record('guess',answer.trim());
  if (correct) {
    feedback(`Correct — ${BY_CODE.get(round.code).name}! Next flag coming up…`,'success');
    $('answer').removeAttribute('aria-invalid'); $('answer').disabled=true; $('check-answer').disabled=true; $('reveal').disabled=true;
    timer=setTimeout(nextFlag,1000);
  } else {
    feedback('Not quite. Check the country and spelling, then try again.','error');
    $('answer').setAttribute('aria-invalid','true'); $('answer').focus(); $('answer').select();
  }
  return {accepted:true,correct};
}
$('answer-form').addEventListener('submit', e => {e.preventDefault();submitAnswer($('answer').value);});
$('answer').addEventListener('input', () => $('answer').removeAttribute('aria-invalid'));
$('reveal').addEventListener('click', () => {
  if (round.status!=='answering' || !imageReady) return;
  record('reveal'); renderRound(); $('next-flag').focus({preventScroll:true});
});
$('next-flag').addEventListener('click',nextFlag);
function changeMode(next) {
  if (next===mode) return;
  if (next==='missed' && !summary.missed.length) return;
  mode=next; newDeck(round?.code); nextFlag();
}
$('all-mode').addEventListener('click',()=>changeMode('all'));
$('missed-mode').addEventListener('click',()=>changeMode('missed'));
$('review-from-stats').addEventListener('click',()=> { changeMode('missed'); location.hash='practice'; });
function flagName(code) { const c=BY_CODE.get(code); return `<img src="assets/flags/${c.code}.svg" alt="" loading="lazy">${escape(c.name)}`; }
function renderStats() {
  summary=summarize(events);
  $('accuracy').textContent=summary.accuracy===null?'—':`${summary.accuracy}%`;
  $('accuracy-bar').style.width=`${summary.accuracy||0}%`;
  $('named').innerHTML=`${summary.named}<span>/195</span>`;
  $('streak').textContent=summary.streak;
  $('missed-mode').disabled=!summary.missed.length;
  $('review-from-stats').disabled=!summary.missed.length;
  $('top-misses').innerHTML=summary.missed.slice(0,3).map(s=>`<div class="miss-row"><img src="assets/flags/${s.code}.svg" alt=""><span>${escape(BY_CODE.get(s.code).name)}</span><small>${s.missed} ${s.missed===1?'miss':'misses'}</small></div>`).join('');
  document.querySelector('.misses>.muted').textContent=summary.missed.length?'A second look goes a long way.':'Your most-missed flags will appear here.';
  const stats=[[summary.seen,'rounds attempted'],[summary.accuracy===null?'—':summary.accuracy+'%','first-try accuracy'],[summary.named+' / 195','different flags named'],[summary.best,'best first-try streak']];
  $('stats-grid').innerHTML=stats.map(([value,label])=>`<div class="stat-card"><strong>${value}</strong><span>${label}</span></div>`).join('');
  const countryRows=[...summary.perCountry.values()].sort((a,b)=>b.missed-a.missed || b.missed/b.seen-a.missed/a.seen || BY_CODE.get(a.code).name.localeCompare(BY_CODE.get(b.code).name));
  $('country-stats').innerHTML=countryRows.length?`<div class="table-wrap"><table><thead><tr><th scope="col">Country</th><th scope="col">Rounds</th><th scope="col">Missed</th><th scope="col">First-try accuracy</th></tr></thead><tbody>${countryRows.map(s=>`<tr><td>${flagName(s.code)}</td><td>${s.seen}</td><td class="${s.missed?'error-text':''}">${s.missed}</td><td>${Math.round(s.firstTry/s.seen*100)}%</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">A blank page is a good place to start. Name your first flag and your progress will appear here.</div>';
  renderHistory();
}
function renderHistory() {
  $('history-count').textContent=`${events.length} RECORDS`;
  const recent=events.slice().reverse().slice(0,historyLimit);
  $('history').innerHTML=recent.length?`<div class="table-wrap"><table><thead><tr><th scope="col">Country</th><th scope="col">Your answer</th><th scope="col">Result</th><th scope="col">When</th></tr></thead><tbody>${recent.map(e=>{
    const correct=e.type==='guess' && isCorrect(BY_CODE.get(e.code),e.answer);
    return `<tr><td>${flagName(e.code)}</td><td class="answer-cell">${e.type==='reveal'?'—':escape(e.answer)}</td><td class="${correct?'success-text':'error-text'}">${e.type==='reveal'?'Revealed':correct?'Correct':'Incorrect'}</td><td class="muted">${escape(new Date(e.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</td></tr>`;
  }).join('')}</tbody></table></div>`:'<div class="empty">No attempts yet. Your first one is waiting in Practice.</div>';
  $('more-history').hidden=historyLimit>=events.length;
}
$('more-history').addEventListener('click',()=>{historyLimit+=50;renderHistory();});
function navigate() {
  const progress=location.hash==='#progress';
  $('practice-view').hidden=progress; $('progress-view').hidden=!progress;
  $('practice-link').toggleAttribute('aria-current',!progress); $('progress-link').toggleAttribute('aria-current',progress);
  (progress?$('progress-link'):$('practice-link')).setAttribute('aria-current','page');
  if (!progress && round.status==='answering') $('answer').focus({preventScroll:true});
}
window.addEventListener('hashchange',navigate);
$('export').addEventListener('click',()=> {
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),events},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=`flagbook-progress-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('backup-status').textContent='Backup downloaded. Keep this file to restore or transfer your progress.';
});
$('import-button').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    if(file.size>30*1024*1024)throw new Error('This backup is too large.');
    const imported=parseBackup(await file.text()), combined=new Map(events.map(e=>[e.id,e]));
    for(const item of imported){
      if(combined.has(item.id) && JSON.stringify(combined.get(item.id))!==JSON.stringify(item))throw new Error('This backup contains conflicting attempts.');
      combined.set(item.id,item);
    }
    const merged=[...combined.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));validateEvents(merged);
    const added=merged.length-events.length;events=merged;
    clearTimeout(timer);newDeck();nextFlag();renderStats();save();
    $('backup-status').textContent=`Imported ${added} new ${added===1?'record':'records'}. Existing attempts were kept.${storageHealthy?'':' Download a backup before closing; browser saving is unavailable.'}`;
  }catch(error){$('backup-status').textContent=`Couldn’t import: ${error.message} Your progress is unchanged.`;}
  e.target.value='';
});
window.addEventListener('storage', e=>{
  if(e.key!==STORAGE_KEY)return;
  try {
    const latest=readStore();if(!latest)return;
    const combined=new Map([...events,...latest.events].map(e=>[e.id,e]));
    const merged=[...combined.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));validateEvents(merged);events=merged;
    if(round.status==='answering' && events.some(e=>e.question===round.id)){nextFlag();}
    renderStats();
  }catch {warnStorage('Progress changed in another tab and couldn’t be combined. Download a backup here before closing.');}
});
renderStats();
const saved=initial?.session;
const validRound=saved?.round && BY_CODE.has(saved.round.code) && typeof saved.round.id==='string' && ['answering','revealed','correct'].includes(saved.round.status);
if(validRound && ['all','missed'].includes(saved.mode) && Array.isArray(saved.deck) && saved.deck.every(c=>BY_CODE.has(c)) && new Set(saved.deck).size===saved.deck.length && !saved.deck.includes(saved.round.code) && Number.isInteger(saved.deckSize) && saved.deckSize>saved.deck.length && saved.deckSize<=195){
  round=saved.round;mode=saved.mode;deck=saved.deck;deckSize=saved.deckSize;
  const last=events.filter(e=>e.question===round.id).at(-1);
  if(last && (last.type==='reveal'||isCorrect(BY_CODE.get(last.code),last.answer)))round.status=last.type==='reveal'?'revealed':'correct';
  renderRound();
}else nextFlag();
navigate();
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({name:'get_flag_progress',title:'Read flag learning progress',description:'Read the learner’s saved first-try accuracy, attempt count and most-missed countries.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return {rounds:summary.seen,accuracy:summary.accuracy,flagsNamed:summary.named,mostMissed:summary.missed.map(s=>({country:BY_CODE.get(s.code).name,misses:s.missed}))};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
