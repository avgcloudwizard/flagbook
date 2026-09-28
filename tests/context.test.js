import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTRIES} from '../countries.js';
import {tourismScore,renderCountryContext,loadCountryContext} from '../country-context.js';
import {esc} from '../discovery.js';
const contexts=JSON.parse(readFileSync(new URL('../data/country-context.json',import.meta.url)));
const observations=JSON.parse(readFileSync(new URL('../data/editorial/tourism-benchmark.json',import.meta.url))).observations;
const details=JSON.parse(readFileSync(new URL('../data/country-details.json',import.meta.url)));

test('all 195 countries retain old field notes and add distinct sourced country context',()=>{
 assert.deepEqual(Object.keys(contexts).sort(),COUNTRIES.map(c=>c.code).sort());
 for(const {code} of COUNTRIES){
  const c=contexts[code];
  assert.equal(details[code].facts.length,3);
  assert.ok(c.partyFact.title&&c.partyFact.text.length>60);
  assert.ok(!details[code].facts.some(f=>f.text===c.partyFact.text));
  assert.match(c.history.text,/\d{3,4}/);
  assert.ok(c.economy.industries.length>10);
  for(const source of [c.partyFact.source,c.history.source,c.economy.source])assert.equal(new URL(source).protocol,'https:');
  const html=renderCountryContext(c,code,esc);
  assert.doesNotMatch(html,/undefined|NaN|\[object Object\]/);
  assert.match(html,/Who ruled here\?/);assert.match(html,/FUN FACT/);assert.match(html,/Tourism scale/);
 }
});
test('tourism boundaries, zero and unavailable data remain distinct',()=>{
 const score=n=>tourismScore({arrivals:n,year:2019});
 assert.equal(score(0),1);assert.equal(score(99999),1);assert.equal(score(100000),2);
 assert.equal(score(49999999),9);assert.equal(score(50000000),10);assert.equal(score(1000000000),10);
 for(const missing of [null,undefined,{}, {arrivals:NaN},{arrivals:-1}])assert.equal(tourismScore(missing),null);
});
test('tourism benchmark retains original counts and observation years without filling gaps',()=>{
 let rated=0;
 for(const {code} of COUNTRIES){
  assert.deepEqual(contexts[code].tourism,observations[code]);
  const value=contexts[code].tourism;
  if(value){rated++;assert.ok(value.year>=2010&&value.year<=2019);assert.ok(tourismScore(value)>=1&&tourismScore(value)<=10);}
 }
 assert.equal(rated,183);
 const missing=renderCountryContext(contexts.va,'va',esc);
 assert.match(missing,/unrated/);assert.match(missing,/Missing data does not mean no visitors/);
 const older=COUNTRIES.find(c=>contexts[c.code].tourism?.year<2019);
 assert.match(renderCountryContext(contexts[older.code],older.code,esc),/Older observation/);
});
test('country narratives are escaped before HTML rendering',()=>{
 const c=structuredClone(contexts.in);c.partyFact.title='<img src=x onerror=alert(1)>';c.history.text='<script>alert(1)</script> 1947';
 const html=renderCountryContext(c,'in',esc);
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
 assert.match(html,/&lt;script&gt;/);assert.match(html,/<strong>1947<\/strong>/);
});
test('a failed context request can retry and concurrent readers share the successful request',async()=>{
 const original=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;if(requests===1)return {ok:false};return {ok:true,json:async()=>contexts};};
 try{
  await assert.rejects(loadCountryContext(),/unavailable/);
  const [a,b]=await Promise.all([loadCountryContext(),loadCountryContext()]);
  assert.equal(a,contexts);assert.equal(b,contexts);assert.equal(requests,2);
 }finally{globalThis.fetch=original;}
});
