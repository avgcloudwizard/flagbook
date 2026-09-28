// Canvas orthographic globe. Data is bundled locally; no map service or API key.
let atlasPromise;
export function loadAtlas() {
  if (!atlasPromise) atlasPromise=Promise.all([
    fetch('data/world-50m.json').then(r=>{if(!r.ok)throw new Error('Map unavailable');return r.json();}),
    fetch('data/country-details.json').then(r=>{if(!r.ok)throw new Error('Country guide unavailable');return r.json();})
  ]).then(([world,details])=>{
    const byId=new Map(Object.entries(details).map(([code,c])=>[c.numeric,code]));
    const features=topojson.feature(world,world.objects.countries).features;
    // Natural Earth omits a numeric ID for Norway in some releases.
    for(const f of features)f.code=byId.get(String(f.id).padStart(3,'0'))||(f.properties.name==='Norway'?'no':null);
    return {features,details,borders:topojson.mesh(world,world.objects.countries,(a,b)=>a!==b)};
  }).catch(error=>{atlasPromise=null;throw error;});
  return atlasPromise;
}
export class Globe {
  constructor(canvas,atlas,{interactive=true,onSelect=()=>{},onMessage=()=>{},compact=false}={}) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.atlas=atlas;this.compact=compact;this.onSelect=onSelect;this.onMessage=onMessage;
    this.rotation=[-12,-16,0];this.zoom=1;this.selected=null;this.hovered=null;this.frame=0;
    this.projection=d3.geoOrthographic().clipAngle(90).precision(.4);
    this.path=d3.geoPath(this.projection,this.ctx);this.graticule=d3.geoGraticule().step([20,20])();
    const codeSet=new Set(atlas.features.map(f=>f.code));
    this.small=Object.entries(atlas.details).filter(([code,c])=>!codeSet.has(code)||c.area<1200).map(([code,c])=>({code,coords:[c.coordinates[1],c.coordinates[0]]}));
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
    if(interactive)this.bind();
    this.resize();
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    this.width=rect.width;this.height=rect.height;this.ratio=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*this.ratio);this.canvas.height=Math.round(this.height*this.ratio);this.requestDraw();
  }
  requestDraw(){if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
  draw(){
    if(!this.width)return;
    const ctx=this.ctx,w=this.width,h=this.height,r=Math.min(w,h)*.425*this.zoom;
    ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    this.projection.translate([w/2,h/2]).scale(r).rotate(this.rotation);
    const ocean=ctx.createRadialGradient(w*.38,h*.32,r*.04,w/2,h/2,r);ocean.addColorStop(0,'#234959');ocean.addColorStop(.72,'#102c3b');ocean.addColorStop(1,'#0b1a29');
    ctx.save();ctx.shadowColor='#5bdae72b';ctx.shadowBlur=this.compact?18:38;
    ctx.beginPath();this.path({type:'Sphere'});ctx.fillStyle=ocean;ctx.fill();ctx.restore();
    ctx.beginPath();this.path(this.graticule);ctx.strokeStyle='#75c3d51f';ctx.lineWidth=.65;ctx.stroke();
    for(const f of this.atlas.features){
      ctx.beginPath();this.path(f);ctx.fillStyle=this.selected&&f.code===this.selected?'#d4f285':this.hovered&&f.code===this.hovered?'#74ada2':f.code?'#3e746c':'#304e52';ctx.fill();
      ctx.strokeStyle=this.selected&&f.code===this.selected?'#edffb8':'#a5d6c345';ctx.lineWidth=this.selected&&f.code===this.selected?1.25:.65;ctx.stroke();
    }
    // Tiny states remain discoverable and selectable, even below the map scale.
    for(const point of this.small){
      if(!this.visible(point.coords))continue;const xy=this.projection(point.coords);if(!xy)continue;
      ctx.beginPath();ctx.arc(xy[0],xy[1],point.code===this.selected?5:3,0,Math.PI*2);ctx.fillStyle=point.code===this.selected?'#e5ffab':'#8dc5b1';ctx.fill();ctx.strokeStyle='#152c36';ctx.lineWidth=1;ctx.stroke();
    }
    if(this.selected){const c=this.atlas.details[this.selected],coords=[c.coordinates[1],c.coordinates[0]];
      if(this.visible(coords)){const [x,y]=this.projection(coords);ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.strokeStyle='#ebffb5aa';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle='#efffc9';ctx.fill();}
    }
    ctx.beginPath();this.path({type:'Sphere'});ctx.strokeStyle='#9cdae14a';ctx.lineWidth=1.2;ctx.stroke();
  }
  visible(coords){return d3.geoDistance(coords,[-this.rotation[0],-this.rotation[1]])<Math.PI/2-.012;}
  select(code,{focus=true}={}){
    this.selected=code;if(code&&focus){const c=this.atlas.details[code];this.rotation=[-c.coordinates[1],-c.coordinates[0],0];}this.requestDraw();
  }
  setZoom(value){this.zoom=Math.max(.85,Math.min(5,value));this.requestDraw();}
  rotate(dx,dy){this.rotation=[this.rotation[0]+dx,Math.max(-85,Math.min(85,this.rotation[1]+dy)),0];this.requestDraw();}
  reset(){this.zoom=1;this.rotation=[-12,-16,0];this.requestDraw();}
  pick(x,y){
    const r=this.projection.scale(),center=this.projection.translate();if(Math.hypot(x-center[0],y-center[1])>r)return null;
    let pin=null,best=10;
    for(const p of this.small){if(!this.visible(p.coords))continue;const xy=this.projection(p.coords),distance=Math.hypot(x-xy[0],y-xy[1]);if(distance<best){best=distance;pin=p.code;}}
    if(pin)return pin;
    const coords=this.projection.invert([x,y]);if(!coords||!Number.isFinite(coords[0]))return null;
    return this.atlas.features.find(f=>f.code&&d3.geoContains(f,coords))?.code||null;
  }
  bind(){
    const el=this.canvas;let drag=null,hoverTime=0;
    const pos=e=>{const r=el.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
    el.addEventListener('pointerdown',e=>{if(e.button!==0)return;const [x,y]=pos(e);drag={id:e.pointerId,x,y,lastX:x,lastY:y,moved:false};el.setPointerCapture(e.pointerId);el.classList.add('dragging');});
    el.addEventListener('pointermove',e=>{
      const [x,y]=pos(e);
      if(drag&&e.pointerId===drag.id){if(Math.hypot(x-drag.x,y-drag.y)>5)drag.moved=true;if(drag.moved)this.rotate((x-drag.lastX)*.28/this.zoom,-(y-drag.lastY)*.28/this.zoom);drag.lastX=x;drag.lastY=y;}
      else if(e.pointerType!=='touch'&&performance.now()-hoverTime>100){hoverTime=performance.now();const code=this.pick(x,y);if(this.hovered!==code){this.hovered=code;el.style.cursor=code?'pointer':'grab';this.requestDraw();}}
    });
    el.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;el.classList.remove('dragging');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);if(!moved){const code=this.pick(...pos(e));if(code)this.onSelect(code);else this.onMessage('Choose a country on the globe. Small dots mark tiny states.');}});
    el.addEventListener('pointercancel',()=>{drag=null;el.classList.remove('dragging');});
    el.addEventListener('pointerleave',()=>{this.hovered=null;this.requestDraw();});
    el.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.zoom*Math.exp(-e.deltaY*.001));},{passive:false});
    el.addEventListener('keydown',e=>{
      const moves={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,10],ArrowDown:[0,-10]};
      if(moves[e.key]){e.preventDefault();this.rotate(...moves[e.key]);}
      if(e.key==='+'||e.key==='='){e.preventDefault();this.setZoom(this.zoom*1.2);}
      if(e.key==='-'){e.preventDefault();this.setZoom(this.zoom/1.2);}
      if(e.key==='Enter'){e.preventDefault();const code=this.pick(this.width/2,this.height/2);if(code)this.onSelect(code);else this.onMessage('Rotate a country to the centre, then press Enter.');}
    });
  }
  destroy(){this.resizeObserver.disconnect();cancelAnimationFrame(this.frame);}
}
