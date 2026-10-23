import {esc} from './explore-data.js?v=8';
// Reuses Flagbook's bundled Natural Earth geometry and D3 projection library.
// Lines connect locations schematically; they never claim an exact migration route.
export function connectionMap(fact,atlas,{world=false,focus=null}={}){
 const locations=fact.map.locations,w=720,h=360;
 const points=locations.map(p=>p.coordinates);
 const center=focus??Math.atan2(points.reduce((s,p)=>s+Math.sin(p[0]*Math.PI/180),0),points.reduce((s,p)=>s+Math.cos(p[0]*Math.PI/180),0))*180/Math.PI;
 const projection=d3.geoMercator().rotate([-center,0]).translate([w/2,h/2]);
 if(world)projection.scale(105).center([0,10]);
 else{
  projection.fitExtent([[65,65],[w-65,h-65]],{type:'MultiPoint',coordinates:fact.map.focusExtent||points});
  const scale=projection.scale(),cap=points.length>1?100000:1800;
  if(!Number.isFinite(scale)||scale>cap)projection.scale(cap);
  if(!Number.isFinite(scale)||scale>cap||points.length===1){const mean=points.reduce((s,p)=>s+p[1],0)/points.length;projection.center([0,mean]).translate([w/2,h/2]);}
  if(projection.scale()<100)projection.scale(100);
 }
 projection.clipExtent([[0,0],[w,h]]);
 const path=d3.geoPath(projection),highlight=new Set(fact.map.highlightCountries||fact.countries);
 const land=atlas.features.map(f=>`<path d="${path(f)||''}" fill="${highlight.has(f.code)?(fact.map.borderCountries?.[0]===f.code?'#617c94':'#557c70'):'#304f4e'}"/>`).join('');
 let line='';
 if(fact.map.borderCountries&&atlas.topology){const ids=fact.map.borderCountries.map(c=>atlas.features.find(f=>f.code===c)?.id);const border=topojson.mesh(atlas.topology,atlas.topology.objects.countries,(a,b)=>a!==b&&ids.includes(a.id)&&ids.includes(b.id));line=`<path d="${path(border)||''}" fill="none" stroke="#ffe0a0" stroke-width="3"/>`;}
 if(points.length>1&&['connection','comparison'].includes(fact.map.type))line=`<path class="connection-line" d="${path({type:'LineString',coordinates:points})||''}"/>`;
 if(fact.map.type==='dateline'){const mid=(points[0][0]+points[1][0])/2,lat=points.reduce((s,p)=>s+p[1],0)/points.length;line=`<path class="date-line" d="${path({type:'LineString',coordinates:[[mid,lat-.12],[mid,lat+.12]]})||''}"/><text x="360" y="28" text-anchor="middle" fill="#e8b585" font-size="17">Date line · schematic marker</text>`;}
 const occupied=[];
 const pins=points.map((p,i)=>{const [px,py]=projection(p);let x=px,y=py;
  if(occupied.some(o=>Math.hypot(o[0]-x,o[1]-y)<45)){x=Math.min(w-25,px+42);y=Math.min(h-25,py+25);}
  occupied.push([x,y]);return `${x!==px?`<path d="M${px},${py}L${x},${y}" stroke="#e7edd1" stroke-width="1.5"/><circle cx="${px}" cy="${py}" r="3" fill="#e7edd1"/>`:''}<g transform="translate(${x},${y})"><circle class="location-pin" r="19" fill="${i%2?'#e8b585':'#d7e7a4'}"/><text text-anchor="middle" y="6" fill="#182e28" font-size="17" font-weight="700">${i+1}</text></g>`;}).join('');
 return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(locations.map(l=>l.label).join(' connected with '))}. ${esc(fact.map.caption)}"><rect width="720" height="360" fill="#122d36"/><g stroke="#8cb3a14d" stroke-width=".6">${land}</g>${line}${pins}</svg>`;
}
