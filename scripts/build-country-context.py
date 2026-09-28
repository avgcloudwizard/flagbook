"""Compile reviewed country context. All inputs are versioned in data/editorial.
Run: python3 scripts/build-country-context.py
No network access is needed. Edit narratives in the pipe-delimited .tsv files.
"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

def rows(name, width):
    result = {}
    for line in (DATA / 'editorial' / name).read_text().splitlines():
        parts = line.split('|')
        assert len(parts) == width, (name, parts)
        assert parts[0] not in result, f'Duplicate: {parts[0]}'
        result[parts[0]] = parts[1:]
    return result

countries = json.loads((DATA / 'country-details.json').read_text())
facts = rows('party-facts.tsv', 4)
history = rows('history.tsv', 2)
economies = json.loads((DATA / 'editorial/economy-snapshot.json').read_text())
tourism = json.loads((DATA / 'editorial/tourism-benchmark.json').read_text())['observations']
assert set(countries) == set(facts) == set(history) == set(economies) == set(tourism)
result = {}
for code, country in countries.items():
    title, text, url = facts[code]
    assert title and text and url.startswith('https://')
    result[code] = {
        'partyFact': {'title': title, 'text': text, 'source': url},
        'history': {'text': history[code][0], 'source': country['source']},
        'economy': economies[code],
        'tourism': tourism[code],
    }
(DATA / 'country-context.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Built {len(result)} country context cards; {sum(v is not None for v in tourism.values())} tourism benchmarks.')
