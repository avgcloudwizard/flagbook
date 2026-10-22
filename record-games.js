import {BY_CODE,shuffled} from './core.js';
import {loadAtlas} from './globe.js?v=8';
import {loadRecords,esc,formatValue} from './explore-data.js?v=8';
import {gameTopics,topFiveEntries,comparison,checkDirection,checkTopFive,matchCountry,pickMystery,mysteryCandidates} from './games-core.js?v=11';
import {recordGame,renderGameStats,readGameSession,saveGameSession,getGameEvents} from './games-store.js?v=11';
const $=id=>document.getElementById(id);
const starter=['coffee','cocoa','rice','wheat','bananas','gold-mine','silver-mine','oil','solar-electricity','population','country-area','forest','cotton'];
const titles={higher:'Higher or lower?',five:'Name the top five.',mystery:'Which country am I?'};
const descriptions={higher:'Two countries. One statistic. Trust your world knowledge.',five:'Fill the leaderboard in any order. Exact spelling; recognised country names are accepted.',mystery:'Read the clues. Name the country. Reveal another clue when you need one.'};
let topics,details,pending,bound=false,state,topicDeck=[];
function save(){saveGameSession('records',state);}
function pool(){
  return topics.filter(i=>(!$('games-category').value||i.category===$('games-category').value)&&
    ($('games-mode').value!=='five'||topFiveEntries(i).length>=5));
}
function filters(){
  const mode=$('games-mode').value;
  const category=$('games-category').value;
  const categories=[...new Set(topics.map(i=>i.category))].sort().filter(c=>mode!=='mystery'||mysteryCandidates(topics.filter(i=>i.category===c)).length);
  $('games-category').innerHTML='<option value="">All subjects</option>'+categories.map(c=>`<option>${esc(c)}</option>`).join('');
  if(categories.includes(category))$('games-category').value=category;
  const previous=$('games-topic').value;
  $('games-topic').innerHTML='<option value="">Surprise me</option>'+pool().map(i=>`<option value="${esc(i.id)}">${esc(i.label)} · ${esc(i.year)}</option>`).join('');
  if(pool().some(i=>i.id===previous))$('games-topic').value=previous;
  $('games-topic-wrap').hidden=mode==='mystery';
  $('games-topic').disabled=mode==='mystery';
  $('games-description').textContent=descriptions[mode];
  document.querySelectorAll('[data-game-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gameMode===mode)));
}
function topic(){return topics.find(i=>i.id===state.topic);}
function chooseTopic(){
  const eligible=pool(),chosen=eligible.find(i=>i.id===$('games-topic').value);
  if(chosen)return chosen;
  if(!topicDeck.length){
    // The first shuffle favours familiar topics; subject filters expose the full catalogue.
    const accessible=eligible.filter(i=>starter.includes(i.id));
    topicDeck=shuffled((!$('games-category').value&&accessible.length?accessible:eligible).map(i=>i.id),state?.topic);
  }
  const id=topicDeck.shift();
  return eligible.find(i=>i.id===id);
}
function newRound(){
  const mode=$('games-mode').value,previous=state?.code;
  const next={id:crypto.randomUUID(),mode,category:$('games-category').value,selectedTopic:$('games-topic').value,done:false,found:[],mistakes:0,shown:1,feedback:''};
  if(mode==='mystery'){
    const mystery=pickMystery(pool(),previous);
    if(!mystery){empty('Not enough clues in this category. Choose another subject.');return;}
    Object.assign(next,mystery);
  }else{
    const item=chooseTopic();
    if(!item){empty('No suitable questions in this category. Choose another subject.');return;}
    next.topic=item.id;
    if(mode==='higher'){
      const pair=comparison(item);if(!pair){empty('Not enough different values to compare. Choose another topic.');return;}
      next.pair=pair.map(e=>e.code);
    }
  }
  state=next;save();render();
}
function empty(message){state=null;$('games-feedback').textContent='';$('games-reveal').hidden=true;$('games-hint').hidden=true;$('games-board').innerHTML=`<div class="game-empty"><h2>No round available.</h2><p>${esc(message)}</p></div>`;$('games-source').innerHTML='';$('games-next').hidden=true;}
function log(type,answer,correct,finished){
  recordGame({game:state.mode,round:state.id,type,answer,correct,finished,...(state.code?{code:state.code}:{}),...(state.topic?{topic:state.topic}:{})});
}
function flag(code){return `<img src="assets/flags/${code}.svg" alt="" loading="lazy">`;}
function sourceDetails(items){
  return [...new Map(items.map(i=>[i.id,i])).values()].map(i=>`<details><summary>${esc(i.label)} · ${esc(i.year)} — source & coverage</summary><p>${esc(i.note)}</p>${i.notice?`<p>${esc(i.notice)}</p>`:''}<p>${esc(i.coverage)}</p><a href="${esc(i.source)}" target="_blank" rel="noopener noreferrer">${esc(i.sourceLabel)} ↗</a><a href="#records?topic=${encodeURIComponent(i.id)}">Open the ranking →</a></details>`).join('');
}
function answerForm(label){return `<form id="game-answer-form" class="game-answer-form" novalidate><label for="game-answer">${label}</label><div><input id="game-answer" placeholder="Type a country…" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" maxlength="160"><button class="primary" type="submit">Check ↵</button></div><span>Exact spelling · No abbreviations</span></form>`;}
function renderHigher(){
  const item=topic(),pair=state.pair.map(c=>item.entries.find(e=>e.code===c));
  const card=(e,index)=>`<div class="comparison-country ${index?'comparison-question':''}"><span class="game-overline">${index?'THE CHALLENGER':'THE BENCHMARK'}</span>${flag(e.code)}<h3>${esc(BY_CODE.get(e.code).name)}</h3><strong class="comparison-value">${!index||state.done?esc(formatValue(e.value,item.unit)): '?'}</strong>${index&&!state.done?'<span class="comparison-hidden">Higher or lower than the benchmark?</span>':''}</div>`;
  $('games-board').innerHTML=`<div class="game-board-title"><span class="eyebrow">${esc(item.category)} · ${esc(item.year)}</span><h2>${esc(item.label)}</h2><p>${esc(item.measure||item.label)} · figures in ${esc(item.unit)}</p></div><div class="comparison-pair">${card(pair[0],0)}<span class="comparison-vs" aria-hidden="true">vs</span>${card(pair[1],1)}</div>${state.done?'':`<div class="direction-choices"><button class="primary" data-direction="higher">↑ Higher</button><button class="secondary" data-direction="lower">↓ Lower</button></div>`}`;
  if(!state.done)$('games-board').querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>{
    if(state.done)return;const correct=checkDirection(pair,button.dataset.direction);
    log('guess',button.dataset.direction,correct,true);state.done=true;state.correct=correct;
    state.feedback=`${correct?'Correct!':'Not this time.'} ${BY_CODE.get(pair[1].code).name} has the ${pair[1].value>pair[0].value?'higher':'lower'} figure: ${formatValue(pair[1].value,item.unit)}, compared with ${formatValue(pair[0].value,item.unit)}.`;save();render();
  });
}
function renderFive(){
  const item=topic(),answers=topFiveEntries(item);
  $('games-board').innerHTML=`<div class="game-board-title"><span class="eyebrow">${esc(item.category)} · ${esc(item.year)}</span><h2>${esc(item.label)}</h2><p>Name the ${answers.length===5?'five':answers.length} countries in the top five places of this catalogue.${answers.length>5?' Ties are included.':''}</p><span class="game-found-count">${state.found.length} / ${answers.length} found</span></div><ol class="five-slots">${answers.map(e=>{
    const visible=state.done||state.found.includes(e.code);
    return `<li class="${state.found.includes(e.code)?'slot-found':state.done?'slot-revealed':''}"><span class="slot-rank">${e.rank}</span>${visible?`${flag(e.code)}<span>${esc(BY_CODE.get(e.code).name)}</span><strong>${esc(formatValue(e.value,item.unit))}</strong>`:'<span class="slot-blank">Country to discover</span>'}</li>`;
  }).join('')}</ol>${state.done?'':answerForm('Name any country on this leaderboard')}`;
  if(!state.done)$('game-answer-form').onsubmit=e=>{e.preventDefault();submitFive();};
}
function submitFive(){
  if(state.done)return;const input=$('game-answer'),answer=input.value.trim();if(!answer){input.focus();return;}
  const result=checkTopFive(topic(),state.found,answer);
  if(result.status==='duplicate'){$('games-feedback').textContent='You already found that country. Try another.';input.select();return;}
  const correct=result.status==='correct';
  if(correct)state.found.push(result.code);else state.mistakes++;
  state.done=state.found.length===topFiveEntries(topic()).length;
  log('guess',answer,correct,state.done);
  state.correct=correct;state.feedback=correct?`${BY_CODE.get(result.code).name} is on the board!${state.done?' You found them all.':''}`:'Not on this leaderboard. Check the country and its spelling, then try again.';
  save();render();if(!state.done){$('game-answer').focus({preventScroll:true});if(!correct){$('game-answer').value=answer;$('game-answer').select();}}
}
function clues(){
  return [...state.clues.map(c=>{
    const item=topics.find(i=>i.id===c.topic);
    return {text:`I rank #${c.rank} in this catalogue for ${item.label.toLocaleLowerCase('en')}: ${formatValue(c.value,item.unit)}.`,meta:item.year};
  }),{text:`You’ll find me in ${details[state.code].region}.`,meta:'Location'},{text:`My capital / seat of government: ${details[state.code].capitals.join(' / ')}.`,meta:'Capital'}];
}
function renderMystery(){
  const all=clues();
  $('games-board').innerHTML=`<div class="game-board-title"><span class="eyebrow">FOLLOW THE CLUES</span><h2>${state.done?esc(BY_CODE.get(state.code).name):'A country, in numbers.'}</h2><p>${state.done?'The clues lead here. Keep one fact for next time.':`${state.shown} of ${all.length} clues open · how soon can you name it?`}</p></div>${state.done?`<div class="mystery-reveal">${flag(state.code)}<a class="text-link" href="#atlas?country=${state.code}">Find it in the atlas ↗</a></div>`:''}<ol class="mystery-clues">${all.map((c,index)=>`<li class="${index<state.shown||state.done?'':'clue-locked'}"><span>${String(index+1).padStart(2,'0')}</span><div>${index<state.shown||state.done?`<p>${esc(c.text)}</p><small>${esc(c.meta)}</small>`:'<p>Another piece of the puzzle</p><small>Reveal the next clue when you need it</small>'}</div></li>`).join('')}</ol>${state.done?'':answerForm('Which country fits these clues?')}`;
  if(!state.done)$('game-answer-form').onsubmit=e=>{
    e.preventDefault();const input=$('game-answer'),answer=input.value.trim();if(!answer)return;
    const correct=matchCountry(answer)===state.code;state.done=correct;state.correct=correct;
    if(!correct)state.mistakes++;
    log('guess',answer,correct,correct);
    state.feedback=correct?`Yes — ${BY_CODE.get(state.code).name}! Solved with ${state.shown} ${state.shown===1?'clue':'clues'}.`:'Not quite. Check your spelling or open another clue.';
    save();render();if(!state.done){$('game-answer').focus({preventScroll:true});if(!correct){$('game-answer').value=answer;$('game-answer').select();}}
  };
}
function render(){
  if(!state)return;
  $('games-mode-title').textContent=titles[state.mode];
  if(state.mode==='higher')renderHigher();else if(state.mode==='five')renderFive();else renderMystery();
  $('games-feedback').textContent=state.feedback;
  $('games-feedback').className='game-feedback'+(state.feedback?(state.correct?' success-text':''):'');
  $('games-next').hidden=!state.done;
  $('games-reveal').hidden=state.done;
  $('games-hint').hidden=state.done||state.mode!=='mystery';
  $('games-hint').disabled=state.mode==='mystery'&&state.shown>=clues().length;
  const items=state.mode==='mystery'?state.clues.map(c=>topics.find(i=>i.id===c.topic)):[topic()];
  $('games-source').innerHTML=state.done?sourceDetails(items)+(state.mode==='mystery'?`<p><a href="${esc(details[state.code].source)}" target="_blank" rel="noopener noreferrer">Country guide source ↗</a></p>`:''):'<p>Source links, figures and coverage appear after the round. Rankings refer to the countries reported in our catalogue.</p>';
  renderGameStats(state.mode,$('games-stats'));
}
function restore(saved){
  if(!saved||!['higher','five','mystery'].includes(saved.mode)||typeof saved.id!=='string'||typeof saved.done!=='boolean'||typeof saved.feedback!=='string'||!Array.isArray(saved.found)||!saved.found.every(c=>BY_CODE.has(c)))return false;
  if(saved.mode==='mystery'){
    if(!BY_CODE.has(saved.code)||!Number.isInteger(saved.shown)||saved.shown<1||!Array.isArray(saved.clues)||saved.clues.length<2||saved.clues.length>3||saved.shown>saved.clues.length+2)return false;
    for(const c of saved.clues){const e=topics.find(i=>i.id===c.topic)?.entries.find(e=>e.code===saved.code);if(!e||e.value!==c.value||e.rank!==c.rank)return false;}
  }else{
    const item=topics.find(i=>i.id===saved.topic);if(!item)return false;
    if(saved.mode==='five'&&(!topFiveEntries(item).length||!saved.found.every(c=>topFiveEntries(item).some(e=>e.code===c))))return false;
    if(saved.mode==='higher'&&(!Array.isArray(saved.pair)||saved.pair.length!==2||saved.pair[0]===saved.pair[1]||!saved.pair.every(c=>item.entries.some(e=>e.code===c))))return false;
  }
  state=saved;if(getGameEvents().some(e=>e.round===state.id&&e.finished))state.done=true;
  $('games-mode').value=state.mode;$('games-category').value=state.category||'';filters();$('games-topic').value=state.selectedTopic||'';render();return true;
}
export async function startRecordGames(params=new URLSearchParams()){
  const applyRoute=()=>{
    const mode=params.get('mode');
    if(['higher','five','mystery'].includes(mode)&&state?.mode!==mode){$('games-mode').value=mode;topicDeck=[];filters();newRound();}
    else if(state)render();
  };
  if(topics){applyRoute();return;}if(pending)return pending;
  pending=(async()=>{try{
    const [catalogue,atlas]=await Promise.all([loadRecords(),loadAtlas()]);details=atlas.details;
    topics=gameTopics(catalogue.items).filter(i=>comparison(i));
    $('games-category').innerHTML='<option value="">All subjects</option>'+[...new Set(topics.map(i=>i.category))].sort().map(c=>`<option>${esc(c)}</option>`).join('');
    $('games-category').disabled=false;$('games-mode').disabled=false;
    if(!bound){
      $('games-category').onchange=()=>{topicDeck=[];filters();newRound();};
      $('games-mode').onchange=()=>{topicDeck=[];filters();newRound();};
      $('games-topic').onchange=newRound;
      document.querySelectorAll('[data-game-mode]').forEach(b=>b.onclick=()=>{if($('games-mode').value===b.dataset.gameMode)return;$('games-mode').value=b.dataset.gameMode;topicDeck=[];filters();newRound();location.hash='games?mode='+b.dataset.gameMode;});
      $('games-next').onclick=()=>{newRound();$('games-board').scrollIntoView({block:'start',behavior:'smooth'});};
      $('games-reveal').onclick=()=>{if(!state||state.done)return;state.done=true;state.correct=false;log('reveal','',false,true);state.feedback='Answer revealed. Explore the numbers below, then try another round.';save();render();};
      $('games-hint').onclick=()=>{if(!state||state.done||state.mode!=='mystery'||state.shown>=clues().length)return;state.shown++;log('hint','Next clue',false,false);save();render();};
      bound=true;
    }
    filters();if(!restore(readGameSession('records')))newRound();applyRoute();
    $('games-loading').hidden=true;
  }catch{topics=null;$('games-loading').hidden=false;$('games-loading').innerHTML='The games couldn’t load. <button id="games-retry" class="secondary">Try again</button>';$('games-retry').onclick=()=>startRecordGames();}finally{pending=null;}})();return pending;
}
