import {matchCountry} from './games-core.js?v=11';
export const LEVELS={easy:[3,4],medium:[5,7],hard:[8,10]};
export const MAX_CROSSINGS=10,MAX_MISSES=5;
export function shortestRoute(graph,start,end){
  const queue=[[start]],seen=new Set([start]);
  for(let i=0;i<queue.length;i++){
    const path=queue[i],last=path.at(-1);if(last===end)return path;
    for(const code of graph[last]||[])if(!seen.has(code)){seen.add(code);queue.push([...path,code]);}
  }
  return [];
}
export function routePairs(graph,level){
  const [min,max]=LEVELS[level],codes=Object.keys(graph),pairs=[];
  for(let i=0;i<codes.length;i++){
    const distances=new Map([[codes[i],0]]),queue=[codes[i]];
    for(let j=0;j<queue.length;j++){
      const a=queue[j],distance=distances.get(a);if(distance>=max)continue;
      for(const b of graph[a])if(!distances.has(b)){distances.set(b,distance+1);queue.push(b);}
    }
    for(let j=i+1;j<codes.length;j++){const d=distances.get(codes[j]);if(d>=min&&d<=max)pairs.push([codes[i],codes[j]]);}
  }
  return pairs;
}
export function newRoute(endpoints,level){return {endpoints:[...endpoints],level,path:[],misses:0,status:'playing'};}
export function guessRoute(state,answer,graph){
  if(state.status!=='playing'||!answer.trim())return {state,kind:'ignored'};
  const code=matchCountry(answer),path=[...state.path];let reason='spelling';
  if(code){
    if(path.includes(code))reason='repeat';
    else if(!path.length){
      if(state.endpoints.includes(code))path.push(code);
      else {const start=state.endpoints.find(a=>graph[a].includes(code));if(start)path.push(start,code);else reason='start';}
    }else if(graph[path.at(-1)].includes(code))path.push(code);
    else reason='border';
  }
  const accepted=path.length>state.path.length;
  const next={...state,path,misses:state.misses+(accepted?0:1)};
  const destination=state.endpoints.find(c=>c!==path[0]);
  if(path.length>1&&path.at(-1)===destination)next.status='won';
  else if(next.misses>=MAX_MISSES||path.length-1>=MAX_CROSSINGS)next.status='lost';
  return {state:next,kind:accepted?'correct':reason,code,accepted};
}
// Rebuild the route from guesses so stale or malformed session data cannot bypass rules.
export function restoreRoute(saved,graph){
  if(!saved||saved.version!==1||typeof saved.id!=='string'||!saved.id||saved.id.length>100||!LEVELS[saved.level]||!Array.isArray(saved.endpoints)||saved.endpoints.length!==2||!saved.endpoints.every(c=>Array.isArray(graph[c]))||!Array.isArray(saved.answers)||saved.answers.length>16)return null;
  const distance=shortestRoute(graph,...saved.endpoints).length-1,[min,max]=LEVELS[saved.level];if(distance<min||distance>max)return null;
  let state=newRoute(saved.endpoints,saved.level);
  for(const answer of saved.answers){if(typeof answer!=='string'||answer.length>160)return null;const result=guessRoute(state,answer,graph);if(result.kind==='ignored')return null;state=result.state;}
  return {...saved,...state};
}

// Enumerate every simple route in the mode's range. Reverse distances prune
// branches that cannot reach the destination within the remaining crossings.
export function allRoutes(graph,start,end,level){
  const [min,max]=LEVELS[level],distances=new Map([[end,0]]),queue=[end],routes=[];
  for(let i=0;i<queue.length;i++)for(const c of graph[queue[i]]||[])if(!distances.has(c)){distances.set(c,distances.get(queue[i])+1);queue.push(c);}
  const path=[start],visited=new Set(path);
  function visit(current){
    const crossings=path.length-1;
    if(current===end){if(crossings>=min)routes.push([...path]);return;}
    if(crossings+(distances.get(current)??Infinity)>max)return;
    for(const next of graph[current]||[])if(!visited.has(next)&&crossings+1+(distances.get(next)??Infinity)<=max){
      path.push(next);visited.add(next);visit(next);visited.delete(next);path.pop();
    }
  }
  visit(start);
  return routes.sort((a,b)=>a.length-b.length||a.join().localeCompare(b.join()));
}
