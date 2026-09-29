import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {COUNTRIES} from '../countries.js';
import {countrySummary,currencyReference,languageCard,formatValue,continentForRegion,loadJSON} from '../explore-data.js';
import {topFive,rankingList,countryHighlights} from '../records.js';
import {Globe} from '../globe.js';
const json=file=>JSON.parse(readFileSync(new URL('../data/'+file,import.meta.url)));
const extras=json('country-extras.json'),details=json('country-details.json'),contexts=json('country-context.json'),fx=json('exchange-rates.json'),records=json('world-records.json');
const codes=new Set(COUNTRIES.map(c=>c.code));

test('all countries have sourced language samples, high points and valid INR references',()=>{
 assert.deepEqual(Object.keys(extras).sort(),[...codes].sort());
 for(const code of codes){
  const x=extras[code],c=details[code];
  assert.ok(x.languageText&&x.highestPoint&&x.location,code);
  assert.ok(x.writingSamples.length,code);
  assert.equal(new URL(x.languageSource).protocol,'https:');
  for(const sample of [...x.writingSamples,...x.transcripts])assert.ok(sample.text&&sample.language&&sample.meaning);
  for(const currency of c.currencies){const r=fx.rates[currency.code];assert.ok(r?.value>0,code+' '+currency.code);assert.match(r.date,/^2026-\d\d-\d\d$/);}
  const summary=countrySummary(c,x,contexts[code]);assert.doesNotMatch(summary,/undefined|NaN|\[object Object\]/);
  assert.ok(continentForRegion(c.region));
  for(let i=1;i<x.rivers.length;i++)assert.ok(x.rivers[i-1].length>=x.rivers[i].length);
 }
 assert.equal(fx.rates.INR.value,1);
 assert.match(extras.in.languageText,/Union/);
 assert.match(extras.ml.languageText,/French is a working/);
});

test('all record topics rank only valid countries, preserve ties, units and dates',()=>{
 assert.equal(records.items.length,17);
 for(const item of records.items){
  assert.ok(item.year&&item.unit&&item.coverage&&item.note);
  assert.equal(new URL(item.source).protocol,'https:');
  assert.ok(topFive(item).length>=5,item.id);
  for(const entry of item.entries){
   assert.ok(entry.value>0);
   assert.equal(entry.rank,1+item.entries.filter(e=>e.value>entry.value).length);
   for(const code of entry.countries||[entry.code])assert.ok(codes.has(code),item.id+' '+code);
  }
  for(let i=1;i<item.entries.length;i++)assert.ok(item.entries[i-1].value>=item.entries[i].value);
  assert.doesNotMatch(rankingList(item,'in'),/undefined|NaN/);
 }
 const item=id=>records.items.find(i=>i.id===id);
 assert.equal(item('coffee').entries[0].code,'br');assert.equal(item('rice').entries[0].code,'in');
 assert.equal(item('tourism').year,'2019');assert.equal(item('oil').unit,'TWh');
 assert.equal(topFive({entries:[1,2,3,4,5,5,7].map(rank=>({rank}))}).length,6);
});

test('country facts escape text and avoid invented river and exchange values',()=>{
 const hostile=structuredClone(extras.in);hostile.languageText='<script>x</script>';hostile.writingSamples[0].text='<img onerror=x>';
 const html=languageCard(hostile);assert.doesNotMatch(html,/<script>|<img onerror/);assert.match(html,/&lt;script&gt;/);
 assert.match(countryHighlights('va',extras.va),/No length-ranked river/);
 assert.match(currencyReference('XXX',fx),/unavailable/);
 assert.equal(formatValue(8848.86,'m',true),'8,848.86 m');
 assert.match(currencyReference('USD',fx),/₹1 ≈/);
});

test('continent filtering rejects hidden countries in real map hit-testing',()=>{
 const sandbox={};vm.createContext(sandbox);
 for(const name of ['d3.min.js','topojson-client.min.js'])vm.runInContext(readFileSync(new URL('../vendor/'+name,import.meta.url),'utf8'),sandbox);
 const oldD3=globalThis.d3;globalThis.d3=sandbox.d3;
 try{
  const features=sandbox.topojson.feature(json('world-50m.json'),json('world-50m.json').objects.countries).features;
  const byId=new Map(Object.entries(details).map(([code,c])=>[c.numeric,code]));features.forEach(f=>f.code=byId.get(String(f.id).padStart(3,'0')));
  const globe=Object.create(Globe.prototype);Object.assign(globe,{atlas:{features},small:[],projection:sandbox.d3.geoOrthographic().rotate([-78,-22]).scale(200).translate([300,300]),rotation:[-78,-22,0],requestDraw(){},selected:'in'});
  assert.equal(globe.pick(300,300),'in');globe.filter(['br']);assert.equal(globe.selected,null);assert.equal(globe.pick(300,300),null);
  globe.filter(['in']);assert.equal(globe.pick(300,300),'in');globe.filter(null);assert.equal(globe.allowedCodes,null);
 }finally{globalThis.d3=oldD3;}
});

test('new data loader retries a failed response and shares in-flight requests',async()=>{
 const oldFetch=globalThis.fetch;let count=0;
 globalThis.fetch=async()=>({ok:++count>1,json:async()=>({loaded:true})});
 try{await assert.rejects(loadJSON('/test-explore'));const [a,b]=await Promise.all([loadJSON('/test-explore'),loadJSON('/test-explore')]);assert.equal(a,b);assert.equal(count,2);}finally{globalThis.fetch=oldFetch;}
});
