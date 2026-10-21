"""Compile reviewed mineral tables into Records. No network calls or quiz writes.
Source transcription, columns, units and PDF page numbers: data/editorial/minerals-source.json.
The source extraction removes superscript footnote markers, never numeric qualifiers.
"""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data';CHECKED='2026-10-21'
def read(path):return json.loads((DATA/path).read_text())
def rank(entries):
 entries.sort(key=lambda e:(-e['value'],e['code']))
 for n,e in enumerate(entries):e['rank']=n+1 if n==0 or e['value']!=entries[n-1]['value'] else entries[n-1]['rank']
 return entries
def number(raw):
 return float(raw.replace(',','')) if re.fullmatch(r'\d[\d,]*(?:\.\d+)?',raw) else None

def compile_minerals():
 source=read('editorial/minerals-source.json');countries=read('country-details.json')
 names={v['name']:k for k,v in countries.items()};names.update({'Congo (Kinshasa)':'cd','Burma':'mm','Turkey':'tr','Korea, Republic of':'kr','Korea, North':'kp'})
 items=[]
 for mineral in source['commodities']:
  for previous,col,suffix,measure,scale in mineral['series']:
   reserve='reserves' in suffix;entries=[];unavailable=[]
   for row in mineral['rows']:
    code=names.get(row['name']);value=number(row['values'][col])
    if not code:continue
    if value is None or value<=0:
     unavailable.append({'code':code,'reported':row['values'][col]});continue
    e={'code':code,'value':round(value*scale,6)}
    if previous is not None:
     prev=number(row['values'][previous])
     if prev is not None:e['previous']=round(prev*scale,6)
    entries.append(e)
   title=mineral['label']+' — '+measure.lower();unit='carats' if mineral['id']=='diamond-industrial' else 'tonnes'
   item=dict(id=mineral['id']+'-'+suffix,category='Metals & Minerals',commodity=mineral['id'],group='Reserves' if reserve else 'Production',label=title,unit=unit,year='2026 reference' if reserve else '2025',measure=measure+' · '+mineral['label'],note=mineral['note'],source=source['source']+'#page='+str(mineral['pdfPage']),sourceLabel='USGS · Mineral Commodity Summaries 2026 (revised May)',checked=CHECKED,sourceUpdated='2026-05-27',entries=rank(entries),unavailable=unavailable,
    notice=('Estimated economically recoverable deposits in the 2026 reference. These are not all geological resources, annual output or metal already held in vaults.' if reserve else 'Estimated 2025 production, published in 2026. This measures annual output, not underground deposits or official gold holdings.'),
    coverage=f'{len(entries)} individually reported countries in this site’s 195-country scope. Aggregates, territories, withheld values, unknown values and non-numeric bounds are excluded from ranks. Missing does not mean zero. National reserve definitions can differ.')
   # A rounded world total is valid for production shares only when it is an exact numeric cell.
   world=next((r for r in mineral['rows'] if r['name'].startswith('World total')),None)
   if world and not reserve:
    total=number(world['values'][col])
    if total:item['worldTotal']=round(total*scale,6)
   items.append(item)
 holdings=read('editorial/gold-holdings.json');holdings['entries']=rank(holdings['entries']);items.append(holdings)
 return items

def update():
 catalogue=read('world-records.json');new=compile_minerals();catalogue['items']=[i for i in catalogue['items'] if i['category']!='Metals & Minerals']+new
 catalogue['items'].sort(key=lambda i:(i['category'],i['label']));catalogue['updated']=CHECKED
 assert len({i['id'] for i in catalogue['items']})==len(catalogue['items'])
 (DATA/'world-records.json').write_text(json.dumps(catalogue,ensure_ascii=False,separators=(',',':'))+'\n')
 print(f'Added {len(new)} mineral topics / {sum(len(i["entries"]) for i in new)} entries. Catalogue: {len(catalogue["items"])} topics.')
if __name__=='__main__':update()
