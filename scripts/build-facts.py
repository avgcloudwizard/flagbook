"""Build reproducible, source-linked stories and data facts from committed inputs."""
import json,re,html,hashlib,collections
from pathlib import Path
R=Path(__file__).resolve().parents[1];D=R/'data'
read=lambda name:json.loads((D/name).read_text())
details=read('country-details.json');contexts=read('country-context.json');geo=read('editorial/geography-notes.json');records=read('world-records.json');facts=[];seen=set()
def plain(v):
 if isinstance(v,dict):v=v.get('text','')
 return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',str(v or '')))).strip()
def add(id,title,body,category,countries,source,kind='story',year='Geographic reference',sourceLabel='World Factbook reference',question=None,topic=None,excludeChoices=None):
 body=plain(body);body=body[0].upper()+body[1:] if body else body
 fingerprint=re.sub(r'\W','',body.lower())
 if len(body)<45 or fingerprint in seen:return
 seen.add(fingerprint)
 facts.append(dict(id=id,title=title,body=body,category=category,countries=countries,source=source,kind=kind,year=year,sourceLabel=sourceLabel,**({'question':question} if question else {}),**({'topic':topic} if topic else {}),**({'excludeChoices':excludeChoices} if excludeChoices else {})))
# Freshly checked editorial stories. Numerical crop claims below are computed, not guessed.
editorial=[
 ('nemo','The furthest you can get from land','Point Nemo lies in the South Pacific, about 2,688 km from its nearest land. Its three closest neighbours are tiny islands near Pitcairn, Easter Island and Antarctica.','Oceans & rivers',[],'https://oceanservice.noaa.gov/facts/nemo.html','NOAA'),
 ('underwater-range','The longest mountain range is mostly hidden','The mid-ocean ridge stretches about 65,000 km around Earth. Roughly 90% of it is underwater: the world’s longest mountain range is mainly a feature of the seafloor.','Mountains & extremes',[],'https://oceanservice.noaa.gov/facts/midoceanridge.html','NOAA'),
 ('chimborazo','Everest wins one contest. Chimborazo wins another.','Ecuador’s Chimborazo has the summit furthest from Earth’s centre. Earth bulges at the equator, giving this volcano an advantage over Everest even though Everest stands higher above sea level.','Mountains & extremes',['ec'],'https://oceanservice.noaa.gov/facts/highestpoint.html','NOAA'),
 ('mauna-kea','A mountain with most of itself below the surface','Measured from its underwater base to its summit, Hawaii’s Mauna Kea rises more than 10,210 metres. “Tallest from base” and “highest above sea level” are different records.','Mountains & extremes',['us'],'https://oceanservice.noaa.gov/facts/highestpoint.html','NOAA'),
 ('sargasso','A sea with no coastline','The Sargasso Sea has boundaries made by ocean currents rather than land. Those moving currents surround a floating seaweed habitat in the North Atlantic.','Oceans & rivers',[],'https://oceanservice.noaa.gov/facts/sargassosea.html','NOAA'),
 ('lesotho-high','A whole country above 1,000 metres','Every part of Lesotho lies more than 1,000 metres above sea level. It is also completely surrounded by South Africa; its capital, Maseru, sits right at that border.','Mountains & extremes',['ls'],'https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Earth_from_Space_Lesotho','European Space Agency')]
for id,title,body,cat,cs,url,source in editorial:add(id,title,body,cat,cs,url,sourceLabel=source)
for code,c in details.items():
 name=c['name'];g=geo[code]['geography'];src=geo[code]['source'];party=contexts[code]['partyFact']
 add('story-'+code,party['title'],party['text'],'Places & people',[code],party['source'],sourceLabel='Country story · linked original source')
 # Split independent numbered notes; retain the source wording for public-domain reference material.
 note=plain(g.get('Geography - note',{}));parts=re.split(r'(?:^|\s)note\s*\d*\s*:',note,flags=re.I)
 for n,part in enumerate(parts):
  part=part.strip(' ;')
  if 65<=len(part)<=900:
   add(f'geography-{code}-{n}','Geography of '+name,part,'Borders & geography',[code],src)
 etym=geo[code]['government']['Country name'].get('etymology')
 if etym:add('name-'+code,'Why it is called '+name,plain(etym),'Names & culture',[code],src)
 for key,cat,title in [('Terrain','Mountains & extremes','The shape of '+name),('Climate','Weather & nature','Climate of '+name)]:
  text=plain(g.get(key))
  if 65<=len(text)<=650:add(key.lower()+'-'+code,title,text,cat,[code],src)
 coast=plain(g.get('Coastline'))
 if coast.startswith('0 km'):
  add('coast-'+code,'No seaside address in '+name,f'{name} has no ocean coastline. A lakeside or riverside home may be possible, but an oceanfront address means crossing into another country.','Borders & geography',[code],src,question='Which of these countries has no ocean coastline?')
 # Flag designs stay in their own category, rather than overwhelming geographic stories.
 if c['flagStory'] and 70<=len(c['flagStory'][0])<=650:add('flag-'+code,'Read the flag of '+name,c['flagStory'][0],'Flags & symbols',[code],c['source'])
