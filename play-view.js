// An in-page play space: no fullscreen permission, no second game state.
const titles={practice:'Flag practice',globe:'Globe quiz',earth:'Where on Earth?',borders:'Border hop',games:'Records games'};
const host=document.getElementById('play-strip'),exit=document.getElementById('play-exit'),sound=document.getElementById('play-sound'),signal=document.getElementById('play-signal');
let active='',opener=null,context=null,audioOn=false,timer=null;
const ledger=document.getElementById('play-ledger'),review=document.getElementById('play-review');let entries=[];
function readSet(){try{const arr=JSON.parse(sessionStorage.getItem('flagbook.play.set.'+active));return Array.isArray(arr)?arr.filter(v=>v&&typeof v.round==='string'&&typeof v.label==='string'&&typeof v.result==='string').slice(0,3):[];}catch{return [];}}
function updateLedger(){ledger.hidden=active==='earth';ledger.textContent=entries.length===3?'Review set · 3/3':'Set '+entries.length+' / 3';ledger.setAttribute('aria-label','Review focus set: '+entries.length+' of three rounds');ledger.dataset.complete=String(entries.length===3);}
function keepSet(){try{sessionStorage.setItem('flagbook.play.set.'+active,JSON.stringify(entries));}catch{}updateLedger();}
ledger.onclick=()=>{document.getElementById('play-review-title').textContent=entries.length===3?'Set complete.':'Your focus set';document.getElementById('play-review-note').textContent=entries.length===3?'Three rounds played. Here’s how they ended.':'Finish three rounds in focus view to fill this page.';const list=document.getElementById('play-slips');list.replaceChildren();for(let i=0;i<3;i++){const li=document.createElement('li'),tag=document.createElement('span'),label=document.createElement('strong'),result=document.createElement('small');tag.textContent='0'+(i+1);label.textContent=entries[i]?.label||'Still to play';result.textContent=entries[i]?.result||'—';li.append(tag,label,result);list.append(li);}document.getElementById('play-new-set').hidden=entries.length<3;review.showModal();};
document.getElementById('play-return').onclick=()=>review.close();
document.getElementById('play-new-set').onclick=()=>{entries=[];keepSet();review.close();};
const page=()=>location.hash.slice(1).split('?')[0]||'practice';
try{audioOn=localStorage.getItem('flagbook.play.sound')==='on';}catch{}
function soundLabel(){sound.textContent=audioOn?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(audioOn));}
function unlock(){try{context??=new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{}}
function tone(ok){if(!audioOn||!active||!context||context.state!=='running')return;
  const at=context.currentTime;
  for(const [i,f] of (ok?[392,523.25]:[246.94]).entries()){const o=context.createOscillator(),g=context.createGain(),t=at+i*.085;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.043,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.18);o.onended=()=>{o.disconnect();g.disconnect();};}
}
function leave(restore=true){if(!active)return;if(review.open)review.close();active='';document.body.classList.remove('in-play');delete document.body.dataset.play;host.hidden=true;clearTimeout(timer);if(restore&&opener?.isConnected){opener.focus({preventScroll:true});opener.scrollIntoView({block:'nearest'});}}
for(const [key,title] of Object.entries(titles)){const heading=document.querySelector('#'+key+'-view .page-heading');if(!heading)continue;
 const button=document.createElement('button');button.className='play-enter';button.innerHTML='<span aria-hidden="true">⛶</span> Focus view';button.setAttribute('aria-label','Enter focus view for '+title);
 heading.append(button);button.onclick=()=>{active=key;entries=readSet();updateLedger();opener=button;document.body.dataset.play=key;document.body.classList.add('in-play');document.getElementById('play-name').textContent=title;signal.textContent='';signal.removeAttribute('data-result');host.hidden=false;soundLabel();if(audioOn)unlock();window.scrollTo(0,0);exit.focus({preventScroll:true});};
}
exit.onclick=()=>leave();sound.onclick=()=>{audioOn=!audioOn;if(audioOn){unlock();tone(true);}try{localStorage.setItem('flagbook.play.sound',audioOn?'on':'off');}catch{}soundLabel();};
window.addEventListener('hashchange',()=>{if(active&&page()!==active)leave(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!review.open){e.preventDefault();leave();}});
window.addEventListener('flagbook:feedback',e=>{if(!active)return;const {type,correct,finished,round,game}=e.detail;
 const route=({higher:'games',five:'games',mystery:'games',map:'earth'})[game]||game;if(route!==active)return;
 if(active!=='earth'&&finished&&entries.length<3&&!entries.some(v=>v.round===round)){
   const label=e.detail.label||(active==='games'?(document.querySelector('#games-board .game-board-title h2')?.textContent||titles.games):Array.from(document.querySelectorAll('#border-endpoints button')).map(b=>b.querySelector('strong')?.textContent).filter(Boolean).join(' → '))||titles[active];
   entries.push({round,label,result:type==='reveal'?'Revealed':correct?'Solved':'Missed'});keepSet();
 }
 clearTimeout(timer);signal.dataset.result=type==='guess'?(correct?'correct':'miss'):'note';signal.textContent=type==='guess'?(correct?'✓ Correct':'Try again'):type==='reveal'?'Answer revealed':'Clue opened';if(type==='guess')tone(correct);timer=setTimeout(()=>{signal.textContent='';signal.removeAttribute('data-result');},1800);
});
