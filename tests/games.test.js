import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameTopics,topFiveEntries,comparison,checkDirection,checkTopFive,pickMystery,mysteryCandidates,validateGameEvents,mergeGameEvents,gameSummary} from '../games-core.js';
const records=JSON.parse(readFileSync(new URL('../data/world-records.json',import.meta.url))).items;
const topics=gameTopics(records);
test('games exclude mixed-date holdings and shared features; comparable topics retain source periods',()=>{
 assert.ok(topics.length>230);
 assert.equal(topics.some(i=>i.id==='gold-holdings'),false);
 assert.equal(topics.some(i=>i.id==='rivers'),false);
 assert.ok(topics.some(i=>i.id==='gold-mine'));
 assert.ok(topics.some(i=>i.id==='country-area'));
 for(const i of topics){assert.ok(i.year);assert.match(i.source,/^https:/);assert.ok(i.coverage);}
});
test('higher/lower draws distinct nonzero values and grades both directions correctly',()=>{
 for(const item of topics)for(const random of [()=>0,()=>.4,()=>.99999]){
  const pair=comparison(item,random);if(!pair)continue;
  assert.notEqual(pair[0].code,pair[1].code);assert.notEqual(pair[0].value,pair[1].value);
  assert.ok(pair.every(e=>e.value>0));
  const answer=pair[1].value>pair[0].value?'higher':'lower';
  assert.equal(checkDirection(pair,answer),true);
  assert.equal(checkDirection(pair,answer==='higher'?'lower':'higher'),false);
 }
 assert.equal(comparison({entries:[{code:'in',value:4},{code:'us',value:4}]},()=>0),null);
});
test('top-five accepts the fifth-place tie, rejects repeated answers and enforces spelling',()=>{
 const item={entries:[{code:'cn',value:10,rank:1},{code:'in',value:9,rank:2},{code:'us',value:8,rank:3},{code:'br',value:7,rank:4},{code:'tr',value:6,rank:5},{code:'fr',value:6,rank:5},{code:'it',value:1,rank:7}]};
 assert.equal(topFiveEntries(item).length,6);
 assert.equal(checkTopFive(item,[],'France').status,'correct');
 assert.equal(checkTopFive(item,[],' Türkiye ').status,'correct');
 assert.equal(checkTopFive(item,['in'],'India').status,'duplicate');
 assert.equal(checkTopFive(item,[],'Indai').status,'incorrect');
 assert.equal(checkTopFive(item,[],'Italy').status,'incorrect');
 assert.equal(topFiveEntries({entries:item.entries.slice(0,4)}).length,0);
});
test('mystery clues point to the same country with original values, dates and ranks',()=>{
 assert.ok(mysteryCandidates(topics).length>50);
 for(let i=0;i<30;i++){
  const mystery=pickMystery(topics);assert.ok(mystery.clues.length>=2);
  assert.equal(new Set(mystery.clues.map(c=>c.topic)).size,mystery.clues.length);
  for(const clue of mystery.clues){
   const item=topics.find(i=>i.id===clue.topic),entry=item.entries.find(e=>e.code===mystery.code);
   assert.equal(entry.value,clue.value);assert.equal(entry.rank,clue.rank);assert.ok(entry.rank<=5);
  }
 }
 assert.equal(pickMystery([]),null);
});
const event=(id,extra={})=>({id,round:'round-1',game:'map',type:'guess',answer:'India',correct:true,finished:true,code:'in',at:'2026-10-21T12:00:00.000Z',...extra});
test('saved game scores distinguish retries, hints and clean multi-answer rounds',()=>{
 const history=[event('1',{correct:false,finished:false}),event('2',{at:'2026-10-21T12:00:01.000Z'})];
 validateGameEvents(history);assert.deepEqual(gameSummary(history,'map'),{completed:1,clean:0});
 const five=[event('3',{game:'five',finished:false}),event('4',{game:'five',at:'2026-10-21T12:00:01.000Z'})];
 assert.deepEqual(gameSummary(five,'five'),{completed:1,clean:1});
 const assisted=[event('5',{type:'hint',correct:false,finished:false}),event('6',{at:'2026-10-21T12:00:01.000Z'})];
 assert.deepEqual(gameSummary(assisted,'map'),{completed:1,clean:0});
 assert.deepEqual(gameSummary(history,'higher'),{completed:0,clean:0});
});
test('game backups merge idempotently and reject conflicting or malformed histories',()=>{
 const history=[event('1')];assert.equal(mergeGameEvents(history,history).length,1);
 assert.throws(()=>mergeGameEvents(history,[event('1',{answer:'China'})]));
 assert.throws(()=>validateGameEvents([event('1',{code:'xx'})]));
 assert.throws(()=>validateGameEvents([event('1',{type:'reveal'})]));
 assert.throws(()=>validateGameEvents([event('1'),event('2',{at:'2026-10-21T12:00:01.000Z'})]));
 assert.throws(()=>validateGameEvents([event('1',{correct:'true'})]));
 assert.deepEqual(mergeGameEvents([],[]),[]);
});

test('mystery clues never penalise another country tied for the displayed statistic',()=>{
 for(const candidate of mysteryCandidates(topics))for(const clue of candidate.clues){
  const item=topics.find(i=>i.id===clue.topic);
  assert.equal(item.entries.filter(e=>e.value===clue.value).length,1);
 }
});
