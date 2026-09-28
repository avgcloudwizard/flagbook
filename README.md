# Flagbook

A free, personal flag-learning website hosted on GitHub Pages.

## Practice

- 195 country flags: 193 UN members, Vatican City and Palestine.
- Type the country name and press Enter or Check answer.
- Spelling must match a listed name exactly. Capitalization, leading/trailing or repeated spaces and straight/curly apostrophes are ignored. No fuzzy matching, spellcheck or autocomplete.
- Explicit, correctly spelled alternative names are accepted (for example Turkey / Türkiye and Czechia / Czech Republic). Accepted names live in `countries.js`. Abbreviations are not accepted. Plain Congo is ambiguous and is not accepted for either Congo.
- Incorrect answers stay on the same flag. Correct answers advance after one second.
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