# Every statistical card corresponds to one distinct country/measure observation.
for item in records['items']:
 if item['category']=='Nature' or item['id']=='gold-holdings':continue
 cat={'Agriculture':'Food & drink','Food & livestock':'Food & drink','Textiles':'Things we make','Energy':'Energy & resources','Industry':'Things we make','Economy':'Money & trade','Services':'Money & trade','People':'Places & people','Transport':'Getting around','Environment':'Weather & nature','Metals & Minerals':'Metals & minerals'}[item['category']]
 for e in item['entries'][:15]:
  code=e.get('code')
  if not code:continue
  name=details[code]['name'];v=f"{e['value']:,.0f}" if e['value']>=100 else f"{e['value']:,.2f}".rstrip('0').rstrip('.')
  unit=item['unit'];measure=item.get('measure',item['label']);rank=e['rank'];label=item['label'];year=item['year']
  if item['category'] in ['Agriculture','Food & livestock','Textiles'] and item.get('indicator'):
   body=f'{name} produced {v} {unit} of {measure.lower()} in {year}, placing it #{rank} among the reporting countries in this dataset.'
   world=item.get('worldTotal');share=e['value']/world*100 if world and world>0 else 0
   if share>=1:body+=f' That is about {share:.1f}% of the reported world total.'
   body+=' This measures production, not where a particular item in your shopping basket was sourced.'
   question=f'Which country ranked #{rank} for {label.lower()} production in {year}?'
  elif item['category']=='Metals & Minerals':
   period=f'Estimated {year} output' if item['group']=='Production' else 'Estimated recoverable deposits in the 2026 reference'
   body=f'{name}: {v} {unit} for {label.lower()} — #{rank} among the countries reported in this dataset. {period}. '+item['note']
   question=f'Which country was #{rank} for {label.lower()} in the {year} dataset?'
  else:
   body=f'For {label.lower()}, {name} recorded {v} {unit} in {year} — #{rank} among the countries reported in this dataset. '+item['note']
   question=f'Which country was #{rank} for {label.lower()} in the {year} dataset?'
  add(f'data-{item["id"]}-{code}',label+' · '+name,body,cat,[code],item['source'],'data',year,item['sourceLabel'],question,item['id'],[x['code'] for x in item['entries'] if x['rank']==rank and x['code']!=code])
# Everyday hooks use checked world totals. They do not claim an individual chocolate bar's provenance.
for topic,title,hook in [('cocoa','Your chocolate has a geography.','The cocoa in chocolate starts as a tropical crop.'),('coffee','Before the café, there is a country.','Coffee has a geography long before it reaches a cup.'),('pistachios','The map behind a handful of pistachios.','Pistachio orchards are far from evenly spread around the world.'),('avocados','A geography lesson on toast.','Avocados connect a familiar ingredient to a concentrated growing region.'),('hazelnuts','The country behind the crunch.','Hazelnuts have a surprisingly concentrated production map.')]:
 item=next((i for i in records['items'] if i['id']==topic),None)
 if not item:continue
 e=item['entries'][0];name=details[e['code']]['name'];share=e['value']/item['worldTotal']*100 if item.get('worldTotal') else None
 body=f'{hook} {name} was the largest producer in the {item["year"]} FAO data'+(f', growing about {share:.0f}% of the world total.' if share else '.')+' That makes it a useful place to remember, but a production ranking cannot tell you where a specific brand buys its ingredients.'
 add('everyday-'+topic,title,body,'Food & drink',[e['code']],item['source'],year=item['year'],sourceLabel=item['sourceLabel'],question=f'Which country was the largest producer of {item["label"].lower()} in {item["year"]}?',topic=topic)
# Give the first visit a hand-picked entry, then let the app mix stories and data.
facts.sort(key=lambda f:(f['id']!='everyday-cocoa',f['id']))
assert len(facts)>2500,len(facts)
assert len({f['id'] for f in facts})==len(facts)
(D/'fun-facts.json').write_text(json.dumps({'checked':'2026-10-21','facts':facts,'counts':dict(collections.Counter(f['kind'] for f in facts))},ensure_ascii=False,separators=(',',':'))+'\n')
print('Built',len(facts),'distinct cards:',collections.Counter(f['kind'] for f in facts))
