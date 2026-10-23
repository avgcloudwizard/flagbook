import {layoutRouteLabels} from './border-labels.js?v=12';
import {BY_CODE} from './core.js';
import {Globe,loadAtlas} from './globe.js?v=11';
import {LEVELS,routePairs,newRoute,guessRoute,restoreRoute,allRoutes} from './border-core.js?v=12';
import {recordGame,getGameEvents,readGameSession,saveGameSession} from './games-store.js?v=11';
const $=id=>document.getElementById(id),name=code=>BY_CODE.get(code).name;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let graph,globe,state,loading=false,bound=false,pairs={},solutions=[],selectedRoute=null,resultRound=null,routePage=0,routeLength=0;
const PAGE_SIZE=6;
class BorderGlobe extends Globe{
  draw(){
    super.draw();if(!this.width||!state)return;
    const ctx=this.ctx,display=selectedRoute||state.path,colors=new Map(display.map(c=>[c,'#d4f285'])),labels=[];
    ctx.font='600 12px sans-serif';
    state.endpoints.forEach((c,i)=>{if(!colors.has(c))colors.set(c,i?'#e8a77b':'#88cddd');});
    for(const f of this.atlas.features)if(colors.has(f.code)){
      ctx.beginPath();this.path(f);ctx.fillStyle=colors.get(f.code);ctx.fill();ctx.strokeStyle='#f2f5d9';ctx.lineWidth=1;ctx.stroke();
    }
    for(const [code,color] of colors){
      const c=this.atlas.details[code],coords=[c.coordinates[1],c.coordinates[0]];if(!this.visible(coords))continue;
      const [x,y]=this.projection(coords);ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#152c36';ctx.lineWidth=1.5;ctx.stroke();
      if(state.status!=='playing'||state.endpoints.includes(code)||code===state.path.at(-1)){
        const text=name(code),width=ctx.measureText(text).width+12,feature=this.atlas.features.find(f=>f.code===code);
        // All corners of the text must lie within the country for an inside label.
        const inside=feature&&[[-width/2,-10],[width/2,-10],[-width/2,10],[width/2,10],[0,0]].every(([dx,dy])=>{
          const p=this.projection.invert([x+dx,y+dy]);return p&&this.visible(p)&&d3.geoContains(feature,p);
        });
        labels.push({text,width,anchor:[x,y],inside});
      }
    }
    ctx.save();ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    const tags=layoutRouteLabels(labels,this.width,this.height);
    for(const tag of tags){
      if(tag.leader){
        const endX=Math.max(tag.x,Math.min(tag.x+tag.width,tag.anchor[0])),endY=Math.max(tag.y,Math.min(tag.y+tag.height,tag.anchor[1]));
        ctx.beginPath();ctx.moveTo(...tag.anchor);ctx.lineTo(endX,endY);ctx.strokeStyle='#102932';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#ecf4c6';ctx.lineWidth=1;ctx.stroke();
      }
    }
    for(const tag of tags){
      const x=tag.x+tag.width/2,y=tag.y+tag.height/2;
      if(tag.leader){ctx.fillStyle='#102932';ctx.fillRect(tag.x,tag.y,tag.width,tag.height);}
      ctx.lineWidth=3;ctx.strokeStyle='#102932';ctx.strokeText(tag.text,x,y);ctx.fillStyle='#fff8df';ctx.fillText(tag.text,x,y);
    }
    ctx.restore();
  }
}
function overview(){
  const points=(selectedRoute?.length?selectedRoute:state.endpoints).map(code=>{const c=globe.atlas.details[code];return [c.coordinates[1],c.coordinates[0]];}),middle=d3.geoCentroid({type:'MultiPoint',coordinates:points});
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
  $('border-instruction').textContent=done?'Your route and every alternative in this mode. Select one to see it on the globe.':current?`Heading for ${name(destination)}. Each answer must share a land border with ${name(current)}.`:'Type either endpoint, or a country bordering either one. Your first step chooses the direction.';
  $('border-answer').disabled=done;$('border-submit').disabled=done;
  $('border-form').hidden=done;$('border-result').hidden=!done;
  if(done)renderResults();
  $('border-new').textContent=done?'Another journey →':'New journey ↻';
  globe.requestDraw();saveGameSession('borders',state);stats();
}
function routeMarkup(route){return route.map(c=>`<span>${escape(name(c))}</span>`).join('<b aria-hidden="true"> → </b>');}
function showRoute(route,label){
  selectedRoute=route;globe.selected=null;overview();
  $('border-map-view').hidden=false;$('border-count').textContent=`Viewing ${Math.max(0,route.length-1)} borders`;$('border-legend-route').textContent='Selected route';
  $('border-map-view').innerHTML=`<strong>${escape(label)}</strong><span>${Math.max(0,route.length-1)} borders · Select a country to locate it</span><div>${route.map((c,i)=>`<button data-route-country="${c}">${i}. ${escape(name(c))}</button>`).join('')}</div>`;
  $('border-map-view').querySelectorAll('button').forEach(b=>b.onclick=()=>globe.select(b.dataset.routeCountry));
}
function renderResults(){
  const won=state.status==='won',crossings=Math.max(0,state.path.length-1),[min,max]=LEVELS[state.level];
  if(resultRound!==state.id){
    const endpoints=state.path[0]===state.endpoints[1]?[...state.endpoints].reverse():state.endpoints;
    solutions=allRoutes(graph,...endpoints,state.level);resultRound=state.id;routePage=0;routeLength=0;
    showRoute(won?state.path:solutions[0],won?'Your winning route':'Shortest route');
  }
  const ownKey=state.path.join(),alternatives=solutions.filter(r=>!won||r.join()!==ownKey),filtered=alternatives.filter(r=>!routeLength||r.length-1===routeLength),pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  routePage=Math.min(routePage,pages-1);
  $('border-result').innerHTML=`<span class="game-overline">${won?'YOUR WINNING ROUTE':'ROUND OVER'}</span><h3>${won?`${crossings} borders. Your route counts.`:state.misses===5?'Five misses. Explore the ways through.':'Ten borders used. Explore the ways through.'}</h3>
    ${state.path.length?`<button class="border-solution own-route" id="border-own-route" aria-pressed="${selectedRoute?.join()===ownKey}"><strong>${won?'Your answer':'Your unfinished journey'} · ${crossings} borders</strong><span>${routeMarkup(state.path)}</span><small>Show on globe ↗</small></button>`:'<p>You did not start a route this round.</p>'}
    <div class="border-alternatives-heading"><h4>${won?'Other possible routes':'All possible routes'}</h4><p>${solutions.length.toLocaleString()} total within ${min}–${max} borders${won&&!solutions.some(r=>r.join()===ownKey)?'; your longer winning route is shown above':won?'; your answer is shown above':''}. No repeated countries.</p></div>
    <label class="border-length-filter">Route length <select id="border-route-length"><option value="0">All · ${min}–${max} borders</option>${Array.from({length:max-min+1},(_,i)=>min+i).map(n=>`<option value="${n}" ${routeLength===n?'selected':''}>${n} borders · ${alternatives.filter(r=>r.length-1===n).length} routes</option>`).join('')}</select></label>
    <div class="border-solution-list">${filtered.slice(routePage*PAGE_SIZE,(routePage+1)*PAGE_SIZE).map(route=>`<button class="border-solution" data-solution="${solutions.indexOf(route)}" aria-pressed="${selectedRoute?.join()===route.join()}"><strong>${route.length-1} borders${route.length===solutions[0].length?' · Shortest':''}</strong><span>${routeMarkup(route)}</span><small>Show on globe ↗</small></button>`).join('')||'<p>No other routes at this length.</p>'}</div>
    <div class="border-pagination"><button id="border-routes-prev" ${routePage===0?'disabled':''}>← Previous</button><span role="status">${filtered.length?`${routePage*PAGE_SIZE+1}–${Math.min((routePage+1)*PAGE_SIZE,filtered.length)} of ${filtered.length.toLocaleString()}`:'0 routes'}</span><button id="border-routes-next" ${routePage===pages-1?'disabled':''}>Next →</button></div>`;
  if(state.path.length)$('border-own-route').onclick=()=>{showRoute(state.path,won?'Your winning route':'Your unfinished journey');renderResults();globe.canvas.scrollIntoView({behavior:'smooth',block:'center'});};
  $('border-result').querySelectorAll('[data-solution]').forEach(b=>b.onclick=()=>{const route=solutions[Number(b.dataset.solution)];showRoute(route,`Alternative route · ${route.length-1} borders`);renderResults();globe.canvas.scrollIntoView({behavior:'smooth',block:'center'});});
  $('border-route-length').onchange=()=>{routeLength=Number($('border-route-length').value);routePage=0;renderResults();$('border-route-length').focus();};
  $('border-routes-prev').onclick=()=>{routePage--;renderResults();$(routePage?'border-routes-prev':'border-routes-next').focus();};
  $('border-routes-next').onclick=()=>{routePage++;renderResults();$(routePage<pages-1?'border-routes-next':'border-routes-prev').focus();};
}
function next(level=state?.level||'easy'){
  pairs[level]||=routePairs(graph,level);
  const choices=pairs[level].filter(p=>p.join()!==state?.endpoints.join());
  const endpoints=choices[Math.floor(Math.random()*choices.length)];
  state={version:1,id:crypto.randomUUID(),answers:[],...newRoute(endpoints,level)};
  selectedRoute=null;resultRound=null;solutions=[];$('border-map-view').hidden=true;$('border-legend-route').textContent='Your route';
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
  render();if(finished)overview();if(!finished)$('border-answer').focus({preventScroll:true});
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
