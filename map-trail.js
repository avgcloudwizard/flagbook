// Country reference points, not distances to coastlines or national borders.
export const STOPS=3;
export function guidance(from,to){
  const rad=Math.PI/180,[a,l]=from.map(v=>v*rad),[b,n]=to.map(v=>v*rad),dl=n-l;
  const h=Math.sin((b-a)/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dl/2)**2;
  const km=12742*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
  const angle=Math.atan2(Math.sin(dl)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dl))/rad;
  return {km:Math.max(0,Math.round(km/10)*10),direction:['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round((angle+360)/45)%8]};
}
export function outcome(revealed,misses,hinted){return revealed?'revealed':misses||hinted?'found':'clean';}
export const outcomeLabel={clean:'First try',found:'Found',revealed:'Revealed'};
export function validStops(stops,known){return Array.isArray(stops)&&stops.length<=STOPS&&new Set(stops.map(s=>s?.code)).size===stops.length&&stops.every(s=>s&&known.has(s.code)&&Object.hasOwn(outcomeLabel,s.outcome));}
