# Flagbook

A free, personal flag and geography learning website hosted on GitHub Pages.

## Practice

- 195 country flags: 193 UN members, Vatican City and Palestine.
- Type the country name and press Enter or Check answer.
- Spelling must match a listed name exactly. Capitalization, leading/trailing or repeated spaces and straight/curly apostrophes are ignored. No fuzzy matching, spellcheck or autocomplete.
- Explicit, correctly spelled alternative names are accepted (for example Turkey / Türkiye and Czechia / Czech Republic). Accepted names live in `countries.js`. Abbreviations are not accepted. Plain Congo is ambiguous and is not accepted for either Congo.
- Incorrect answers stay on the same flag. Correct answers unlock a country guide. Choose Next flag when you have finished reading.
- “I don’t know” records a reveal and shows the country; Next flag continues.
- All flags uses a shuffled deck, with no repeats until the deck finishes. Revisit misses practices countries previously missed.

## Learning

Open **Revision** for an alphabetical revision sheet of all 195 flags, country names and capitals. The compact three-column table fits mobile screens. Choose a continent, then optionally search within it by country, alternative country name or capital. Continent groups follow the atlas regions; North America includes Central America and the Caribbean. Multiple capitals and government seats follow the same reviewed data as the quizzes. Reading and searching do not record quiz attempts.

## Progress

Every submitted answer and reveal is saved with a timestamp. A round is a flag presentation with at least one answer or reveal. First-try accuracy is the percentage of rounds answered correctly on the first try. A wrong first answer or reveal counts as one missed round, even after repeated retries. “Flags named” counts different countries eventually answered correctly; it is not a mastery score. Streaks count consecutive rounds correct on the first try.

**Progress is stored only in this browser on this device.** It survives reloads and browser restarts, but does not automatically sync between devices or browsers. Private browsing and clearing website data can erase it. Use My progress → Download backup regularly. Import backup merges records without duplicating attempts. No user attempts are sent to GitHub, an API, or a database. Local preview and the live site have separate progress.

Use **Flag practice → Reset flag progress** for a fresh flag deck and empty flag statistics. The confirmation offers a backup download; globe progress is preserved. Resets also update other open Flagbook tabs so old flag attempts are not merged back in.

## Run and update

No build or dependencies are needed. Run `npm start`, then visit http://127.0.0.1:8767. Run `npm test` for spelling, scoring, data and backup checks. Node 22 or newer is suitable.

Push changes to `main` to publish. GitHub Pages is configured to deploy from the root of `main`. GitHub hosts public repositories on its free plan; this app has no paid APIs, server or database. Files are HTML, CSS, JavaScript and bundled SVGs. Fonts use Google Fonts with local system fallbacks.

## Sources

See [assets/SOURCES.md](assets/SOURCES.md) for flag artwork and country data provenance. Flags preserve their source proportions. The country list is a learning scope, not a statement on recognition. Flag artwork is a snapshot and can be updated as flags change.

## Country discovery cards

After a correct flag answer or reveal, a card below the quiz shows the flag’s description, symbolism and history; a globe with the country highlighted; capitals or seats of government; dated population; currencies; and three memorable country facts. The card stays open until Next flag. Source links appear on each card. Coverage: all 195 countries.

## Globe explorer

Open **Globe quiz** in the main navigation. Drag to rotate, scroll or use + / − to zoom, and click a country. Tiny states have clickable point markers. No country-name tooltips spoil the quiz.

1. Name the highlighted country, using the same exact-spelling rules as flag practice.
2. Once correct, name its capital. Countries with multiple accepted seats explain that any listed one is valid.
3. A correct capital answer opens the country’s field notes. Try another country, or click elsewhere on the globe.

Surprise me chooses a random country. Reveal this answer records a miss and lets you continue. Keyboard users can focus the globe, rotate with arrows, zoom with + / −, and select the centre country with Enter.

Globe attempts and the current quiz step persist in a separate browser record, preserving existing flag history. **My progress** shows separate globe totals and recent attempts. Exported backups include both histories; older flag-only backups remain compatible.

All map geometry, D3/TopoJSON libraries and country data are bundled locally. There is no map-service bill or API key. See [data/SOURCES.md](data/SOURCES.md) for data dates, sources, licenses and important capital/flag conventions.

### More than a flag

Every result card in flag practice and the globe quiz now adds a separate **Fun fact** conversation card, a **Who ruled here?** history with dates, and **What keeps it going?** economic drivers, exports and an expandable GDP-sector chart where data exist.

