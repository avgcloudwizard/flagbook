import {Globe,loadAtlas} from './globe.js?v=8';
import {BY_CODE,shuffled} from './core.js';
import {CONTINENTS,continentForRegion,esc} from './explore-data.js?v=8';
import {recordGame,renderGameStats,readGameSession,saveGameSession,getGameEvents} from './games-store.js';
const $=id=>document.getElementById(id);
const views={'Africa':[20,3,1.25],'Asia':[88,33,1.1],'Europe':[18,52,1.8],'North America':[-101,34,1.1],'South America':[-61,-18,1.3],'Oceania':[150,-21,1.1]};
let globe,atlas,pending,state;
function save(){saveGameSession('map',state);}
function overview(){
  globe.select(null);globe.filter(null);globe.hovered=null;
  const view=views[state.continent];
  if(view){globe.rotation=[-view[0],-view[1],0];globe.setZoom(view[2]);}else globe.reset();
}
function next(){
  const previous=state?.code,continent=$('earth-continent').value;
  let deck=state?.continent===continent?state.deck:[];
  if(!deck?.length)deck=shuffled([...BY_CODE.keys()].filter(code=>!continent||continentForRegion(atlas.details[code].region)===continent),previous);
  state={id:crypto.randomUUID(),code:deck.shift(),deck,continent,done:false,hinted:false,misses:0};
  overview();save();render();$('earth-feedback').textContent='';
}
function render(){
  const country=BY_CODE.get(state.code);
  $('earth-country').textContent=country.name;
  $('earth-flag').src=`assets/flags/${state.code}.svg`;
  $('earth-continent').value=state.continent;
  $('earth-hint').disabled=state.done||state.hinted;
  $('earth-reveal').disabled=state.done;
  $('earth-next').hidden=!state.done;
  $('earth-hint-text').textContent=state.hinted?`Look in ${atlas.details[state.code].region}.`:'';
  $('earth-result').hidden=!state.done;
  if(state.done){
    $('earth-result').innerHTML=`<span class="eyebrow">PUT IT IN YOUR MEMORY</span><p>${esc(country.name)} is in ${esc(atlas.details[state.code].region)}.</p><a href="#atlas?country=${state.code}" class="text-link">Explore ${esc(country.name)} ↗</a>`;
  }
  renderGameStats('map',$('earth-stats'));
  $('earth-round-note').textContent=state.done?'Round complete':state.misses?`${state.misses} ${state.misses===1?'miss':'misses'} · keep looking`:'Take your time. There’s no timer.';
}
function record(type,answer,correct,finished){
  recordGame({round:state.id,game:'map',type,answer,correct,finished,code:state.code});
}
function choose(code){
  if(state.done)return;
  const correct=code===state.code;
  record('guess',BY_CODE.get(code).name,correct,correct);
  globe.select(code,{focus:correct});
  if(correct){state.done=true;$('earth-feedback').textContent=`Found it! That’s ${BY_CODE.get(code).name}.`;$('earth-feedback').className='game-feedback success-text';}
  else{state.misses++;$('earth-feedback').textContent=`That’s ${BY_CODE.get(code).name}. Keep looking for ${BY_CODE.get(state.code).name}.`;$('earth-feedback').className='game-feedback error-text';}
  save();render();
}
export async function startMapChallenge(){
  if(globe){render();globe.resize();return;}if(pending)return pending;
  $('earth-status').textContent='Loading the world…';
  pending=(async()=>{try{
    atlas=await loadAtlas();
    $('earth-continent').innerHTML='<option value="">Whole world</option>'+CONTINENTS.map(c=>`<option>${c}</option>`).join('');
    globe=new Globe($('earth-canvas'),atlas,{onSelect:choose,onMessage:message=>$('earth-status').textContent=message});
    $('earth-continent').disabled=false;$('earth-continent').onchange=next;
    $('earth-zoom-in').onclick=()=>globe.setZoom(globe.zoom*1.3);
    $('earth-zoom-out').onclick=()=>globe.setZoom(globe.zoom/1.3);
    $('earth-home').onclick=()=>{overview();if(state.done)globe.select(state.code);};
    $('earth-next').onclick=()=>{next();$('earth-country').scrollIntoView({block:'start',behavior:'smooth'});};
    $('earth-hint').onclick=()=>{if(state.done||state.hinted)return;state.hinted=true;record('hint','Region hint',false,false);save();render();};
    $('earth-reveal').onclick=()=>{
      if(state.done)return;state.done=true;record('reveal','',false,true);globe.select(state.code);
      $('earth-feedback').className='game-feedback';$('earth-feedback').textContent=`Here is ${BY_CODE.get(state.code).name}, highlighted on the globe.`;save();render();
    };
    const saved=readGameSession('map');
    if(saved&&BY_CODE.has(saved.code)&&typeof saved.id==='string'&&['',...CONTINENTS].includes(saved.continent)&&
      Array.isArray(saved.deck)&&saved.deck.every(c=>BY_CODE.has(c))&&typeof saved.done==='boolean'&&typeof saved.hinted==='boolean'&&Number.isInteger(saved.misses)){
      state=saved;
      if(getGameEvents().some(e=>e.round===state.id&&e.finished))state.done=true;
      overview();if(state.done)globe.select(state.code);render();
    }else next();
    for(const id of ['earth-zoom-in','earth-zoom-out','earth-home'])$(id).disabled=false;
    $('earth-status').textContent='Drag to rotate · Click a country · Small dots mark tiny states';
    $('earth-retry').hidden=true;
  }catch{
    $('earth-status').textContent='The map couldn’t load. Check your connection and try again.';
    $('earth-retry').hidden=false;$('earth-retry').onclick=()=>startMapChallenge();
  }finally{pending=null;}})();return pending;
}
