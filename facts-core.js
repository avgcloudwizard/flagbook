import {normalize} from './explore-data.js?v=8';
export const FACTS_KEY='flagbook.facts.v1';
export function chooseFact(pool,seen,current,random=Math.random){
 if(!pool.length)return null;
 let candidates=pool.filter(f=>!seen.has(f.id)&&f.id!==current?.id);
 if(!candidates.length)candidates=pool.filter(f=>f.id!==current?.id);
 if(!candidates.length)return pool[0];
 const different=candidates.filter(f=>f.category!==current?.category);if(different.length)candidates=different;
 const stories=candidates.filter(f=>f.kind==='story'),data=candidates.filter(f=>f.kind==='data');
 if(stories.length&&data.length)candidates=random()<.7?stories:data;
 return candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
}
export function dailyFact(facts,date){
 const stories=facts.filter(f=>f.kind==='story');let hash=2166136261;
 for(const ch of date)hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
 return stories.length?stories[hash%stories.length]:facts[0];
}
export function readFactState(raw,validIds){
 try{const x=JSON.parse(raw);return {seen:new Set((Array.isArray(x?.seen)?x.seen:[]).filter(id=>validIds.has(id))),saved:new Set((Array.isArray(x?.saved)?x.saved:[]).filter(id=>validIds.has(id)))};}catch{return {seen:new Set(),saved:new Set()};}
}

export function filterFacts(facts,{category='',country='',region='',query='',savedOnly=false,saved=new Set()}={},names=new Map()){
 const words=normalize(query).split(/\s+/).filter(Boolean);
 return facts.filter(f=>(!category||f.category===category)&&(!country||f.countries.includes(country))&&(!region||f.regions.includes(region))&&(!savedOnly||saved.has(f.id))&&words.every(word=>normalize([f.title,f.hook,f.shortFact,f.explanation,...f.tags,...f.places,...f.regions,...f.countries.map(c=>names.get(c)||c)].join(' ')).includes(word)));
}
