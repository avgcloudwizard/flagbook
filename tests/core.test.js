import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTRIES} from '../countries.js';
import {BY_CODE,isCorrect,shuffled,summarize,validateEvents,parseBackup} from '../core.js';
const e=(id,question,code,answer,type='guess')=>({id,question,code,answer,type,at:'2026-09-28T12:00:00.000Z'});
test('exact spelling, normalized whitespace/case, explicit aliases only',()=>{
 assert.equal(isCorrect(BY_CODE.get('li'),'Lichtenstein'),false);
 assert.equal(isCorrect(BY_CODE.get('li'),' LIECHTENSTEIN '),true);
 assert.equal(isCorrect(BY_CODE.get('us'),'United   States'),true);
 assert.equal(isCorrect(BY_CODE.get('us'),'USA'),false);
 assert.equal(isCorrect(BY_CODE.get('tr'),'Turkey'),true);
 assert.equal(isCorrect(BY_CODE.get('ci'),"Cote d'Ivoire"),true);
 assert.equal(isCorrect(BY_CODE.get('cg'),'Congo'),false);
 assert.equal(isCorrect(BY_CODE.get('cd'),'Congo'),false);
 for(const c of COUNTRIES){assert.ok(isCorrect(c,c.name));assert.equal(isCorrect(c,''),false);}
});
test('195 unique countries with locally bundled SVG assets',()=>{
 assert.equal(COUNTRIES.length,195);assert.equal(BY_CODE.size,195);
 for(const c of COUNTRIES){const svg=readFileSync(new URL(`../assets/flags/${c.code}.svg`,import.meta.url),'utf8');assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script\b/i);}
});
test('shuffle visits each flag once, avoiding immediate repeat between decks',()=>{
 const codes=COUNTRIES.map(c=>c.code);const deck=shuffled(codes,codes[0],()=>.999);
 assert.equal(new Set(deck).size,195);assert.notEqual(deck[0],codes[0]);
 assert.deepEqual(shuffled(['in'],'in'),['in']);assert.deepEqual(shuffled([]),[]);
});
test('retrying counts one missed round; reveals count as missed; accurate streaks',()=>{
 const events=[e('1','a','li','Lichtenstein'),e('2','a','li','Wrong'),e('3','a','li','Liechtenstein'),e('4','b','in','India'),e('5','c','gb','United Kingdom'),e('6','d','jp','','reveal')];
 validateEvents(events);const s=summarize(events);
 assert.equal(s.seen,4);assert.equal(s.correct,3);assert.equal(s.wrong,2);assert.equal(s.reveals,1);assert.equal(s.accuracy,50);assert.equal(s.best,2);assert.equal(s.streak,0);assert.equal(s.named,3);assert.equal(s.perCountry.get('li').missed,1);assert.equal(s.missed.length,2);
});
test('backup validation rejects malformed histories without accepting forged stats',()=>{
 const good={version:1,events:[e('1','q','in','India')]};assert.equal(parseBackup(JSON.stringify(good)).length,1);
 for(const bad of [{version:2,events:[]},{version:1,events:[e('1','q','xx','India')]},{version:1,events:[e('1','q','in','')]},{version:1,events:[e('1','q','in','India'),e('2','q','in','India')]},{version:1,events:[e('1','q','in','wrong'),e('2','q','jp','Japan')]}])assert.throws(()=>parseBackup(JSON.stringify(bad)));
});
