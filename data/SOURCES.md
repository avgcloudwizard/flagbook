# Flagbook geography data

Snapshot assembled on 28 September 2026. These files are served locally from GitHub Pages. Visitors do not call a paid API or a remote map service.

## Country learning guide

`country-details.json` covers the same 195 countries as the flag quiz. Each profile includes its own source links.

- **Flag descriptions, meanings and history, name origins, geographical notes, national symbols:** CIA World Factbook public-domain text, redistributed in the CC0 [factbook/factbook.json](https://github.com/factbook/factbook.json) archive, pinned at commit `144d6977b2b01ac1cbd220de754c0a005616760b`. HTML was stripped, facts selected and long notes shortened at clause boundaries. Upstream wording and uncertainty are retained; flag meanings can have multiple interpretations.
- **Population:** [World Bank, SP.POP.TOTL](https://data.worldbank.org/indicator/SP.POP.TOTL). API snapshot last updated 13 July 2026; most records are 2025, with the observation year shown beside every number. Endpoint: `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2024:2025&per_page=1000`. Values are estimates, not live counters. World Bank data are available under [CC BY 4.0 terms](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets).
- **Vatican population:** 882 residents as of 31 December 2024, from the [Vatican City State statistics page](https://www.vaticanstate.va/en/state-and-government/general-informations/population.html). Residents and citizens are different counts.
- **Base capitals, coordinates, region, area and currency metadata:** [mledoze/countries](https://github.com/mledoze/countries), ODbL 1.0, with the explicit corrections below. The derived metadata remains available in the JSON under ODbL; public-domain narrative text and World Bank observations retain their respective terms.

## Explicit corrections and conventions

- Equatorial Guinea: **Ciudad de la Paz**, declared the capital on 2 January 2026 by [Decree Law 1/2026](https://www.guineaecuatorialpress.com/noticias/decreto_ley_por_el_que_se_declara_la_ciudad_de_la_paz_djibloho_capital_de_la_republica_de_guinea_ecuatorial). Malabo is no longer accepted as the current capital.
- Indonesia: Jakarta during the transition; Nusantara's political-capital target is 2028, per the [Nusantara Capital Authority](https://ikn.go.id/id/posts/perpres-nomor-79-tahun-2025-pertegas-kepastian-kelanjutan-dan-penyelesaian-ibu-kota-nusantara).
- Sri Lanka: Sri Jayewardenepura Kotte and Colombo are differentiated as administrative/legislative and commercial capitals, following the [Sri Lankan Embassy](https://www.emb-seoul.gov.lk/en/srilanka-at-glance).
- Multiple seats are explicitly described for South Africa, Bolivia, Eswatini, the Netherlands, Benin and Malaysia. Either listed seat is accepted. Nauru's question asks for its seat-of-government district, Yaren, rather than pretending it has an official capital.
- Bulgaria uses EUR from 1 January 2026: [European Commission](https://economy-finance.ec.europa.eu/euro/eu-countries-and-euro/bulgaria-and-euro_en).
- Zimbabwe: Zimbabwe Gold (ZiG, ZWG) and the widely used US dollar, per the [Reserve Bank of Zimbabwe](https://www.rbz.co.zw/documents/ar/Reserve%20Bank%20of%20Zimbabwe_2025%20_Annual%20Report.pdf). Removed the obsolete bond-note entry and legacy list of foreign currencies from base metadata.
- Micronesia: USD, as documented by the [FSM Banking Board](https://bankingboard.gov.fm/overview.htm). Cuba: CUP, with the discontinued convertible peso excluded.
- Palestine: East Jerusalem (claimed capital) and Ramallah (administrative centre), with Jerusalem's disputed status noted; currencies reflect circulation, not a separate national currency ([Palestine Monetary Authority](https://www.pma.ps/)). The flag clue is an original visual comparison with Jordan. Geography facts use the Factbook West Bank/Gaza profiles and base metadata.
- Afghanistan's existing tricolour is retained. Its card explicitly identifies it as the 2004 flag and explains that the Taliban authorities use a different white flag. This matches the artwork already in the quiz and the source's flag convention.
- Capital answers permit explicit common transliterations and accented/unaccented forms. Misspellings are not accepted; this is not fuzzy matching.

## Globe and libraries

- `world-50m.json`: [World Atlas 2.0.2](https://github.com/topojson/world-atlas), derived from [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) 1:50m Admin 0 data, public domain. Borders are simplified and reflect that dataset's treatment of disputed areas; they are not a claim about sovereignty. Countries outside the 195-country learning set remain visible but are not quiz answers. Tiny states use point markers so all 195 remain selectable.
- D3 7.9.0: ISC, license in `vendor/D3-LICENSE`.
- TopoJSON Client 3.1.0: ISC, license in `vendor/TOPOJSON-LICENSE`.

## Regeneration

`scripts/build-country-details.py` builds the guide from cached inputs. To refresh, obtain the base `countries.json`, the World Bank response above, and the pinned Factbook repository, then provide the input paths documented at the top of the script. Review capital/currency overrides when refreshing. Site publication does not run this script; the reviewed JSON is committed and works without external API calls.

## Conversation facts, history, economy and tourism

`country-context.json` adds four sections to all 195 country guides. Existing flag stories and three original field notes are retained. All new data are served locally; readers make no third-party data requests.

- **Conversation facts:** original short paraphrases, with an individual source URL for every entry in `editorial/party-facts.tsv`. Most use [UNESCO World Heritage property descriptions](https://data.unesco.org/explore/dataset/whc001/), retrieved from `https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/exports/json` on 28 September 2026. Other sources include national tourism and heritage organisations, UNESCO intangible heritage, the public-domain Factbook archive, the US National Park Service, Edinburgh Zoo, CyArk and ABC's contemporaneous Samoa report. A source link does not imply the place is inscribed on the World Heritage List: some links are tentative nominations, museums, parks or other research. UNESCO descriptions are paraphrased, not republished as a database or copied wholesale.
- **History:** editorial summaries of selected major periods of outside rule, informed by the Factbook country backgrounds and independence histories. `editorial/history.tsv` is the reviewable source. They distinguish colonial rule, protectorates, dynastic unions, annexation and military occupation; they are not exhaustive ruler lists. Dates refer to the specified territory or relationship, which need not share today's borders. Approximate centuries are used when conquest occurred gradually. Colonial settlement does not mean the absence of existing Indigenous societies. The card links to further historical background rather than implying the short summary is the full history.
- **Economy:** `editorial/economy-snapshot.json` preserves selected public-domain Factbook economic fields from the pinned archive above, with original explanatory summaries for several countries. Sector shares, goods exports and remittances retain observation years; GDP sector shares can use different years and need not sum to 100%. The UI labels them estimates and shows each year. Industry lists are illustrative activities, not rankings or estimates of GDP contribution. Palestine uses a separate structural overview with a World Bank link, rather than displaying West Bank-only GDP shares as though they cover Gaza. These are dated educational snapshots, not live forecasts.
- **Tourism:** World Bank / UN Tourism indicator `ST.INT.ARVL`, retrieved 28 September 2026 from `https://api.worldbank.org/v2/country/all/indicator/ST.INT.ARVL?format=json&date=2010:2019&per_page=20000`. The selected raw observations are committed in `editorial/tourism-benchmark.json` under the World Bank's CC BY 4.0 terms. Use 2019 where available, otherwise the latest reported 2010–2018 value. Coverage is 183/195; 12 countries are explicitly unrated, with no invented or imputed arrivals. The year is always visible, with a separate badge on older observations.

### Tourism score definition

This is a **Flagbook-derived historical visitor-volume score**, not an official index. Scores 1–10 use annual arrival bands: under 100k; 100k–under 250k; 250k–under 500k; 500k–under 1m; 1m–under 2m; 2m–under 5m; 5m–under 10m; 10m–under 20m; 20m–under 50m; 50m or more. Exact boundaries enter the higher band. Zero is a valid reported value (score 1); missing values are unrated.

The [indicator definition](https://databank.worldbank.org/metadataglossary/world-development-indicators/series/ST.INT.ARVL) notes that counts measure trips, not unique travellers, and some countries report visitors including same-day visits. Collection methods differ. Absolute volume favours larger destinations and does not measure tourism intensity per resident, local crowding, current conditions, attractiveness or safety. The full method is available inside every tourism card.

Run `python3 scripts/build-country-context.py` to regenerate from the versioned editorial inputs, without fetching or changing upstream data. Review source dates and country-specific context before refreshing snapshots. The compiler requires exactly the existing 195-country set and fails on missing or duplicate entries. `npm test` checks coverage, rendering, score boundaries, source-observation preservation, unavailable data and retries in addition to the original quiz tests.
