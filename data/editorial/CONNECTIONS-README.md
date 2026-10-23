# Unexpected Connections editorial guide

The live Fun Facts page loads `data/unexpected-connections.json`. It contains 30 new stories (18 human/food/culture, 6 borders, 6 nature) and two substantially expanded existing claims: `story-na` (Namib fog and transported sand) and `chimborazo` (measurement definitions). The old generated `data/fun-facts.json` is retained as a historical input for deduplication; it is no longer loaded or offered by the page. Production rankings, including the leeks and sorghum cards, are excluded from the new feed.

## Add a story

1. Read direct evidence from reliable sources and search the existing and historical collections for the underlying claim. Do not count a rewritten title as a new fact.
2. Add an object to one of `connections-a.json`, `connections-b.json`, or `connections-c.json`. Put revised existing claims in `connections-improved.json`. Keep stable IDs unchanged for saved links.
3. Include `id`, `slug`, `title`, `hook`, `shortFact`, an 80–150-word `explanation`, `category`, `tags`, two-letter `countries`, `regions`, `places`, `period`, `map`, `sources`, `verified`, `accuracyNote` and two `related` IDs. `published` is null when the source does not show a publication date. `verified` is the actual date a person or researcher read and checked the claim.
4. Map coordinates are **[longitude, latitude]**. Label representative regional points `approximate: true`. Types: `connection` (dashed schematic link), `location`, `dateline` (Diomede illustration) or `comparison` (the Chimborazo/Everest measurement comparison). Do not use the latter two for unrelated topics without extending the renderer. `map.caption` must explain what the graphic represents. Lines are not exact documented voyages.
5. Optional `guess` has a self-contained `question`, 3–4 distinct `options` and an `answer` matching one option. Avoid exposing the answer in the question.
6. Run `python3 scripts/build-connections.py`, then `npm test`. Update the collection-count assertions when intentionally adding stories. The assembler resolves missing related IDs using shared topics/places; review the resulting pairs before publishing.
7. Run `npm start` and open `http://127.0.0.1:8767/#facts`. Check both mobile and desktop, source links, local map framing, guesses and back navigation. Bump the content/module cache versions when publishing a new edition.

Research decisions, direct sources read, duplicates and excluded candidates are documented in the three `connections-*-review.md` files. A proposed ketchup single-origin etymology was rejected as insufficiently secure; a tomato story was researched but held back for variety. Starting links that were inaccessible were replaced with direct institutional or research sources, not cited unread.

No AI generation or paid map service runs when a visitor opens the page. Maps reuse the existing bundled Natural Earth geometry and D3 library; distant connections are schematic, and small-area coastlines/borders remain simplified. The Diomede illustration contains no live clocks, avoiding a misleading fixed time difference. The mountain comparison explains the two measurement origins without an exaggerated unlabelled scale.
