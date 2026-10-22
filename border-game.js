import {BY_CODE} from './core.js';
import {Globe,loadAtlas} from './globe.js?v=11';
import {LEVELS,routePairs,newRoute,guessRoute,restoreRoute,shortestRoute} from './border-core.js?v=11';
import {recordGame,getGameEvents,readGameSession,saveGameSession} from './games-store.js?v=11';
const $=id=>document.getElementById(id),name=code=>BY_CODE.get(code).name;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let graph,globe,state,loading=false,bound=false,pairs={};
class BorderGlobe extends Globe{
  draw(){
    super.draw();if(!this.width||!state)return;
    const ctx=this.ctx,colors=new Map(state.path.map(c=>[c,'#d4f285']));
    state.endpoints.forEach((c,i)=>{if(!colors.has(c))colors.set(c,i?'#e8a77b':'#88cddd');});
    for(const f of this.atlas.features)if(colors.has(f.code)){
      ctx.beginPath();this.path(f);ctx.fillStyle=colors.get(f.code);ctx.fill();ctx.strokeStyle='#f2f5d9';ctx.lineWidth=1;ctx.stroke();
    }
    for(const [code,color] of colors){
      const c=this.atlas.details[code],coords=[c.coordinates[1],c.coordinates[0]];if(!this.visible(coords))continue;
      const [x,y]=this.projection(coords);ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#152c36';ctx.lineWidth=1.5;ctx.stroke();
      if(state.endpoints.includes(code)||code===state.path.at(-1)){
        ctx.save();ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#102932';ctx.strokeText(name(code),x,y-12);ctx.fillStyle='#fff8df';ctx.fillText(name(code),x,y-12);ctx.restore();
      }
    }
  }
}
function overview(){
  const points=state.endpoints.map(code=>{const c=globe.atlas.details[code];return [c.coordinates[1],c.coordinates[0]];}),middle=d3.geoInterpolate(...points)(.5);
  globe.rotation=[-middle[0],-middle[1],0];globe.zoom=1;globe.requestDraw();
}
function stats(){
  const events=getGameEvents().filter(e=>e.game==='borders'),finished=events.filter(e=>e.finished),won=finished.filter(e=>e.correct);
  $('border-stats').textContent=`${won.length} won · ${finished.length} finished`;
}
function render(){
  const done=state.status!=='playing',crossings=Math.max(0,state.path.length-1);
  $('border-level').value=state.level;
  $('border-endpoints').innerHTML=state.endpoints.map((code,i)=>`<button class="border-endpoint endpoint-${i}" data-focus="${code}" aria-label="Focus ${escape(name(code))} on globe"><span>${i?'B':'A'}</span><img src="assets/flags/${code}.svg" alt=""><strong>${escape(name(code))}</strong><small>Locate ↗</small></button>`).join('<span class="border-between" aria-hidden="true">↔</span>');
  $('border-endpoints').querySelectorAll('button').forEach(b=>b.onclick=()=>globe.select(b.dataset.focus));
  $('border-lives').innerHTML=`<span class="border-life-dots" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i class="${i<state.misses?'spent':''}"></i>`).join('')}</span><span>${5-state.misses} mistakes left</span>`;
  $('border-count').textContent=`${crossings} / 10 borders`;
  $('border-route').innerHTML=state.path.length?state.path.map((code,i)=>`<li><span>${i}</span><img src="assets/flags/${code}.svg" alt="">${escape(name(code))}</li>`).join(''):'<li class="border-route-empty">Your route starts here.</li>';
  const current=state.path.at(-1),destination=state.endpoints.find(c=>c!==state.path[0]);
  $('border-prompt').textContent=done?(state.status==='won'?'You connected the dots.':'The route ends here.'):current?`Next neighbour of ${name(current)}?`:'Where will you start?';
  $('border-instruction').textContent=done?'Compare your journey with one shortest route below.':current?`Heading for ${name(destination)}. Each answer must share a land border with ${name(current)}.`:'Type either endpoint, or a country bordering either one. Your first step chooses the direction.';
  $('border-answer').disabled=done;$('border-submit').disabled=done;
  $('border-form').hidden=done;$('border-result').hidden=!done;
  if(done){
    const solution=shortestRoute(graph,...(state.path[0]===state.endpoints[1]?[...state.endpoints].reverse():state.endpoints));
    $('border-result').innerHTML=`<span class="game-overline">${state.status==='won'?'ROUTE COMPLETE':'ROUND OVER'}</span><h3>${state.status==='won'?`${crossings} borders. You made it.`:state.misses===5?'Five misses. Try a new journey.':'Ten borders used. Try a new journey.'}</h3><p>One shortest route · ${solution.length-1} borders</p><ol>${solution.map(c=>`<li>${escape(name(c))}</li>`).join('')}</ol>`;
  }
  $('border-new').textContent=done?'Another journey →':'New journey ↻';
  globe.requestDraw();saveGameSession('borders',state);stats();
}
function next(level=state?.level||'easy'){
  pairs[level]||=routePairs(graph,level);
  const choices=pairs[level].filter(p=>p.join()!==state?.endpoints.join());
  const endpoints=choices[Math.floor(Math.random()*choices.length)];
  state={version:1,id:crypto.randomUUID(),answers:[],...newRoute(endpoints,level)};
  $('border-feedback').textContent='';$('border-answer').value='';globe.selected=null;overview();render();
}
function submit(event){
  event.preventDefault();const answer=$('border-answer').value.trim().slice(0,160),result=guessRoute(state,answer,graph);if(result.kind==='ignored')return;
  state={...result.state,answers:[...state.answers,answer]};
  const finished=state.status!=='playing';
  const exhausted=result.accepted&&state.status==='lost';
  recordGame({round:state.id,game:'borders',type:'guess',answer,correct:result.accepted,finished:finished&&!exhausted,topic:state.level,...(result.code?{code:result.code}:{})});
  if(exhausted)recordGame({round:state.id,game:'borders',type:'reveal',answer:'10-border limit reached',correct:false,finished:true,topic:state.level});
  const messages={spelling:'Country not recognised. Check the full name and spelling.',repeat:'You already visited that country. Choose a new neighbour.',start:'That country borders neither endpoint. Try another.',border:`That country does not share a land border with ${state.path.length?name(state.path.at(-1)):'your last country'}.`};
  $('border-feedback').textContent=result.accepted?state.status==='won'?'Connected! Your destination is reached.':`${name(result.code)} added to your route.`:`${messages[result.kind]} ${5-state.misses} mistakes left.`;
  $('border-feedback').className=`border-feedback ${result.accepted?'correct':'incorrect'}`;
  if(result.accepted){$('border-answer').value='';globe.select(result.code);}else $('border-answer').select();
  render();if(!finished)$('border-answer').focus({preventScroll:true});
}
export async function startBorders(){
  if(globe){globe.resize();stats();return;}if(loading)return;loading=true;
  $('border-loading').hidden=false;$('border-retry').hidden=true;
  try{
    const [atlas,data]=await Promise.all([loadAtlas(),fetch('data/land-borders.json').then(r=>{if(!r.ok)throw Error();return r.json();})]);graph=data.neighbors;
    globe=new BorderGlobe($('border-canvas'),atlas);
    state=restoreRoute(readGameSession('borders'),graph);
    // A stored terminal event wins over a stale active session (e.g. imported backup).
    if(state&&state.status==='playing'&&getGameEvents().some(e=>e.round===state.id&&e.finished))state=null;
    if(state){render();overview();}else next();
    if(!bound){
      $('border-form').onsubmit=submit;
      $('border-new').onclick=()=>next();
      $('border-level').onchange=()=>next($('border-level').value);
      $('border-zoom-in').onclick=()=>globe.setZoom(globe.zoom*1.2);
      $('border-zoom-out').onclick=()=>globe.setZoom(globe.zoom/1.2);
      $('border-home').onclick=overview;$('border-retry').onclick=startBorders;bound=true;
    }
    document.querySelectorAll('[data-border-control]').forEach(el=>el.disabled=false);
    // Preserve the disabled state of the answer after restoring a completed round.
    $('border-answer').disabled=state.status!=='playing';$('border-submit').disabled=state.status!=='playing';
    $('border-loading').hidden=true;
  }catch{
    globe?.destroy();globe=null;$('border-loading').textContent='The map could not load. Please try again.';$('border-retry').hidden=false;$('border-retry').onclick=startBorders;
  }finally{loading=false;}
}
