import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=name=>JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url)));
const items=read('world-records.json').items.filter(i=>i.category==='Metals & Minerals');
const item=id=>items.find(i=>i.id===id);
const value=(id,code)=>item(id).entries.find(e=>e.code===code)?.value;

test('mineral units preserve the distinct production and reserve table scales',()=>{
 assert.equal(value('iron-ore-mine','au'),980_000_000);
 assert.equal(value('iron-ore-reserves','au'),59_000_000_000);
 assert.equal(value('molybdenum-mine','cn'),97_000);
 assert.equal(value('molybdenum-reserves','cn'),7_800_000);
 assert.equal(value('platinum-mine','za'),120);
 assert.equal(value('pgm-reserves','za'),63_000);
 assert.equal(value('diamond-industrial-mine','ru'),16_000_000);
 assert.equal(item('diamond-industrial-mine').unit,'carats');
 assert.equal(value('copper-mine','cl'),5_300_000);
 assert.equal(value('copper-refined','cn'),14_000_000);
});

test('gold measures stay separate and revised reserve figures exclude footnote digits',()=>{
 assert.equal(value('gold-mine','cn'),380);
 assert.equal(value('gold-reserves','au'),13_000);
 assert.equal(value('gold-holdings','us'),8_130);
 assert.equal(value('rare-earths-reserves','br'),11_000_000);
 assert.equal(value('rare-earths-reserves','my'),710_000);
 for(const i of items.filter(i=>i.group==='Production')){
  assert.equal(i.year,'2025');assert.match(i.notice,/Estimated 2025/);
 }
 for(const i of items.filter(i=>i.group==='Reserves')){
  assert.equal(i.year,'2026 reference');assert.equal(i.worldTotal,undefined);
 }
});

test('withheld values and territories never become numeric country rankings',()=>{
 assert.equal(value('lithium-mine','us'),undefined);
 assert.deepEqual(item('lithium-mine').unavailable.find(e=>e.code==='us'),{code:'us',reported:'W'});
 assert.equal(value('nickel-mine','fr'),undefined);
 assert.equal(value('graphite-mine','kp'),8_000);
 const countries=new Set(Object.keys(read('country-details.json')));
 for(const i of items)for(const e of i.entries){
  assert.ok(countries.has(e.code));assert.ok(Number.isFinite(e.value)&&e.value>0);
  assert.ok(!i.unavailable?.some(u=>u.code===e.code));
 }
});

test('official holdings retain per-country dates and selected comparison scope',()=>{
 const h=item('gold-holdings');assert.equal(h.entries.length,11);
 assert.match(h.coverage,/selected countries/);assert.match(h.coverage,/not a same-date/);
 for(const e of h.entries){assert.ok(e.observed&&e.sourceLabel);assert.equal(new URL(e.source).protocol,'https:');}
 assert.equal(h.entries.find(e=>e.code==='in').observed,'2026-03-31');
 assert.equal(value('gold-holdings','in'),880.52);
});

test('mineral fact cards retain estimate language and avoid mixed-date holdings',()=>{
 const facts=read('fun-facts.json').facts;
 assert.ok(!facts.some(f=>f.topic==='gold-holdings'));
 for(const f of facts.filter(f=>f.category==='Metals & minerals')){
  assert.match(f.body,/Estimated/);assert.equal(f.source,item(f.topic).source);
  if(item(f.topic).group==='Production')assert.match(f.body,/Estimated 2025 output/);
 }
});

test('reviewed inputs reproduce the committed mineral catalogue without network access',()=>{
 const compiled=JSON.parse(execFileSync('python3',['-c',"import runpy,json; print(json.dumps(runpy.run_path('scripts/build-minerals.py')['compile_minerals']()))"],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 const sort=x=>x.toSorted((a,b)=>a.id.localeCompare(b.id));
 assert.deepEqual(sort(compiled),sort(items));
});
