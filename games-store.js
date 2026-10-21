import {validateGameEvents,mergeGameEvents,gameSummary} from './games-core.js';
export const GAMES_KEY='flagbook.games.v1';
let events=[],loaded=false,healthy=true;
function warn(){
  for(const node of document.querySelectorAll('.games-save-note'))node.textContent='Saving is unavailable. Download a progress backup before closing this tab.';
}
function load(){
  if(loaded)return;loaded=true;
  try{const raw=localStorage.getItem(GAMES_KEY);if(raw){const data=JSON.parse(raw);if(data.version!==1)throw new Error();events=validateGameEvents(data.events);}}
  catch{healthy=false;warn();}
}
export function getGameEvents(){load();return events.slice();}
export function prepareGameImport(incoming){load();return mergeGameEvents(events,incoming);}
export function applyGameImport(incoming){events=incoming;save();}
function save(){
  if(!healthy){warn();return;}
  try{
    const raw=localStorage.getItem(GAMES_KEY);
    if(raw){const data=JSON.parse(raw);if(data.version!==1)throw new Error();events=mergeGameEvents(events,data.events);}
    localStorage.setItem(GAMES_KEY,JSON.stringify({version:1,events}));
  }catch{healthy=false;warn();}
}
export function recordGame(event){
  load();
  const entry={id:crypto.randomUUID(),at:new Date().toISOString(),...event};
  events.push(entry);save();return entry;
}
export function renderGameStats(game,target){
  load();const s=gameSummary(events,game);
  target.innerHTML=`<span><strong>${s.completed}</strong> rounds finished</span><span><strong>${s.clean}</strong> without misses or hints</span>`;
  if(!healthy)warn();
}
export function readGameSession(key){try{return JSON.parse(sessionStorage.getItem('flagbook.session.'+key));}catch{return null;}}
export function saveGameSession(key,state){try{sessionStorage.setItem('flagbook.session.'+key,JSON.stringify(state));}catch{/* Scores are persisted separately; an unavailable session store does not block play. */}}
