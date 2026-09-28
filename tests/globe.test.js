import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {COUNTRIES} from '../countries.js';
import {checkCapital,checkGlobeAnswer,validateGlobeEvents,mergeGlobeEvents,globeSummary} from '../globe-core.js';
import {parseBackup} from '../core.js';
const details=JSON.parse(readFileSync(new URL('../data/country-details.json',import.meta.url)));
const world=JSON.parse(readFileSync(new URL('../data/world-50m.json',import.meta.url)));
test('every quiz country has a complete sourced discovery card',()=>{
 assert.equal(Object.keys(details).length,195);
 for(const country of COUNTRIES){const c=details[country.code];assert.ok(c);assert.ok(c.flagStory.length);assert.equal(c.facts.length,3);assert.ok(c.capitals.length);assert.ok(c.capitalAnswers.length);assert.ok(c.currencies.length);assert.ok(c.population.value>0);assert.ok(+c.population.year>=2024);assert.equal(c.coordinates.length,2);assert.match(c.source,/^https:\/\//);for(const text of [...c.flagStory,...c.facts.map(f=>f.text)])assert.doesNotMatch(text,/<\/?[a-z]/i);}
});
test('capital spelling is strict, with deliberate aliases and multiple seats',()=>{
 assert.equal(checkCapital(details.ne,'Niameyy'),false);assert.equal(checkCapital(details.ne,' NIAMEY '),true);
 for(const capital of ['Pretoria','Cape Town','Bloemfontein'])assert.equal(checkCapital(details.za,capital),true);
 assert.equal(checkCapital(details.bo,'La Paz'),true);assert.equal(checkCapital(details.bo,'Sucre'),true);
 assert.equal(checkCapital(details.lk,'Sri Jayewardenepura Kotte'),true);assert.equal(checkCapital(details.nr,'Yaren'),true);
 assert.equal(checkCapital(details.gq,'Malabo'),false);assert.equal(checkCapital(details.gq,'Ciudad de la Paz'),true);
 assert.equal(checkGlobeAnswer(details.ne,'ne','country','Nigeria'),false);
});
test('globe map covers countries through geometry or explicit small-state markers',()=>{
 const ids=new Set(world.objects.countries.geometries.map(f=>f.id));
 const missing=COUNTRIES.filter(c=>!ids.has(details[c.code].numeric));
 assert.ok(missing.length<15);for(const c of missing)assert.ok(details[c.code].area<1200 || c.code==='no');
});
test('orthographic projection and country hit-testing match real coordinates',()=>{
 const sandbox={};vm.createContext(sandbox);
 vm.runInContext(readFileSync(new URL('../vendor/d3.min.js',import.meta.url),'utf8'),sandbox);
 vm.runInContext(readFileSync(new URL('../vendor/topojson-client.min.js',import.meta.url),'utf8'),sandbox);
 const features=sandbox.topojson.feature(world,world.objects.countries).features;
 for(const [code,coords] of [['in',[78,22]],['br',[-50,-10]],['ne',[12,16]],['au',[135,-25]],['jp',[138,36]]]){
  const found=features.find(f=>sandbox.d3.geoContains(f,coords));assert.equal(found?.id,details[code].numeric,code);
 }
 const projection=sandbox.d3.geoOrthographic().rotate([-12,-16]).scale(200).translate([300,300]);const recovered=projection.invert([300,300]);assert.ok(Math.abs(recovered[0]-12)<1e-6&&Math.abs(recovered[1]-16)<1e-6);
});
const event=(id,stage,answer,correct,type='guess')=>({id,code:'ne',stage,answer,correct,type,at:'2026-09-28T10:00:00.000Z'});
test('globe attempts merge without duplication and stay separate from flags',()=>{
 const e=[event('a','country','Niger',true),event('b','capital','Niameyy',false),event('c','capital','Niamey',true)];
 validateGlobeEvents(e);assert.equal(mergeGlobeEvents(e,e).length,3);assert.deepEqual(globeSummary(e),{countries:1,capitals:1,attempts:3,accuracy:67});
 const backup=JSON.stringify({version:1,events:[],globeEvents:e});assert.deepEqual(parseBackup(backup),[]);
 assert.throws(()=>validateGlobeEvents([{...e[0],code:'xx'}]));assert.throws(()=>validateGlobeEvents([{...e[0],type:'reveal',correct:true}]));
 assert.throws(()=>mergeGlobeEvents(e,[{...e[0],answer:'Wrong'}]));
});
