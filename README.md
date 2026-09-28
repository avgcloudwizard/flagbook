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

## Progress

Every submitted answer and reveal is saved with a timestamp. A round is a flag presentation with at least one answer or reveal. First-try accuracy is the percentage of rounds answered correctly on the first try. A wrong first answer or reveal counts as one missed round, even after repeated retries. “Flags named” counts different countries eventually answered correctly; it is not a mastery score. Streaks count consecutive rounds correct on the first try.

**Progress is stored only in this browser on this device.** It survives reloads and browser restarts, but does not automatically sync between devices or browsers. Private browsing and clearing website data can erase it. Use My progress → Download backup regularly. Import backup merges records without duplicating attempts. No user attempts are sent to GitHub, an API, or a database. Local preview and the live site have separate progress.

## Run and update

No build or dependencies are needed. Run `npm start`, then visit http://127.0.0.1:8767. Run `npm test` for spelling, scoring, data and backup checks. Node 22 or newer is suitable.

Push changes to `main` to publish. GitHub Pages is configured to deploy from the root of `main`. GitHub hosts public repositories on its free plan; this app has no paid APIs, server or database. Files are HTML, CSS, JavaScript and bundled SVGs. Fonts use Google Fonts with local system fallbacks.

## Sources

See [assets/SOURCES.md](assets/SOURCES.md) for flag artwork and country data provenance. Flags preserve their source proportions. The country list is a learning scope, not a statement on recognition. Flag artwork is a snapshot and can be updated as flags change.

## Country discovery cards

After a correct flag answer or reveal, a card below the quiz shows the flag’s description, symbolism and history; a globe with the country highlighted; capitals or seats of government; dated population; currencies; and three memorable country facts. The card stays open until Next flag. Source links appear on each card. Coverage: all 195 countries.

## Globe explorer

Open **Globe explorer** in the main navigation. Drag to rotate, scroll or use + / − to zoom, and click a country. Tiny states have clickable point markers. No country-name tooltips spoil the quiz.

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
