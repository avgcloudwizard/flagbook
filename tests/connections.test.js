import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {COUNTRIES} from '../countries.js';
import {filterFacts,chooseFact,dailyFact} from '../facts-core.js';
import {connectionMap} from '../facts-map.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../data/'+n,import.meta.url)));
const data=read('unexpected-connections.json'),facts=data.facts,names=new Map(COUNTRIES.map(c=>[c.code,c.name]));
test('editorial collection contains 30 new claims plus two reviewed existing stories',()=>{
 assert.equal(facts.length,32);assert.equal(facts.filter(f=>f.category==='Borders & belonging').length,6);assert.equal(facts.filter(f=>f.category==='Earth & nature').length,8);
 assert.equal(new Set(facts.map(f=>f.id)).size,32);assert.equal(new Set(facts.map(f=>f.slug)).size,32);
 assert.equal(new Set(facts.map(f=>f.shortFact.toLowerCase().replace(/\W/g,''))).size,32);
 for(const f of facts){assert.equal(f.kind,'story');assert.ok(f.title&&f.hook&&f.shortFact&&f.accuracyNote);assert.ok(f.explanation.split(/\s+/).length>=80&&f.explanation.split(/\s+/).length<=150,f.id);assert.equal(f.verified,'2026-10-23');assert.ok(f.sources.length);for(const s of f.sources){assert.equal(new URL(s.url).protocol,'https:');assert.ok(s.title&&s.publisher);assert.ok(Object.hasOwn(s,'published'));}for(const c of f.countries)assert.ok(names.has(c));assert.equal(f.related.length,2);for(const id of f.related)assert.ok(id!==f.id&&facts.some(r=>r.id===id));for(const p of f.map.locations){assert.ok(p.label);assert.ok(p.coordinates[0]>=-180&&p.coordinates[0]<=180);assert.ok(p.coordinates[1]>=-90&&p.coordinates[1]<=90);}if(f.guess){assert.ok(f.guess.options.includes(f.guess.answer));assert.equal(new Set(f.guess.options).size,f.guess.options.length);}}
});
test('search finds a community, language and location, and combines filters without mutating data',()=>{
 const before=JSON.stringify(facts);
 assert.ok(filterFacts(facts,{query:'Nikkei'},names).some(f=>f.countries.includes('pe')));
 assert.ok(filterFacts(facts,{query:'sarnami',country:'sr'},names).length);
 assert.equal(filterFacts(facts,{query:'leeks'},names).length,0);
 const f=facts[0];assert.deepEqual(filterFacts(facts,{savedOnly:true,saved:new Set([f.id])},names),[f]);
 assert.ok(filterFacts(facts,{region:f.regions[0]},names).every(r=>r.regions.includes(f.regions[0])));
 assert.equal(JSON.stringify(facts),before);
});
test('surprise avoids repeats, and daily selection varies across days',()=>{
 for(const f of facts)assert.notEqual(chooseFact(facts,new Set(facts.map(r=>r.id)),f).id,f.id);
 assert.equal(chooseFact([],new Set(),null),null);assert.equal(dailyFact(facts,'2026-10-23'),dailyFact(facts,'2026-10-23'));
 assert.ok(new Set(['2026-10-23','2026-10-24','2026-10-25'].map(d=>dailyFact(facts,d).id)).size>1);
});
test('every map renders finite geometry, including date-line and small-area views',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../vendor/d3.min.js',import.meta.url),'utf8'),ctx);globalThis.d3=ctx.d3;
 const topo=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../vendor/topojson-client.min.js',import.meta.url),'utf8'),topo);
 globalThis.topojson=topo.topojson;const world=read('world-50m.json'),details=read('country-details.json');const atlas={topology:world,features:topo.topojson.feature(world,world.objects.countries).features};for(const f of atlas.features)f.code=Object.keys(details).find(c=>details[c].numeric===String(f.id).padStart(3,'0'));
 for(const f of facts)for(const world of [false,true]){const svg=connectionMap(f,atlas,{world});assert.doesNotMatch(svg,/NaN|Infinity|undefined/,f.id);assert.match(svg,/<svg/);assert.equal((svg.match(/class="location-pin"/g)||[]).length,f.map.locations.length);}
 delete globalThis.d3;delete globalThis.topojson;
});
