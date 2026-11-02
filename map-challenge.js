import {Globe,loadAtlas} from './globe.js?v=11';
import {BY_CODE,shuffled} from './core.js';
import {CONTINENTS,continentForRegion,esc} from './explore-data.js?v=8';
import {recordGame,renderGameStats,readGameSession,saveGameSession,getGameEvents} from './games-store.js?v=15';
import {loadCountryContext} from './country-context.js';
import {STOPS,guidance,outcome,outcomeLabel,validStops} from './map-trail.js';
const $=id=>document.getElementById(id),name=c=>BY_CODE.get(c).name;
const views={'Africa':[20,3,1.25],'Asia':[88,33,1.1],'Europe':[18,52,1.8],'North America':[-101,34,1.1],'South America':[-61,-18,1.3],'Oceania':[150,-21,1.1]};
let globe,atlas,pending,state,selection=null,reviewCode=null,notes;
class TrailGlobe extends Globe{
  arrive(code){
    this.select(code,{focus:false});const [lat,lon]=atlas.details[code].coordinates;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.flight=null;this.select(code);return;}
    this.flight={start:performance.now(),interpolate:d3.geoInterpolate([-this.rotation[0],-this.rotation[1]],[lon,lat])};this.requestDraw();
  }
  draw(){
    if(this.flight){const t=Math.min(1,(performance.now()-this.flight.start)/650),p=this.flight.interpolate(t*t*(3-2*t));this.rotation=[-p[0],-p[1],0];if(t<1)this.requestDraw();else this.flight=null;}
    super.draw();if(!this.width||!state)return;
    const ctx=this.ctx,points=state.stops.map(s=>atlas.details[s.code].coordinates.slice().reverse());ctx.save();
    if(points.length>1){ctx.beginPath();this.path({type:'LineString',coordinates:points});ctx.strokeStyle='#f3d596';ctx.lineWidth=1.8;ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);}
    points.forEach((p,i)=>{if(!this.visible(p))return;const [x,y]=this.projection(p);ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle='#f3d596';ctx.fill();ctx.fillStyle='#182d2c';ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.fillText(String(i+1),x,y+4);});ctx.restore();
  }
}
function save(){saveGameSession('map',state);}
function overview(){globe.flight=null;globe.select(null);globe.filter(null);globe.hovered=null;const v=views[state.continent];if(v){globe.rotation=[-v[0],-v[1],0];globe.setZoom(v[2]);}else globe.reset();}
function next(fresh=false){
  const previous=state?.code,continent=$('earth-continent').value,same=state?.continent===continent,stops=(!fresh&&same&&state.stops.length<STOPS)?state.stops:[];
  let deck=same?state.deck.filter(c=>!stops.some(s=>s.code===c)):[];
  if(!deck.length)deck=shuffled([...BY_CODE.keys()].filter(c=>(!continent||continentForRegion(atlas.details[c].region)===continent)&&!stops.some(s=>s.code===c)),previous);
  state={id:crypto.randomUUID(),code:deck.shift(),deck,continent,done:false,hinted:false,misses:0,stops,lastMiss:null};selection=null;reviewCode=null;overview();save();render();
}
function record(type,answer,correct,finished){recordGame({round:state.id,game:'map',type,answer,correct,finished,code:state.code});}
function finish(revealed){state.done=true;state.stops.push({code:state.code,outcome:outcome(revealed,state.misses,state.hinted)});selection=null;globe.arrive(state.code);save();render();$('earth-next').focus({preventScroll:true});}
function select(code){if(state.done)return;selection=code;globe.select(code,{focus:false});render();}
function confirm(){
  if(!selection||state.done)return;const code=selection,correct=code===state.code;selection=null;record('guess',name(code),correct,correct);
  if(correct){finish(false);return;}
  state.misses++;state.lastMiss=code;save();render();$('earth-canvas').focus({preventScroll:true});
}
function render(){
  const display=reviewCode||state.code,c=atlas.details[display],end=state.done&&state.stops.length===STOPS,stop=state.stops.length+(state.done?0:1);
  $('earth-country').textContent=name(display);$('earth-flag').src='assets/flags/'+display+'.svg';$('earth-target-label').textContent=end?'TRAIL REVIEW':state.done?'DESTINATION REACHED':'YOUR NEXT DESTINATION';$('earth-find').textContent=state.done?'Location':'Find';$('earth-continent').value=state.continent;
  $('trail-stop').textContent=end?'Trail complete':'Stop '+String(stop).padStart(2,'0')+' / 03';
  $('trail-steps').innerHTML=Array.from({length:STOPS},(_,i)=>{const s=state.stops[i];return '<span class="'+(s?'visited':i===stop-1?'here':'')+'" aria-label="'+(s?esc(name(s.code))+': '+outcomeLabel[s.outcome]:i===stop-1?'Current stop':'Upcoming stop')+'">'+(s?'<img alt="" src="assets/flags/'+s.code+'.svg">':String(i+1).padStart(2,'0'))+'</span>';}).join('');
  $('earth-confirm').hidden=state.done;$('earth-confirm').disabled=!selection;$('earth-hint').disabled=state.done||state.hinted;$('earth-help').hidden=state.done;$('earth-reveal').disabled=state.done;
  $('earth-next').hidden=!state.done;$('earth-next').textContent=end?'Start another trail →':'Next country →';
  $('earth-instruction').textContent=state.done?'':selection?'Move your selection, or check your choice.':'Choose a territory on the globe, then check your choice.';
  $('earth-round-note').textContent=state.done?outcomeLabel[state.stops.find(s=>s.code===display).outcome]:state.misses?state.misses+' '+(state.misses===1?'miss':'misses'):'Untimed';
  $('earth-hint-text').textContent=state.hinted&&!state.done?'Look in '+c.region+'.':'';
  const note=$('earth-feedback');note.className='game-feedback';note.textContent='';
  if(state.done){const revealed=state.stops.at(-1).outcome==='revealed';note.textContent=reviewCode?'Revisiting '+name(display)+'.':revealed?'Located on the globe.':'You found '+name(state.code)+'!';note.classList.add(revealed?'reveal-text':'success-text');}
  else if(selection){note.textContent='Territory selected.';}
  else if(state.lastMiss){const g=guidance(atlas.details[state.lastMiss].coordinates,c.coordinates);note.textContent='That was '+name(state.lastMiss)+'. '+(g.km?'Look '+g.direction+' from there — about '+g.km.toLocaleString('en')+' km between map reference points.':'The two map reference points are very close. Zoom in and check the border.');}
  $('earth-result').hidden=!state.done;
  if(state.done){const n=notes?.[display]?.partyFact;$('earth-result').innerHTML='<p class="eyebrow">FIELD NOTE · '+esc(c.region)+'</p><strong>'+esc(n?.title||name(display))+'</strong><p>'+esc(n?.text||'Capital / seat: '+c.capitals.join(' / '))+ '</p>'+(n?'<a href="'+esc(n.source)+'" target="_blank" rel="noopener noreferrer">Source ↗</a> · ':'')+'<a href="#atlas?country='+display+'">Open in atlas ↗</a>';}
  $('trail-recap').hidden=!end;
  if(end){const clean=state.stops.filter(s=>s.outcome==='clean').length;$('trail-score').textContent=clean+' of 3 on your first try without a hint.';$('trail-stamps').innerHTML=state.stops.map((s,i)=>'<button data-stop="'+s.code+'" aria-label="Locate '+esc(name(s.code))+' on the globe"><img alt="" src="assets/flags/'+s.code+'.svg"><span>0'+(i+1)+' · '+outcomeLabel[s.outcome]+'</span><strong>'+esc(name(s.code))+'</strong></button>').join('');$('trail-stamps').querySelectorAll('button').forEach(b=>b.onclick=()=>{reviewCode=b.dataset.stop;globe.arrive(reviewCode);render();$('earth-status').textContent='Revisiting '+name(reviewCode)+'.';$('earth-canvas').focus({preventScroll:true});$('earth-canvas').scrollIntoView({block:'nearest'});});}
  renderGameStats('map',$('earth-stats'));$('earth-status').textContent='Drag to rotate · Zoom to inspect a border';
}
export async function startMapChallenge(){
  if(globe){render();globe.resize();return;}if(pending)return pending;
  pending=(async()=>{try{
    atlas=await loadAtlas();$('earth-continent').innerHTML='<option value="">Whole world</option>'+CONTINENTS.map(c=>'<option>'+c+'</option>').join('');
    globe=new TrailGlobe($('earth-canvas'),atlas,{onSelect:select,onMessage:m=>$('earth-status').textContent=m});
    $('earth-canvas').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat&&selection&&globe.pick(globe.width/2,globe.height/2)===selection){e.preventDefault();e.stopImmediatePropagation();confirm();}else if(e.key==='Enter'&&e.repeat){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
    for(const t of ['pointerdown','wheel','keydown'])$('earth-canvas').addEventListener(t,()=>{globe.flight=null;},{capture:true,passive:true});
    $('earth-continent').disabled=false;$('earth-continent').onchange=()=>next(true);$('earth-confirm').onclick=confirm;
    $('earth-zoom-in').onclick=()=>globe.setZoom(globe.zoom*1.3);$('earth-zoom-out').onclick=()=>globe.setZoom(globe.zoom/1.3);$('earth-home').onclick=()=>{overview();if(state.done||selection)globe.select(state.done?(reviewCode||state.code):selection);};
    $('earth-next').onclick=()=>{next();$('earth-canvas').focus({preventScroll:true});$('earth-target').scrollIntoView({block:'nearest'});};
    $('earth-hint').onclick=()=>{if(state.done||state.hinted)return;state.hinted=true;record('hint','Region hint',false,false);save();render();};
    $('earth-reveal').onclick=()=>{if(!state.done){record('reveal','',false,true);finish(true);}};
    const s=readGameSession('map');if(s&&BY_CODE.has(s.code)&&typeof s.id==='string'&&['',...CONTINENTS].includes(s.continent)&&Array.isArray(s.deck)&&s.deck.every(c=>BY_CODE.has(c))&&typeof s.done==='boolean'&&typeof s.hinted==='boolean'&&Number.isInteger(s.misses)&&s.misses>=0){
      state=s;const last=getGameEvents().find(e=>e.round===s.id&&e.finished);if(last)state.done=true;
      if(!validStops(s.stops,BY_CODE)||(state.done&&s.stops.at(-1)?.code!==s.code)||(!state.done&&(s.stops.length===3||s.stops.some(x=>x.code===s.code))))state.stops=state.done?[{code:s.code,outcome:outcome(last?.type==='reveal'||!last,s.misses,s.hinted)}]:[];
      if(!BY_CODE.has(s.lastMiss))state.lastMiss=null;overview();if(state.done)globe.select(s.code);save();render();
    }else next(true);
    for(const id of ['earth-zoom-in','earth-zoom-out','earth-home'])$(id).disabled=false;$('earth-retry').hidden=true;
    loadCountryContext().then(n=>{notes=n;if(state.done)render();}).catch(()=>{});
  }catch{globe?.destroy();globe=null;$('earth-status').textContent='The map couldn’t load.';$('earth-retry').hidden=false;$('earth-retry').onclick=()=>startMapChallenge();}
  finally{pending=null;}})();return pending;
}
