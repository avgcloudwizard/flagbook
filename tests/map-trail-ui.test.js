import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {BY_CODE} from '../core.js';
import {CONTINENTS,continentForRegion,esc} from '../explore-data.js';
import * as trail from '../map-trail.js';
const source=fs.readFileSync(new URL('../map-challenge.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export async function','async function');
const details=JSON.parse(fs.readFileSync(new URL('../data/country-details.json',import.meta.url)));
async function setup(saved=null,events=[]){
 let select;const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,disabled:false,classList:{add(){}},querySelectorAll(){return [];},addEventListener(){},focus(){},scrollIntoView(){}});return nodes.get(id);};
 class Globe{constructor(_,a,opts){select=opts.onSelect;this.rotation=[0,0,0];}select(){}filter(){}reset(){}resize(){}setZoom(){}destroy(){}requestDraw(){}}
 const ctx=vm.createContext({...trail,BY_CODE,CONTINENTS,continentForRegion,esc,Globe,document:{getElementById:node},crypto:{randomUUID},shuffled:x=>x,loadAtlas:async()=>({details}),loadCountryContext:async()=>({}),matchMedia:()=>({matches:true}),renderGameStats(){},getGameEvents:()=>events,recordGame:e=>events.push(e),readGameSession:()=>saved,saveGameSession:(k,s)=>{saved=JSON.parse(JSON.stringify(s));}});
 vm.runInContext(source,ctx);await vm.runInContext('startMapChallenge()',ctx);return {node,select,events,state:()=>saved,click:id=>node(id).onclick()};
}
test('selection is free until confirmed; map trail resumes, scores three distinct outcomes and starts afresh',async()=>{
 let p=await setup(),target=p.state().code,miss=target==='br'?'in':'br';
 p.select(target);p.select(miss);assert.equal(p.events.length,0);p.click('earth-confirm');p.click('earth-confirm');assert.equal(p.events.length,1);assert.equal(p.state().misses,1);
 p=await setup(p.state(),p.events);assert.equal(p.state().code,target);p.select(target);p.click('earth-confirm');assert.equal(p.state().stops[0].outcome,'found');
 p.click('earth-next');p.select(p.state().code);p.click('earth-confirm');p.click('earth-next');p.click('earth-reveal');assert.deepEqual(p.state().stops.map(s=>s.outcome),['found','clean','revealed']);
 assert.equal(p.events.filter(e=>e.finished).length,3);assert.equal(p.node('trail-recap').hidden,false);assert.equal(p.node('trail-score').textContent,'1 of 3 on your first try without a hint.');
 p.click('earth-next');assert.equal(p.state().stops.length,0);assert.equal(p.node('trail-recap').hidden,true);
});
test('old saved map rounds retain the target and history; a continent change starts its own trail',async()=>{
 const id='old-map';const p=await setup({id,code:'in',continent:'',deck:['pe'],done:true,hinted:false,misses:0},[{round:id,type:'reveal',finished:true}]);assert.equal(p.state().code,'in');assert.equal(p.state().stops[0].outcome,'revealed');
 p.node('earth-continent').value='Africa';p.node('earth-continent').onchange();assert.equal(p.state().stops.length,0);assert.equal(continentForRegion(details[p.state().code].region),'Africa');assert.equal(p.events.length,1);
});
