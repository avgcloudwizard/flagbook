"""Assemble reviewed stories, without network access or generated facts.
Edit data/editorial/connections-*.json, then run this script and npm test.
"""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
facts=[]
for name in ['connections-a.json','connections-b.json','connections-c.json','connections-improved.json']:
    facts.extend(json.loads((R/'data/editorial'/name).read_text()))
ids={f['id'] for f in facts}
assert len(ids)==len(facts), 'Duplicate stable IDs'
assert len({f['slug'] for f in facts})==len(facts), 'Duplicate slugs'
for f in facts:
    f['kind']='story'
    assert 80<=len(f['explanation'].split())<=150,(f['id'],'Explanation length')
    assert f['sources'] and f['map']['locations'] and f['verified']
    related=[i for i in f.get('related',[]) if i in ids and i!=f['id']]
    candidates=sorted((r for r in facts if r['id']!=f['id'] and r['id'] not in related),key=lambda r: len(set(f['tags'])&set(r['tags']))*2+len(set(f['countries'])&set(r['countries']))*3+(f['category']==r['category']),reverse=True)
    f['related']=(related+[r['id'] for r in candidates])[:2]
(R/'data/unexpected-connections.json').write_text(json.dumps({'version':1,'collection':'Unexpected Connections','verified':'2026-10-23','facts':facts},ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(facts)} sourced stories.')
