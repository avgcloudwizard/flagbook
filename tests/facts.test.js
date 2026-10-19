import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTRIES} from '../countries.js';
import {chooseFact,dailyFact,readFactState,FACTS_KEY} from '../facts-core.js';
import {visibleEntries} from '../records.js';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url)));
const data=read('fun-facts.json'),records=read('world-records.json'),details=read('country-details.json');
const codes=new Set(COUNTRIES.map(c=>c.code));
test('fact collection is distinct, sourced, and covers every country',()=>{
 assert.ok(data.facts.length>=4000);assert.ok(data.counts.story>=1000);
 assert.equal(new Set(data.facts.map(f=>f.id)).size,data.facts.length);
 assert.equal(new Set(data.facts.map(f=>f.body.replace(/\W/g,'').toLowerCase())).size,data.facts.length);
 const covered=new Set();for(const f of data.facts){assert.ok(f.title&&f.body&&f.year&&f.sourceLabel);assert.equal(new URL(f.source).protocol,'https:');assert.doesNotMatch(f.body,/undefined|NaN|<script/);for(const c of f.countries){assert.ok(codes.has(c));covered.add(c);}}
 assert.deepEqual(covered,codes);
});
test('data cards preserve source years, rankings and tied-answer exclusions',()=>{
 for(const f of data.facts.filter(f=>f.kind==='data')){
  const topic=records.items.find(i=>i.id===f.topic),entry=topic.entries.find(e=>e.code===f.countries[0]);
  assert.ok(entry);assert.equal(f.year,topic.year);assert.equal(f.source,topic.source);assert.ok(f.body.includes('#'+entry.rank+' '));
  assert.deepEqual(f.excludeChoices||[],topic.entries.filter(e=>e.rank===entry.rank&&e.code!==entry.code).map(e=>e.code));
 }
});
test('shuffle prioritises unread facts and avoids immediate repeats after exhaustion',()=>{
 const pool=[{id:'a',kind:'story',category:'A'},{id:'b',kind:'story',category:'B'},{id:'c',kind:'data',category:'C'}];
 assert.equal(chooseFact(pool,new Set(['a','b']),pool[0],()=>0).id,'c');
 assert.notEqual(chooseFact(pool,new Set(['a','b','c']),pool[0],()=>0).id,'a');
 assert.equal(chooseFact([],new Set(),null),null);assert.equal(chooseFact([pool[0]],new Set(['a']),pool[0]),pool[0]);
 assert.equal(chooseFact(pool,new Set(),null,()=>0).kind,'story');
});
test('daily selection is stable and reading-state recovery rejects invalid IDs',()=>{
 assert.equal(dailyFact(data.facts,'2026-10-19'),dailyFact(data.facts,'2026-10-19'));assert.equal(dailyFact(data.facts,'2026-10-19').kind,'story');
 const state=readFactState('{"seen":["a","a","forged"],"saved":["b",false]}',new Set(['a','b']));
 assert.deepEqual([...state.seen],['a']);assert.deepEqual([...state.saved],['b']);assert.equal(readFactState('broken',new Set()).saved.size,0);assert.equal(FACTS_KEY,'flagbook.facts.v1');
});
test('continent and row limits retain world ranks and never mutate the source',()=>{
 const item=records.items.find(i=>i.id==='cocoa'),before=JSON.stringify(item);
 const filtered=visibleEntries(item,{continent:'South America',limit:'all',details});assert.ok(filtered.length>5);assert.ok(filtered[0].rank>1);
 assert.deepEqual(visibleEntries(item,{continent:'South America',limit:5,details}),filtered.slice(0,5));assert.equal(JSON.stringify(item),before);
});
