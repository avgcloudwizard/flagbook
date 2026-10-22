import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BY_CODE} from '../core.js';
import {LEVELS,shortestRoute,routePairs,newRoute,guessRoute,restoreRoute} from '../border-core.js';
import {validateGameEvents,mergeGameEvents,gameSummary} from '../games-core.js';
const graph=JSON.parse(readFileSync(new URL('../data/land-borders.json',import.meta.url))).neighbors;
const guess=(s,c)=>guessRoute(s,BY_CODE.get(c).name,graph).state;
test('border graph is symmetric, covers the site and excludes sea/overseas shortcuts',()=>{
 assert.equal(Object.keys(graph).length,195);
 for(const [a,bs] of Object.entries(graph)){assert.ok(BY_CODE.has(a));assert.equal(new Set(bs).size,bs.length);assert.ok(!bs.includes(a));for(const b of bs){assert.ok(BY_CODE.has(b));assert.ok(graph[b].includes(a),`${a} / ${b}`);}}
 for(const [a,b] of [['fr','gb'],['fr','br'],['dk','ca'],['sg','my'],['in','lk'],['sa','bh']])assert.ok(!graph[a].includes(b));
 for(const [a,b] of [['es','ma'],['za','ls'],['it','va'],['bw','zm']])assert.ok(graph[a].includes(b));
});
test('every generated pair has the requested shortest distance and is solvable both ways',()=>{
 for(const [level,[min,max]] of Object.entries(LEVELS)){
  const pairs=routePairs(graph,level);assert.ok(pairs.length>100);
  for(const pair of pairs){const path=shortestRoute(graph,...pair);assert.ok(path.length-1>=min&&path.length-1<=max);
   for(const route of [path,[...path].reverse()]){let state=newRoute(pair,level);for(const code of route)state=guess(state,code);assert.equal(state.status,'won');assert.equal(state.misses,0);}
  }
 }
});
test('first neighbour can begin at either endpoint; entering the endpoint costs no crossing',()=>{
 for(const route of [['pt','es','fr','de'],['de','fr','es','pt']]){
  let s=newRoute(['pt','de'],'easy');s=guess(s,route[1]);assert.deepEqual(s.path,route.slice(0,2));
  for(const code of route.slice(2))s=guess(s,code);assert.equal(s.status,'won');
 }
 assert.deepEqual(guess(newRoute(['pt','de'],'easy'),'de').path,['de']);
});
test('strict spelling, non-neighbours and repeats cost mistakes; fifth ends play',()=>{
 let s=newRoute(['pt','de'],'easy');assert.equal(guessRoute(s,' ',graph).kind,'ignored');
 s=guessRoute(s,'Spian',graph).state;assert.equal(s.misses,1);assert.deepEqual(s.path,[]);
 s=guess(s,'es');assert.deepEqual(s.path,['pt','es']);
 assert.equal(guessRoute(s,'Spain',graph).kind,'repeat');s=guess(s,'es');
 s=guess(s,'jp');s=guess(s,'jp');assert.equal(s.status,'playing');assert.equal(s.misses,4);
 s=guess(s,'jp');assert.equal(s.status,'lost');assert.equal(s.misses,5);
 assert.strictEqual(guessRoute(s,'France',graph).state,s);
});
test('tenth crossing wins at destination or loses elsewhere, including a correct last step',()=>{
 // A deliberate detour, with no repeated countries, reaches 10 edges.
 const route=['pt','es','fr','be','nl','de','pl','cz','at','si','hr'];
 let s=newRoute(['pt','gr'],'medium');for(const c of route)s=guess(s,c);assert.equal(s.status,'lost');assert.equal(s.path.length,11);assert.equal(s.misses,0);
 s=newRoute(['pt','hr'],'medium');for(const c of route)s=guess(s,c);assert.equal(s.status,'won');assert.equal(s.path.length,11);
});
test('session restore replays attempts and rejects impossible or post-game guesses',()=>{
 const saved={version:1,id:'route-1',level:'easy',endpoints:['pt','de'],answers:['Spian','Spain','France']};
 const s=restoreRoute(saved,graph);assert.equal(s.misses,1);assert.deepEqual(s.path,['pt','es','fr']);
 assert.equal(restoreRoute({...saved,endpoints:['jp','de']},graph),null);
 assert.equal(restoreRoute({...saved,answers:[...saved.answers,'Germany','Poland']},graph),null);
 assert.equal(restoreRoute({...saved,level:'hard'},graph),null);
 assert.equal(restoreRoute({...saved,answers:['Germany','Czechia']},graph).path[0],'de');
});
test('border attempts survive backup merges and distinguish wins from losses',()=>{
 const base={round:'borders-1',game:'borders',type:'guess',answer:'Spain',at:'2026-10-23T12:00:00Z',correct:true,finished:false};
 const events=[{...base,id:'1'},{...base,id:'2',answer:'Germany',finished:true,at:'2026-10-23T12:01:00Z'}];
 validateGameEvents(events);assert.equal(mergeGameEvents(events,events).length,2);assert.deepEqual(gameSummary(events,'borders'),{completed:1,clean:1});
 events[1].correct=false;assert.deepEqual(gameSummary(events,'borders'),{completed:1,clean:0});
});
