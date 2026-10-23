import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import * as core from '../core.js';
import * as games from '../games-core.js';
import * as format from '../game-format.js';
import * as explore from '../explore-data.js';
const records=JSON.parse(readFileSync(new URL('../data/world-records.json',import.meta.url)));
const details=JSON.parse(readFileSync(new URL('../data/country-details.json',import.meta.url)));
const source=readFileSync(new URL('../record-games.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export async function','async function');
function browser(session=null){
 const nodes=new Map(),attempts=[];let saved=session;
 function node(id){
  if(!nodes.has(id))nodes.set(id,{value:id==='games-mode'?'higher':'',hidden:false,disabled:false,innerHTML:'',textContent:'',focus(){},select(){},querySelectorAll(){return [];}});
  return nodes.get(id);
 }
 const context=vm.createContext({...core,...games,...explore,...format,URLSearchParams,crypto:{randomUUID},document:{getElementById:node,querySelectorAll(){return [];}},loadRecords:async()=>records,loadExtras:async()=>JSON.parse(readFileSync(new URL('../data/country-extras.json',import.meta.url))),loadJSON:async()=>JSON.parse(readFileSync(new URL('../data/game-content.json',import.meta.url))),loadAtlas:async()=>({details}),recordGame:e=>attempts.push(e),renderGameStats(){},getGameEvents:()=>[],readGameSession:()=>saved,saveGameSession:(key,s)=>{saved=JSON.parse(JSON.stringify(s));}});
 vm.runInContext(source,context);
 return {node,attempts,start:()=>vm.runInContext('startRecordGames()',context),saved:()=>saved};
}
test('records games start a playable first question and preserve the active round on reload',async()=>{
 const page=browser();await page.start();
 assert.match(page.node('games-board').innerHTML,/THE BENCHMARK/);
 assert.doesNotMatch(page.node('games-board').innerHTML,/No round/);
 const saved=page.saved();assert.ok(saved.topic);assert.equal(saved.pair.length,2);
 const reload=browser(saved);await reload.start();
 assert.equal(reload.saved().id,saved.id);
 assert.match(reload.node('games-board').innerHTML,/THE BENCHMARK/);
});
test('top-three real handlers keep spelling errors, ignore duplicates and finish only after all three',async()=>{
 const page=browser();await page.start();
 page.node('games-mode').value='five';page.node('games-mode').onchange();
 page.node('games-topic').value='coffee';page.node('games-topic').onchange();
 const submit=answer=>{page.node('game-answer').value=answer;page.node('game-answer-form').onsubmit({preventDefault(){}});};
 submit('Brazi');assert.equal(page.node('game-answer').value,'Brazi');assert.equal(page.attempts.at(-1).correct,false);
 submit('Brazil');const count=page.attempts.length;submit('Brazil');assert.equal(page.attempts.length,count);
 submit('Vietnam');
 assert.equal(page.node('games-next').hidden,true);
 submit('Colombia');assert.equal(page.node('games-next').hidden,false);
 assert.equal(page.attempts.at(-1).finished,true);
 assert.match(page.node('games-source').innerHTML,/FAOSTAT/);
 const reload=browser(page.saved());await reload.start();assert.match(reload.node('games-board').innerHTML,/3 \/ 3 found/);
});
test('mystery excludes categories lacking enough clues and records assisted completion',async()=>{
 const page=browser();await page.start();
 page.node('games-mode').value='mystery';page.node('games-mode').onchange();
 assert.doesNotMatch(page.node('games-category').innerHTML,/<option>Services<\/option>/);
 page.node('games-hint').onclick();assert.equal(page.attempts.at(-1).type,'hint');
 page.node('game-answer').value=core.BY_CODE.get(page.saved().code).name;
 page.node('game-answer-form').onsubmit({preventDefault(){}});
 assert.equal(page.attempts.at(-1).finished,true);
 assert.equal(page.node('games-hint').hidden,true);assert.equal(page.node('games-next').hidden,false);
 assert.match(page.node('games-source').innerHTML,/Geography, culture &amp; language sources|Geography, culture & language sources/);
});

test('mystery has one top-three ranking, varied hints and language in the fourth slot',async()=>{
 const page=browser();await page.start();page.node('games-mode').value='mystery';page.node('games-mode').onchange();
 assert.equal(page.saved().clues.length,1);assert.ok(page.saved().clues[0].rank<=3);
 for(let i=0;i<3;i++)page.node('games-hint').onclick();
 assert.equal(page.saved().shown,4);assert.match(page.node('games-board').innerHTML,/Languages you’ll hear here/);
 assert.equal((page.node('games-board').innerHTML.match(/I rank #/g)||[]).length,1);
 const reload=browser(page.saved());await reload.start();assert.equal(reload.saved().shown,4);
 const old=browser({...page.saved(),rulesVersion:undefined});await old.start();assert.equal(old.saved().rulesVersion,2);assert.notEqual(old.saved().id,page.saved().id);
});
test('language topics are available only in Higher or Lower, and source coverage is visible before guessing',async()=>{
 const page=browser();await page.start();page.node('games-topic').value='spanish-native-speakers';page.node('games-topic').onchange();
 assert.match(page.node('games-board').innerHTML,/Selected 16/);assert.match(page.node('games-board').innerHTML,/million people/);
 page.node('games-mode').value='five';page.node('games-mode').onchange();assert.doesNotMatch(page.node('games-topic').innerHTML,/spanish-native-speakers/);
});
