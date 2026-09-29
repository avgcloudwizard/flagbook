"""Build sourced geography, writing samples and a dated INR reference snapshot.
Uses the same pinned Factbook and country-name inputs as build-country-details.py.
Refresh rates first with: curl -sSL --fail 'https://api.frankfurter.dev/v2/rates?base=INR' -o /tmp/flagbook-fx
"""
import json,re,html,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
details=json.loads((ROOT/'data/country-details.json').read_text())
source={c['cca2'].lower():c for c in json.load(open('/tmp/flag-countries-source.json'))}
def plain(v):
 if isinstance(v,dict):v=v.get('text','')
 return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',str(v or '')))).strip()
result={}
for code,c in details.items():
 path=c['source'].split('/144d6977b2b01ac1cbd220de754c0a005616760b/')[-1]
 x=json.load(open('/tmp/flagbook-factbook/'+path));g=x.get('Geography',{});s=source[code]
 langs=x.get('People and Society',{}).get('Languages',{})
 languageText=plain(langs.get('Languages',langs));languageNote=plain(langs.get('note',''))
 samples=[]
 for key,native in s['name'].get('native',{}).items():
  samples.append({'language':s.get('languages',{}).get(key,key),'text':native.get('common',native['official']),'meaning':c['name'],'kind':'Country name'})
 samples.sort(key=lambda a:all(ord(ch)<128 for ch in a['text']))
 if not samples:samples=[{'language':'English','text':c['name'],'meaning':c['name'],'kind':'English country name'}]
 transcripts=[]
 sample=langs.get('major-language sample(s)',{})
 sample=sample.get('text','') if isinstance(sample,dict) else str(sample)
 for part in re.split(r'<br\s*/?>|</p>',sample,flags=re.I):
  text=plain(part);m=re.search(r'\(([^()]*)\)\.?$',text)
  if m and len(text)>20 and m[1].lower()!='english':
   transcripts.append({'text':text[:m.start()].strip(),'language':m[1],'meaning':'The World Factbook, the indispensable source for basic information.'})
 raw=plain(g.get('Major rivers (by length in km)'))
 rivers=[]
 for part in raw.split(';'):
  m=re.search(r'(?:-|–)\s*([\d,]+)\s*km',part)
  if m:
   name=re.split(r'\(| - | – ',part[:m.start()])[0].strip()
   name=re.sub(r'\s+river (?:source|mouth)$','',name,flags=re.I)
   rivers.append({'name':name,'length':int(m[1].replace(',','')),'detail':part[:m.end()].strip()})
 rivers.sort(key=lambda r:-r['length'])
 peak=plain(g.get('Elevation',{}).get('highest point'))
 result[code]={'location':plain(g.get('Location')),'languages':list(s.get('languages',{}).values()),'languageText':languageText or 'Arabic (official)' if code=='ps' else languageText,'languageNote':languageNote,'writingSamples':samples,'transcripts':transcripts,'highestPoint':peak,'rivers':rivers,'riverNote':'Lengths are for the whole river or river system, including portions outside this country. The source lists major rivers, not every watercourse.','source':c['source'],'languageSource':c['source'],'namesSource':'https://github.com/mledoze/countries','checked':'2026-09-29'}
# Correct known changes and preserve distinctions between official, national and working languages.
result['in']['languageText']='Hindi in Devanagari script and English are used for the Union government’s official purposes. States designate their own official languages; the Constitution recognises 22 scheduled languages.'
result['in']['languageSource']='https://knowindia.india.gov.in/profile/the-union/official-language.php'
result['ml']['languageText']='The national languages are official under Article 31 of the 2023 Constitution. French is a working language. Widely spoken languages include Bambara, Fulfulde and Songhay.'
result['ml']['languageNote']='Official status is broader than the older language-use census.'
result['ml']['languageSource']='https://www.constituteproject.org/constitution/Mali_2023'
result['ml']['languages']=['Bambara','Fulfulde','Songhay','French']
result['bf']['languageText']='National languages made official by law are the official languages. English and French are working languages under the constitutional revision adopted in December 2023. Widely spoken languages include Mooré, Fulfulde and Dioula.'
result['bf']['languageSource']='https://www.conseil-constitutionnel.gov.bf/'
result['bf']['languages']=['Mooré','Fulfulde','Dioula','French','English']
result['ne']['languageText']='Hausa is the national language under the 2025 Charter of Refoundation. English and French are working languages; the charter also recognises other spoken languages.'
result['ne']['languageNote']='National and working status are distinct from official-language status.'
result['ne']['languages']=['Hausa','Zarma','French','English']
result['ne']['languageSource']='https://information.tv5monde.com/afrique/au-niger-le-haoussa-devient-langue-nationale-le-francais-relegue-langue-de-travail-2769322'
result['ps']['location']='The West Bank, east of Israel, and the Gaza Strip on the Mediterranean coast.'
result['ps']['highestPoint']='Tall Asur, West Bank, 1,022 m'
result['ps']['languageText']='Arabic (official); Hebrew and English are also used.'
result['ps']['languageNote']='The geography entry combines the West Bank and Gaza; the listed high point is in the West Bank.'
# Use the joint 2020 measurement for Everest; avoid conflicting old elevations in prose.
for code in ['np','cn']:result[code]['highestPoint']='Mount Everest (Sagarmatha / Qomolangma), 8,848.86 m, on the Nepal–China border'
result['fr']['highestPoint']='Mont Blanc, about 4,810 m (snow-cap height varies)'
for code,name,length,url in [
 ('gb','Severn',354,'https://environmentagency.blog.gov.uk/2020/07/07/how-we-keep-the-uks-longest-river-topped-up-to-protect-habitats/'),
 ('jp','Shinano (Chikuma–Shinano)',367,'https://www.hrr.mlit.go.jp/shinano/english/basin/basin.html')]:
 result[code]['rivers']=[{'name':name,'length':length,'detail':name,'source':url}]
(ROOT/'data/country-extras.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
rates=json.load(open('/tmp/flagbook-fx'))
fx={'base':'INR','retrieved':'2026-09-29','source':'https://frankfurter.dev/','rates':{r['quote']:{'value':r['rate'],'date':r['date']} for r in rates}}
fx['rates']['INR']={'value':1,'date':max(r['date'] for r in rates)}
# Local coin codes KID/TVD circulate at parity with AUD; keep an explicit source and note.
for code,name in [('KID','Kiribati_dollar'),('TVD','Tuvaluan_dollar')]:fx['rates'][code]={**fx['rates']['AUD'],'note':'Local coins at parity with the Australian dollar.','source':'https://en.wikipedia.org/wiki/'+name}
(ROOT/'data/exchange-rates.json').write_text(json.dumps(fx,separators=(',',':'))+'\n')
print('Built',len(result),'profiles;',sum(bool(c['rivers']) for c in result.values()),'river lists;',sum(bool(c['highestPoint']) for c in result.values()),'high points;',len(fx['rates']),'rates.')
