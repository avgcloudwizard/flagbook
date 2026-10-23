import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gameTopics,topFiveEntries,comparison,checkDirection,checkTopFive,pickMystery,mysteryCandidates,validateGameEvents,mergeGameEvents,gameSummary} from '../games-core.js';
const records=JSON.parse(readFileSync(new URL('../data/world-records.json',import.meta.url))).items;
const topics=gameTopics(records);
test('games exclude mixed-date holdings and shared features; comparable topics retain source periods',()=>{
 assert.ok(topics.length>=20&&topics.length<40);
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
 assert.ok(mysteryCandidates(topics).length>=15);
 for(let i=0;i<30;i++){
  const mystery=pickMystery(topics);assert.ok(mystery.clues.length===1);
  assert.equal(new Set(mystery.clues.map(c=>c.topic)).size,mystery.clues.length);
  for(const clue of mystery.clues){
   const item=topics.find(i=>i.id===clue.topic),entry=item.entries.find(e=>e.code===mystery.code);
   assert.equal(entry.value,clue.value);assert.equal(entry.rank,clue.rank);assert.ok(entry.rank<=3);
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

test('familiar topics exclude niche crops in every game and producer comparisons stay in top three',()=>{
 for(const id of ['pepper','karite-nuts','cow-peas'])assert.ok(!topics.some(i=>i.id===id));
 for(const id of ['rice','gold-mine','oil','coffee','population','country-area'])assert.ok(topics.some(i=>i.id===id));
 for(const item of topics.filter(i=>!['population','country-area','forest'].includes(i.id)))for(let i=0;i<20;i++)assert.ok(comparison(item).every(e=>e.rank<=3));
});
test('game values spell out large units and never pair indistinguishable rounded values',async()=>{
 const {gameNumber,topThreeEntries,checkTopThree}=await import('../game-format.js');
 assert.equal(gameNumber(300000000000,'people'),'300 billion people');
 assert.equal(gameNumber(130034675,'people'),'130 million people');
 assert.equal(gameNumber(77500,'tonnes'),'77.5 thousand tonnes');
 assert.equal(gameNumber(95,'%'),'95%');
 assert.equal(comparison({id:'population',unit:'people',entries:[{code:'in',value:130034675},{code:'cn',value:130035675}]}),null);
 const item={entries:[{code:'cn',rank:1,value:9},{code:'in',rank:2,value:8},{code:'us',rank:3,value:7},{code:'br',rank:3,value:7},{code:'fr',rank:5,value:4}]};
 assert.equal(topThreeEntries(item).length,4);
 assert.equal(checkTopThree(item,[],'Brazil',answer=>answer==='Brazil'?'br':null).status,'correct');
});
test('language comparisons keep their source years, definitions and geographic coverage',()=>{
 const content=JSON.parse(readFileSync(new URL('../data/game-content.json',import.meta.url)));
 const english=content.items.find(i=>i.id==='english-speakers-eu'),spanish=content.items.find(i=>i.id==='spanish-native-speakers');
 assert.equal(english.entries.length,27);assert.equal(english.entries.find(e=>e.code==='nl').value,95);assert.match(english.year,/2023/);assert.match(english.coverage,/EU/);
 assert.equal(spanish.entries.find(e=>e.code==='mx').value,130034675);assert.match(spanish.measure,/native/);
 for(const i of content.items){assert.ok(i.higherOnly);assert.match(i.source,/^https:/);assert.equal(new Set(i.entries.map(e=>e.code)).size,i.entries.length);}
 assert.equal(mysteryCandidates(gameTopics(content.items)).length,0);
 for(const c of Object.values(content.culture)){assert.ok(c.text.length>20);assert.match(c.source,/^https:/);}
});
