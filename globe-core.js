import {BY_CODE,normalize,isCorrect} from './core.js';
export const GLOBE_KEY='flagbook.globe.v1';
export function checkCapital(country,answer){return country.capitalAnswers.some(name=>normalize(name)===normalize(answer));}
export function checkGlobeAnswer(country,code,stage,answer){return stage==='country'?isCorrect(BY_CODE.get(code),answer):checkCapital(country,answer);}
export function validateGlobeEvents(events){
 if(!Array.isArray(events)||events.length>200000)throw new Error('Invalid globe attempt history.');
 const ids=new Set();
 for(const e of events){
  if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||!BY_CODE.has(e.code)||!['country','capital'].includes(e.stage)||!['guess','reveal'].includes(e.type)||typeof e.answer!=='string'||e.answer.length>160||typeof e.correct!=='boolean'||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||(e.type==='guess'&&!e.answer.trim())||(e.type==='reveal'&&e.correct))throw new Error('Invalid globe attempt history.');
  ids.add(e.id);
 }
 return events;
}
export function mergeGlobeEvents(current,imported){
 validateGlobeEvents(imported);const merged=new Map(current.map(e=>[e.id,e]));
 for(const e of imported){if(merged.has(e.id)&&JSON.stringify(merged.get(e.id))!==JSON.stringify(e))throw new Error('Conflicting globe attempts.');merged.set(e.id,e);}
 return validateGlobeEvents([...merged.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)));
}
export function globeSummary(events){const guesses=events.filter(e=>e.type==='guess');return {countries:new Set(events.filter(e=>e.stage==='country'&&e.correct).map(e=>e.code)).size,capitals:new Set(events.filter(e=>e.stage==='capital'&&e.correct).map(e=>e.code)).size,attempts:events.length,accuracy:events.length?Math.round(guesses.filter(e=>e.correct).length/events.length*100):null};}
