import {BY_CODE,isCorrect,shuffled} from './core.js';

// Comparisons must use a single observation period and actual country values.
export function gameTopics(items) {
  return items.filter(item => !/mixed/i.test(item.year) && item.entries.length >= 2 &&
    item.entries.every(e => BY_CODE.has(e.code) && Number.isFinite(e.value) && e.value >= 0 && !e.observed) &&
    new Set(item.entries.map(e => e.code)).size === item.entries.length &&
    new Set(item.entries.map(e => e.value)).size > 1);
}
export function topFiveEntries(item) {
  const sorted=[...item.entries].sort((a,b)=>b.value-a.value);
  if(sorted.length<5 || sorted[4].value<=0)return [];
  // Do not arbitrarily exclude a country tied at fifth place.
  return sorted.filter(e=>e.value>=sorted[4].value);
}
export function comparison(item, random=Math.random) {
  const entries=item.entries.filter(e=>e.value>0);
  const first=entries[Math.floor(random()*entries.length)];
  if(!first)return null;
  const choices=entries.filter(e=>e.code!==first.code && e.value!==first.value);
  if(!choices.length)return null;
  return [first,choices[Math.floor(random()*choices.length)]];
}
export function checkDirection(pair, answer) {
  return answer===(pair[1].value>pair[0].value?'higher':'lower');
}
export function matchCountry(answer) {
  return [...BY_CODE.values()].find(c=>isCorrect(c,answer))?.code||null;
}
export function checkTopFive(item,found,answer) {
  const code=matchCountry(answer);
  if(found.includes(code))return {status:'duplicate',code};
  return {status:topFiveEntries(item).some(e=>e.code===code)?'correct':'incorrect',code};
}
export function mysteryCandidates(items) {
  const byCountry=new Map();
  for(const item of items)for(const e of item.entries.filter(e=>e.rank<=5&&e.value>0&&item.entries.filter(other=>other.value===e.value).length===1)){
    if(!byCountry.has(e.code))byCountry.set(e.code,[]);
    byCountry.get(e.code).push({topic:item.id,rank:e.rank,value:e.value});
  }
  return [...byCountry].filter(([,clues])=>clues.length>=2).map(([code,clues])=>({code,clues}));
}
export function pickMystery(items,previous,random=Math.random) {
  const candidate=shuffled(mysteryCandidates(items),undefined,random).find(c=>c.code!==previous)||mysteryCandidates(items)[0];
  if(!candidate)return null;
  // Spread the clues across subject areas when possible.
  const topics=new Map(items.map(i=>[i.id,i]));
  const ordered=shuffled(candidate.clues,undefined,random), chosen=[],categories=new Set();
  for(const clue of ordered)if(!categories.has(topics.get(clue.topic).category)){
    chosen.push(clue);categories.add(topics.get(clue.topic).category);
  }
  for(const clue of ordered)if(!chosen.includes(clue))chosen.push(clue);
  return {code:candidate.code,clues:chosen.slice(0,3)};
}
export const GAME_MODES=['map','higher','five','mystery'];
export function validateGameEvents(events) {
  if(!Array.isArray(events)||events.length>200000)throw new Error('Invalid game history.');
  const ids=new Set();
  for(const e of events){
    if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||!GAME_MODES.includes(e.game)||
      typeof e.round!=='string'||!e.round||e.round.length>100||!['guess','hint','reveal'].includes(e.type)||
      typeof e.correct!=='boolean'||typeof e.finished!=='boolean'||typeof e.answer!=='string'||e.answer.length>160||
      (e.type!=='guess'&&e.correct)||(e.type==='reveal'&&!e.finished)||
      typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||
      (e.code!==undefined&&!BY_CODE.has(e.code))||(e.topic!==undefined&&(typeof e.topic!=='string'||e.topic.length>120)))throw new Error('Invalid game history.');
    ids.add(e.id);
  }
  const rounds=new Map();
  for(const e of [...events].sort((a,b)=>a.at.localeCompare(b.at))){
    const prior=rounds.get(e.round);
    if(prior&&(prior.game!==e.game||prior.finished))throw new Error('Invalid game round.');
    rounds.set(e.round,e);
  }
  return events;
}
export function mergeGameEvents(current,incoming) {
  validateGameEvents(incoming);
  const combined=new Map(current.map(e=>[e.id,e]));
  for(const e of incoming){
    if(combined.has(e.id)&&JSON.stringify(combined.get(e.id))!==JSON.stringify(e))throw new Error('Conflicting game attempts.');
    combined.set(e.id,e);
  }
  return validateGameEvents([...combined.values()].sort((a,b)=>a.at.localeCompare(b.at)));
}
export function gameSummary(events,game) {
  const rounds=new Map();
  for(const e of events.filter(e=>e.game===game)){
    const r=rounds.get(e.round)||{clean:true,finished:false};
    r.clean=r.clean&&e.type==='guess'&&e.correct;r.finished=r.finished||e.finished;rounds.set(e.round,r);
  }
  const finished=[...rounds.values()].filter(r=>r.finished);
  return {completed:finished.length,clean:finished.filter(r=>r.clean).length};
}