**Tourism scale** shows a transparent 1–10 historical arrivals benchmark. It uses 2019 or the latest reported 2010–2018 value, displays the year, and explains the bands in an expandable panel. There are 183 scored countries and 12 explicitly unrated countries with no benchmark data. It measures historical visitor volume rather than current travel conditions or desirability. See `data/SOURCES.md` for the method and provenance.

Reviewed additions live in `data/editorial/`; run `python3 scripts/build-country-context.py` after editing them. The page loads the generated `data/country-context.json` when a discovery card opens. Quiz scoring, saved progress and backup formats are unchanged.

## World atlas and world records

**World atlas** is a separate, non-quiz globe with country names. Drag or use the keyboard to rotate, zoom to reveal labels, select a continent to hide other countries, and search the country/capital list. Selecting a place focuses the globe and opens a short profile. Atlas and Records browsing never changes quiz progress.

**Records** now covers 265 topics and 19,967 reported entries, including 180 agricultural, food and livestock series; energy; manufacturing; trade; population; transport; environment; and geographic extremes. Search topics, filter by category or continent, compare a country, show 5/10/25/all entries, and download a sourced CSV. Global ranks remain visible when filtering continents. Observation years, coverage and source updates are explicit; the 2019 tourism ranking has been removed from this current catalogue.

**Metals & Minerals** adds 41 comparisons across 21 commodity groups: estimated 2025 production and 2026 reserve references from the revised USGS report. Gold has quick switches for mining, underground reserves and official holdings. The holdings comparison covers 11 selected countries, each with its own reporting date and source; it is not a complete or same-date global ranking. Mining, refining and reserves remain separate measures. The category also adds 461 sourced data cards.

**Fun facts** contains 4,591 distinct cards: 1,037 stories/geographic notes and 3,554 country-data facts. Shuffle favours stories and unread cards. Filter by subject, country, text or card type; save favourites; return to a previous card; open a daily pick; guess the country; copy facts with their source; or share a direct card link. A small globe places each country, with links to the atlas and relevant ranking. Arrow keys browse when focus is outside an input or control. Reading history and favourites stay in this browser in `flagbook.facts.v1`, separate from quiz progress; existing quiz backups do not include this reading list.

The refreshed design uses a quieter palette, compact navigation and tables, and a paper-style fact reader. All seven pages support narrow screens.

Globe-quiz results now begin with a country introduction; the flag story remains in a disclosure below. All country cards include official/spoken-language context, native country names, available written sentence samples, and dated INR currency references. Agriculture, Industry and Services buttons open product-specific top-five comparisons. The figures are bundled snapshots, not live market feeds; observation years and definitions appear next to the data.


### Refreshing records and facts

Run `python3 scripts/refresh-records.py`, then `python3 scripts/build-facts.py` and `npm test`. The first script uses reviewed indicator IDs and downloads upstream data to `.qa/refresh`; clear that ignored cache for a new retrieval and update the snapshot date before refreshing. Mineral inputs are reviewed transcriptions in `data/editorial/minerals-source.json` and `gold-holdings.json`; `python3 scripts/build-minerals.py` rebuilds this category without a network request and is also included in the full refresh. The second builds facts entirely from committed inputs. `build-records.py` forwards to the current refresh script. Check source definitions, latest years and coverage before publishing. Production pages use bundled snapshots and require no API keys.

## Where on Earth? and Records games

**Where on Earth?** (`#earth`) reverses the globe quiz: read a country name and select its territory on an unlabelled, draggable globe. Choose the whole world or a continent, zoom, ask for a regional hint or reveal the answer. Incorrect clicks identify the selected country and let you keep trying. Tiny countries have clickable markers; keyboard players can move a country under the centre crosshair and press Enter. The deck visits each eligible country once before reshuffling.

**Records games** (`#games`) contains three modes using the existing sourced catalogue:

- **Higher or lower:** compare two different positive country values from the same topic and reporting period. Answer once, then see both figures.
- **Name the top five:** type the countries in any order. Fifth-place ties are included. Duplicate answers do not count as mistakes; spelling follows flag practice's accepted-name rules.
- **Guess the country:** progressively open statistical, regional and capital clues. Statistical clues use untied top-five values so an alternative country cannot satisfy the same first clue. Only subjects with enough clues are offered.

All games keep source years and reveal source links and coverage after the round. Comparisons exclude mixed-date gold holdings and shared natural features. “Surprise me” favours familiar topics; the subject and topic selectors expose the wider eligible catalogue.

Each mode tracks completed rounds and clean rounds (all answers correct, no hints or reveals). Attempts are stored separately in `flagbook.games.v1`; active rounds survive reloads within a tab through session storage. **Progress** shows all four game modes, and its existing backup/import includes `gameEvents`, merging by attempt ID. Older backups remain compatible. Resetting flag progress does not reset games.
