import {COUNTRIES} from './countries.js';
import {esc} from './discovery.js';

const normalize = value => value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('en').trim();
let rows;
let pending;
let bound = false;

function renderLearning() {
  const query = normalize(document.getElementById('learning-search').value);
  const visible = rows.filter(row => row.search.includes(query));
  document.getElementById('learning-rows').innerHTML = visible.map(({code,name,capitals,note}) =>
    `<tr><td><img src="assets/flags/${code}.svg" alt="Flag of ${esc(name)}" width="36" height="24" loading="lazy" decoding="async"></td><th scope="row">${esc(name)}</th><td${note ? ` title="${esc(note)}"` : ''}>${capitals.map(esc).join(' · ')}</td></tr>`
  ).join('');
  document.getElementById('learning-count').textContent = query ? `${visible.length} of ${rows.length} countries` : `${rows.length} countries`;
  document.getElementById('learning-empty').hidden = visible.length !== 0;
}

export function startLearning() {
  if (rows || pending) return pending;
  const search = document.getElementById('learning-search');
  const loading = document.getElementById('learning-loading');
  const retry = document.getElementById('learning-retry');
  if (!bound) {
    search.addEventListener('input',renderLearning);
    retry.addEventListener('click',startLearning);
    bound = true;
  }
  retry.hidden = true;
  loading.hidden = false;
  loading.textContent = 'Loading your revision sheet…';
  pending = fetch('data/country-details.json')
    .then(response => {if (!response.ok) throw new Error('Country data unavailable'); return response.json();})
    .then(details => {
      // Reuse the quiz's reviewed capitals and seats, including small states.
      rows = COUNTRIES.map(country => ({code:country.code,name:country.name,capitals:details[country.code].capitals,note:details[country.code].capitalNote,
        search:normalize([country.name,...country.aliases,...details[country.code].capitalAnswers].join(' '))
      })).sort((a,b)=>a.name.localeCompare(b.name,'en'));
      renderLearning();
      loading.hidden = true;
      search.disabled = false;
      document.getElementById('learning-table-wrap').hidden = false;
    })
    .catch(() => {rows = undefined;loading.textContent = 'The revision sheet couldn’t load. Please try again.';retry.hidden = false;})
    .finally(() => {pending = undefined;});
  return pending;
}
