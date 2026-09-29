let contextPromise;
export function loadCountryContext() {
  if (!contextPromise) contextPromise = fetch('data/country-context.json')
    .then(response => { if (!response.ok) throw new Error('Country context unavailable'); return response.json(); })
    .catch(error => { contextPromise = null; throw error; });
  return contextPromise;
}

// Absolute inbound-trip volume, not a ranking of attractiveness or safety.
export const TOURISM_THRESHOLDS = [100000,250000,500000,1000000,2000000,5000000,10000000,20000000,50000000];
export function tourismScore(observation) {
  if (!observation || !Number.isFinite(observation.arrivals) || observation.arrivals < 0) return null;
  return 1 + TOURISM_THRESHOLDS.filter(threshold => observation.arrivals >= threshold).length;
}

export function renderCountryContext(context, code, escape) {
  const {partyFact: fact, history, economy, tourism} = context;
  const esc = escape;
  const link = (url, label) => `<a class="context-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
  const score = tourismScore(tourism);
  const scoreLabel = score === null ? 'No comparable data' : score <= 3 ? 'Lower visitor volume' : score <= 6 ? 'Established visitor volume' : score <= 8 ? 'High visitor volume' : 'Very high visitor volume';
  const year = tourism?.year;
  const sectors = economy.sectors.filter(s => s.share >= 0 && s.share <= 100);
  const historyText = esc(history.text).replace(/\b\d{3,4}(?:[–/]\d{2,4})?(?: BCE| CE)?\b/g, '<strong>$&</strong>');
  const industries = economy.industries || 'See the economic overview for the principal activities.';
  return `
    <section class="party-note" aria-label="Fun fact">
      <div class="party-note-top"><span class="party-kicker"><span aria-hidden="true">✳</span> FUN FACT · POCKET CONVERSATION</span><span class="party-stamp" aria-hidden="true">DID YOU<br>KNOW?</span></div>
      <h3>${esc(fact.title)}</h3><p>${esc(fact.text)}</p>
      <div class="party-note-footer"><span>A little story worth remembering.</span>${link(fact.source, 'The story behind it')}</div>
    </section>
    <div class="context-heading"><p class="eyebrow">GET TO KNOW THE COUNTRY</p><h3>The bigger picture.</h3></div>
    <section class="history-note" aria-label="History of outside rule">
      <div class="context-section-title"><span class="context-icon" aria-hidden="true">↶</span><div><p class="context-kicker">HISTORY & INDEPENDENCE</p><h4>Who ruled here?</h4></div></div>
      <p class="history-text">${historyText}</p>
      <div class="context-card-footer"><span>Selected periods. Borders and forms of rule changed over time.</span>${link(history.source, 'Historical background')}</div>
    </section>
    <div class="context-grid">
      <section class="economy-note" aria-label="Economic drivers">
        <div class="context-section-title"><span class="context-icon" aria-hidden="true">↗</span><div><p class="context-kicker">ECONOMIC ENGINES</p><h4>What keeps it going?</h4></div></div>
        ${economy.description ? `<p class="economy-description">${esc(economy.description)}</p>` : ''}
        <div class="economy-field"><h5>Work & industry</h5><p>${esc(industries)}</p></div>
        ${economy.exports ? `<div class="economy-field"><h5>Goods it sells abroad</h5><p>${esc(economy.exports)}</p></div>` : ''}
        ${sectors.length ? `<details class="context-details"><summary>See the economy by sector</summary><p class="context-fineprint">Share of GDP · estimates; observation year shown for each sector. Figures may not total 100%.</p><div class="sector-chart">${sectors.map(s => `<div class="sector-row"><button class="sector-open" data-sector-category="${/agric/i.test(s.name)?'Agriculture':/industr/i.test(s.name)?'Industry':'Services'}" aria-expanded="false"><span>${esc(s.name)} <small>${s.year}</small></span><b>${s.share}% ↗</b></button><div class="sector-track" aria-hidden="true"><i style="width:${s.share}%"></i></div></div>`).join('')}</div>${economy.remittances ? `<p class="context-fineprint">Remittances from abroad: ${esc(economy.remittances)}.</p>` : ''}</details>` : ''}
        <div class="sector-shortcuts" aria-label="Compare world leaders"><span>Explore the top five</span>${['Agriculture','Industry','Services'].map(category=>`<button data-sector-category="${category}" aria-expanded="false">${category} ↗</button>`).join('')}</div><div class="context-card-footer"><span>Economic snapshot; dates vary by measure.</span>${link(economy.source, 'Economic source')}</div>
      </section>
      <section class="tourism-note" aria-label="Tourism popularity benchmark">
        <p class="context-kicker">HOW TOURISTY?</p><h4>Tourism scale</h4>
        <div class="tourism-score ${score === null ? 'unrated' : ''}">${score === null ? '<strong>—</strong><span>unrated</span>' : `<strong>${score}</strong><span>/ 10</span>`}</div>
        <p class="tourism-label">${scoreLabel}</p>
        <div class="tourism-meter" aria-hidden="true">${Array.from({length:10}, (_,i) => `<i class="${score !== null && i < score ? 'filled' : ''}"></i>`).join('')}</div>
        ${score === null ? '<p class="tourism-evidence">No reported arrivals in our 2010–2019 benchmark window. Missing data does not mean no visitors.</p>' : `<p class="tourism-evidence"><strong>${new Intl.NumberFormat('en').format(tourism.arrivals)}</strong> international arrivals · <b>${year}</b>${year < 2019 ? '<span class="older-benchmark">Older observation · latest available before 2020</span>' : ''}</p>`}
        <p class="tourism-caveat">A historical popularity benchmark, not today’s crowd level or a travel recommendation.</p>
        <details class="context-details tourism-method"><summary>How is the score calculated?</summary><p>Flagbook groups annual international arrivals into ten bands. We use 2019, or the latest reported year from 2010–2018. This gives a pre-pandemic baseline, not a current ranking.</p><ol class="score-bands">${['Under 100,000','100,000–249,999','250,000–499,999','500,000–999,999','1–under 2 million','2–under 5 million','5–under 10 million','10–under 20 million','20–under 50 million','50 million or more'].map(b => `<li>${b}</li>`).join('')}</ol><p>Counts are trips, not unique people. Some countries include day visitors. Absolute volume favours larger destinations; it does not measure visitors per resident, local crowding, safety or quality.</p>${link('https://databank.worldbank.org/metadataglossary/world-development-indicators/series/ST.INT.ARVL', 'Definitions & limitations')}</details>
        <div class="context-card-footer">${link(`https://data.worldbank.org/indicator/ST.INT.ARVL?locations=${code.toUpperCase()}`, 'World Bank · UN Tourism')}</div>
      </section>
    </div><section class="sector-rankings" aria-label="Sector world rankings" hidden></section>`;
}
