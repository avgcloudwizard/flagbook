import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {COUNTRIES} from '../countries.js';
import * as core from '../core.js';

// Run the real application handlers against isolated browser/storage adapters.
const source = readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
const attempt = {id:'attempt-1',question:'question-1',code:'in',type:'guess',answer:'India',at:'2026-09-28T12:00:00.000Z'};
function storage() {
  const entries = new Map([[core.STORAGE_KEY,JSON.stringify({version:1,events:[attempt]})],['flagbook.globe.v1','globe progress sentinel']]);
  return {entries,fail:false,getItem(key){return entries.get(key)??null;},setItem(key,value){if(this.fail)throw new Error('Storage blocked');entries.set(key,value);}};
}
function browser(localStorage) {
  const nodes = new Map(), listeners = new Map();
  function node(id) {
    if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,value:'',textContent:'',innerHTML:'',style:{},handlers:{},classList:{toggle(){}},setAttribute(){},removeAttribute(){},addEventListener(name,fn){this.handlers[name]=fn;},focus(){},select(){},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;}});
    return nodes.get(id);
  }
  const context=vm.createContext({...core,COUNTRIES,localStorage,crypto:{randomUUID},location:{hash:'#practice'},clearTimeout(){},setTimeout(){},showDiscovery(){},clearDiscovery(){},startGlobe(){},startLearning(){},getGlobeEvents(){return [];},prepareGlobeImport(){return [];},applyGlobeImport(){},document:{getElementById:node,querySelector:node},window:{addEventListener(name,fn){listeners.set(name,fn);}}});
  vm.runInContext(source,context);
  return {node,listeners,click(id){node(id).handlers.click();}};
}
const saved = store => JSON.parse(store.getItem(core.STORAGE_KEY));

test('cancel preserves progress; confirmed reset clears only flags and starts a valid fresh deck',()=>{
  const store=storage(), page=browser(store), before=store.getItem(core.STORAGE_KEY);
  page.click('reset-progress'); assert.equal(page.node('reset-dialog').open,true);
  page.click('reset-cancel'); assert.equal(store.getItem(core.STORAGE_KEY),before);
  page.click('reset-progress'); page.click('reset-confirm');
  const fresh=saved(store);
  assert.deepEqual(fresh.events,[]);assert.ok(fresh.resetId);
  assert.equal(fresh.session.mode,'all');assert.equal(fresh.session.round.status,'answering');
  assert.equal(new Set([fresh.session.round.code,...fresh.session.deck]).size,195);
  assert.equal(page.node('accuracy').textContent,'—');assert.equal(page.node('streak').textContent,0);
  assert.equal(page.node('history-count').textContent,'0 RECORDS');assert.equal(page.node('missed-mode').disabled,true);
  assert.equal(page.node('reset-dialog').open,false);
  assert.equal(store.getItem('flagbook.globe.v1'),'globe progress sentinel');
  const reloaded=browser(store);assert.equal(reloaded.node('history-count').textContent,'0 RECORDS');
});

test('failed reset keeps saved records, current statistics and confirmation dialog',()=>{
  const store=storage(),page=browser(store),before=store.getItem(core.STORAGE_KEY);
  page.click('reset-progress');store.fail=true;page.click('reset-confirm');
  assert.equal(store.getItem(core.STORAGE_KEY),before);
  assert.equal(page.node('history-count').textContent,'1 RECORDS');
  assert.equal(page.node('reset-dialog').open,true);
  assert.match(page.node('reset-error').textContent,/unchanged/);
});

test('other open tabs adopt resets without merging old attempts back',()=>{
  const store=storage(),first=browser(store),second=browser(store),third=browser(store);
  first.click('reset-confirm');const resetId=saved(store).resetId;
  second.listeners.get('storage')({key:core.STORAGE_KEY});
  assert.equal(second.node('history-count').textContent,'0 RECORDS');
  assert.deepEqual(saved(store).events,[]);assert.equal(saved(store).resetId,resetId);
  // A stale tab that acts before receiving the storage event also checks the reset marker.
  third.click('next-flag');
  assert.equal(third.node('history-count').textContent,'0 RECORDS');
  assert.deepEqual(saved(store).events,[]);assert.equal(saved(store).resetId,resetId);
  assert.equal(store.getItem('flagbook.globe.v1'),'globe progress sentinel');
});
