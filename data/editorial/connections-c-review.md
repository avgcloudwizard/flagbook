# Borders and nature editorial review — 23 October 2026

## Delivered

- `connections-c.json`: 12 new stories, six **Borders & belonging** and six **Earth & nature**.
- `connections-improved.json`: two expanded replacements retaining existing IDs, `chimborazo` and `story-na`.
- All explanations are 96–105 words. Each includes direct source URLs, verification date, geographic points, qualifications and two related IDs. Ijen includes an optional guess.
- All geographic coordinates are rounded approximate locators. Connection lines must remain labelled schematic; none is an exact voyage, plume, river course or property boundary.

## Claim-level duplicate review

The old `data/fun-facts.json` was searched across titles and bodies, including generated geography and terrain entries rather than just curated stories.

- `chimborazo` already made the Earth-centre versus sea-level claim. It is **improved, not new**: now explains the equatorial bulge, includes rounded comparison values, and avoids NOAA's misleading “closest to the stars” shorthand.
- `story-na` already described fog as the Namib Sand Sea's main water source. It is **improved, not new**: scoped explicitly to the World Heritage property and explains both fog and the river–ocean–wind sand connection.
- `story-ec` generically covered Galápagos currents, isolation and Darwin. The new penguin story makes a distinct claim about natural range north of the equator and the feeding mechanism; it does not repeat Darwin's visit.
- `geography-kh-0` identified Tonle Sap as a lake but did not explain seasonal reversal. The reversal is a new underlying claim.
- Existing French terrain descriptions mentioned French Guiana but did not explain the France–Brazil frontier. This story is new.
- Lesotho's enclave/high-elevation claim and Samoa's skipped Friday were considered and rejected as duplicates, rather than counted towards the new batch. No new production-stat cards were used.

## Sources read and editorial decisions

Each published claim was checked by opening the underlying institutional text. The MRC 2018 basin report was too large for the web fetch, so it was downloaded and its section 3.2.4, printed page 34 (PDF page 80), read using pypdf. The MRC procedures page was also read. The source describes a stable physical mechanism; dated historical flow averages are not used as current conditions.

- **France–Brazil:** French foreign ministry for border/cooperation, French overseas national archives for 1946 status, INSEE for current overseas-region scope. No unnecessary longest-border superlative.
- **Saba:** island government for 877 m and kingdom scope; Netherlands government and CBS for special-municipality versus constituent-country distinctions.
- **Diomedes:** NASA Earth Observatory for island names, state affiliation, separation and date line; NOAA for the nature of the date-line convention. No clocks, fixed 24-hour claim or assertion that local calendar dates always differ.
- **Baarle:** local tourism office's history and geography pages for medieval land origins and enclaves. Its unsupported global enclave totals and “world capital” promotional superlatives were omitted.
- **Pheasant Island:** departmental tourism/Hendaye material and the cross-border municipal consortium corroborate alternating responsibility and the 1659 negotiations. They disagree on present surface area, so that number is omitted. No claim that sovereignty simply vanishes and reappears every six months.
- **Tartupaluk:** Canada's 14 June 2022 agreement release; language deliberately describes the signed historical agreement. A 2024 Canadian policy search result discussed implementation still underway, so the story does not claim that the agreement entered into force in 2022 or make an unsupported current border-regime assertion. Inuit consultation and ongoing access are central, not an afterthought to a novelty “whisky war.”
- **Galápagos penguins:** Charles Darwin Foundation's 23 December 2024 field report corroborates the natural range; Woods Hole's 2015 research release explains upwelling. No stale population count is repeated or projected forward.
- **Blood Falls:** Johns Hopkins' 2023 account of the microscopy work. The nanosphere finding refines the explanation; it is not claimed to be the first discovery of iron there.
- **Sahara–Amazon:** NASA's satellite research account, published 2015 and based on 2007–2013 observations. No changing tonnage is represented as a timeless annual amount or the forest's only nutrient source.
- **Tonle Sap:** MRC report and procedures page. The connecting river reverses, not the entire Mekong. No rigid monthly schedule.
- **Ijen:** ESA's account of sulphurous gases, atmospheric combustion and acid lake chemistry. Omitted the “largest acidic lake” superlative because it does not improve the explanation.
- **Devils Tower:** NPS Geodiversity Atlas, including its section explicitly listing competing origin hypotheses. Cooling explains columns; original body geometry remains qualified. The rock is phonolite porphyry, not casually labelled basalt.

## Map and precision notes

- France–Brazil uses Saint-Georges and Oiapoque in the local border region, not a misleading line to Paris. `highlightCountries` is available for the renderer.
- Saba is indexed under Netherlands (`nl`), Greenland under Denmark (`dk`), while the display names and accuracy notes preserve their distinct statuses. Antarctica has no country code.
- Diomede marker positions are approximate island locators and the date-line indication is schematic.
- Chimborazo's optional comparison data gives 8.85 km versus 6.27 km above sea level and about 2.1 km centre-distance advantage. It deliberately does not invent absolute Earth-centre distances. Any Earth-shape diagram must label exaggerated scale.
- Some source pages expose a last-update date rather than an original publication date. Where used (NOAA, NPS, INSEE), the source date corresponds to that visible update; verification remains separately recorded as 2026-10-23.

No selected story failed verification. Exclusions concern duplicate claims, unnecessary superlatives, conflicting surface-area figures, stale population/flow estimates and unverified implementation timing, not padding the target with weaker facts.
