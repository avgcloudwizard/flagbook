import {Globe,loadAtlas} from './globe.js?v=5';
import {CONTINENTS,continentForRegion,esc,normalize,loadExtras,countrySummary,formatValue} from './explore-data.js';
import {loadCountryContext} from './country-context.js?v=5';
const $=id=>document.getElementById(id);
const views={'Africa':[20,3,1.55],'Asia':[88,33,1.3],'Europe':[18,52,2.15],'North America':[-101,34,1.35],'South America':[-61,-18,1.65],'Oceania':[150,-21,1.5]};
let globe,atlas,extras,contexts,pending,continent='',selected=null;
function group(){return Object.entries(atlas.details).filter(([,c])=>!continent||continentForRegion(c.region)===continent).sort((a,b)=>a[1].name.localeCompare(b[1].name));}
function list(){
 const query=normalize($('atlas-search').value),countries=group().filter(([,c])=>normalize(c.name+' '+c.capitals.join(' ')).includes(query));
 $('atlas-count').textContent=`${countries.length} ${countries.length===1?'country':'countries'}${continent?' · '+continent:''}`;
 $('atlas-country-list').innerHTML=countries.map(([code,c])=>`<button data-atlas-country="${code}" aria-pressed="${selected===code}"><img src="assets/flags/${code}.svg" alt=""><span>${esc(c.name)}<small>${esc(c.capitals.join(' · '))}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="muted">No matches in this view. Try another search or continent.</p>';
 $('atlas-country-list').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.atlasCountry)));
}
function choose(code){
 if(!atlas.details[code])return;
 selected=code;globe.select(code);list();const c=atlas.details[code],x=extras[code];
 $('atlas-place').innerHTML=`<div class="atlas-place-heading"><img src="assets/flags/${code}.svg" alt="Flag of ${esc(c.name)}"><div><p class="eyebrow">${esc(c.region.toUpperCase())}</p><h2>${esc(c.name)}</h2></div></div><p>${esc(countrySummary(c,x,contexts[code]))}</p><div class="atlas-place-metrics"><div><span>Capital / seat</span><strong>${esc(c.capitals.join(' · '))}</strong></div><div><span>Area</span><strong>${formatValue(c.area,'km²')}</strong></div></div><a class="text-link" href="#records?country=${code}">Discover its records ↗</a><a class="context-source" href="${esc(x.source)}" target="_blank" rel="noopener noreferrer">Country source ↗</a>`;
 $('atlas-status').textContent=`${c.name} highlighted. Capital: ${c.capitals.join(', ')}.`;
}
function focusContinent(value){
 continent=value;selected=null;globe.select(null);globe.filter(value?group().map(([code])=>code):null);
 if(value){const [lon,lat,zoom]=views[value];globe.rotation=[-lon,-lat,0];globe.setZoom(zoom);}else globe.reset();
 document.querySelectorAll('[data-atlas-continent]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.atlasContinent===value)));
 $('atlas-place').innerHTML=`<p class="eyebrow">${value?esc(value.toUpperCase()):'THE WHOLE WORLD'}</p><h2>Pick a place. Make a connection.</h2><p>Click a country on the globe or choose its name from the list. Drag to explore, and zoom in to uncover more labels.</p>`;
 $('atlas-status').textContent=value?`Only ${value} countries are shown. Regional groups follow the same convention as Learning.`:'All countries are shown.';
 list();
}
export async function startAtlas(params=new URLSearchParams()){
 const apply=()=>{if(params.get('country')&&atlas.details[params.get('country')]){const code=params.get('country');focusContinent(continentForRegion(atlas.details[code].region));choose(code);}globe.resize();};
 if(globe){apply();return;}if(pending)return pending;
 $('atlas-status').textContent='Unfolding the world…';
 pending=(async()=>{try{
  [atlas,extras,contexts]=await Promise.all([loadAtlas(),loadExtras(),loadCountryContext()]);
  globe=new Globe($('atlas-canvas'),atlas,{labels:true,onSelect:choose,onMessage:text=>$('atlas-status').textContent=text});
  $('atlas-continents').innerHTML=['',...CONTINENTS].map(c=>`<button data-atlas-continent="${c}" aria-pressed="${!c}">${c||'Whole world'}</button>`).join('');
  $('atlas-continents').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>focusContinent(b.dataset.atlasContinent)));
  $('atlas-search').disabled=false;$('atlas-search').addEventListener('input',list);
  $('atlas-zoom-in').onclick=()=>globe.setZoom(globe.zoom*1.3);$('atlas-zoom-out').onclick=()=>globe.setZoom(globe.zoom/1.3);$('atlas-home').onclick=()=>focusContinent(continent);
  for(const id of ['atlas-zoom-in','atlas-zoom-out','atlas-home'])$(id).disabled=false;
  focusContinent('');apply();
 }catch{$('atlas-status').textContent='The atlas couldn’t load.';$('atlas-place').innerHTML='<button id="atlas-retry" class="secondary">Try again</button>';$('atlas-retry').onclick=()=>startAtlas(params);}finally{pending=null;}})();return pending;
}
