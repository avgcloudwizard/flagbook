"""Build the locally served learning guide from public, attributed snapshots.
Inputs: /tmp/flag-countries-source.json, /tmp/flag-population.json,
/tmp/flagbook-factbook and /tmp/flagbook-matches.json (see data/SOURCES.md).
"""
import json, re, html, pathlib, unicodedata
ROOT=pathlib.Path(__file__).resolve().parents[1]
COUNTRIES=json.loads((ROOT/'countries.js').read_text().removeprefix('export const COUNTRIES = ').rstrip(';\n'))
source={c['cca2'].lower():c for c in json.load(open('/tmp/flag-countries-source.json'))}
match=json.load(open('/tmp/flagbook-matches.json'))
for c,p in {'ae':'middle-east/ae','bs':'central-america-n-caribbean/bf','cf':'africa/ct','ci':'africa/iv','cv':'africa/cv','do':'central-america-n-caribbean/dr','fm':'australia-oceania/fm','gm':'africa/ga','tr':'middle-east/tu','va':'europe/vt'}.items():match[c]='/tmp/flagbook-factbook/'+p+'.json'
WB=json.load(open('/tmp/flag-population.json'))
pops={}
for row in WB[1]:
 if row['value'] is not None and row['countryiso3code'] not in pops:pops[row['countryiso3code']]=row

def plain(value):
 if isinstance(value,dict):value=value.get('text','')
 value=html.unescape(str(value or ''))
 return re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',value)).strip()
def sentence(text,limit=390):
 text=plain(text)
 if len(text)>limit:
  parts=re.split(r'; |(?<=[.!?]) (?=[A-Z])',text);keep=[]
  for part in parts:
   if keep and len('; '.join(keep+[part]))>limit:break
   keep.append(part)
  text='; '.join(keep)
 return text[:1].upper()+text[1:]
def ascii_name(s):return ''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)!='Mn')
CAPS={
'lk':(['Sri Jayewardenepura Kotte','Colombo'],'Sri Jayewardenepura Kotte is the administrative and legislative capital; Colombo is the commercial capital.'),
'bo':(['Sucre','La Paz'],'Sucre is the constitutional capital; La Paz is the seat of government.'),
'za':(['Pretoria','Cape Town','Bloemfontein'],'Pretoria is the administrative capital, Cape Town the legislative capital and Bloemfontein the traditional judicial capital.'),
'sz':(['Mbabane','Lobamba'],'Mbabane is the administrative capital; Lobamba is the royal and legislative capital.'),
'nr':(['Yaren'],'Nauru has no official capital. Government offices are in the Yaren district.'),
'ps':(['East Jerusalem','Ramallah'],'East Jerusalem is the claimed capital; Ramallah is the administrative centre. Jerusalem’s status is disputed.'),
'il':(['Jerusalem'],'Jerusalem is the seat of government and designated capital. Its status and boundaries are disputed internationally.'),
'bi':(['Gitega'],'Gitega is the political capital; Bujumbura is the commercial capital.'),
'my':(['Kuala Lumpur','Putrajaya'],'Kuala Lumpur is the national capital; Putrajaya is the federal administrative centre.'),
'bj':(['Porto-Novo','Cotonou'],'Porto-Novo is the constitutional capital; Cotonou is the seat of government.'),
'nl':(['Amsterdam','The Hague'],'Amsterdam is the constitutional capital; The Hague is the seat of government.'),
'ci':(['Yamoussoukro','Abidjan'],'Yamoussoukro is the political capital; Abidjan remains a major administrative and economic centre.'),
'ch':(['Bern'],'Bern is the federal city and seat of government; Switzerland has no formally designated capital.'),
'mm':(['Naypyidaw'],'Naypyidaw is the administrative capital. Yangon is the former capital.'),
'gq':(['Ciudad de la Paz'],'Ciudad de la Paz became the capital on 2 January 2026, replacing Malabo.'),
'id':(['Jakarta'],'Jakarta remains the working capital during the transition. Nusantara is being developed as the future political capital, targeted for 2028.'),
'ki':(['South Tarawa'],'The capital occupies the South Tarawa part of the Tarawa atoll.'),
'mn':(['Ulaanbaatar'],''),'sm':(['San Marino'],''),'us':(['Washington, D.C.'],''),'va':(['Vatican City'],'Vatican City is a city-state enclosed by Rome.')}
ALIASES={'lk':['Sri Jayawardenepura Kotte','Sri Jayawardanapura Kotte','Sri Jayewardenepura','Kotte'],'us':['Washington DC','Washington D.C.','Washington, DC','Washington'],'gd':["Saint George's", "St. George's"],'kn':['Basseterre'],'mm':['Nay Pyi Taw','Nay Pyi Daw'],'mn':['Ulan Bator'],'ki':['Tarawa'],'tl':['Dili'],'ua':['Kiev'],'kz':['Astana'],'bn':['Bandar Seri Begawan'],'sm':['City of San Marino'],'va':['Vatican City','Vatican'],'ye':['Sanaa',"Sana'a"],'az':['Baku','Baki'],'md':['Chisinau','Chișinău'],'gq':['Ciudad de la Paz','Djibloho']}
result={}
for country in COUNTRIES:
 code=country['code'];s=source[code];x=json.load(open(match[code])) if code in match else {};g=x.get('Government',{});geo=x.get('Geography',{})
 capitals,note=CAPS.get(code,(s['capital'],''))
 aliases=list(dict.fromkeys(capitals+[ascii_name(c) for c in capitals]+ALIASES.get(code,[])))
 flag=g.get('Flag',g.get('Flag description',{}));flagtext=plain(flag)
 flag_note=plain(flag.get('note','')) if isinstance(flag,dict) else ''
 # Turn the public-domain source's headings into short, readable paragraphs.
 flagparts=[p.strip() for p in re.split(r'(?i)(?:description|meaning|history):\s*',flagtext) if p.strip()]
 flagparts=[p[:1].upper()+p[1:] for p in flagparts]
 pop=pops.get(s['cca3']);population={'value':pop['value'],'year':pop['date'],'source':'World Bank','url':'https://data.worldbank.org/indicator/SP.POP.TOTL?locations='+s['cca2']} if pop else None
 if code=='va':population={'value':882,'year':'2024','source':'Vatican City State','url':'https://www.vaticanstate.va/en/state-and-government/general-informations/population.html'}
 if not population:raise ValueError('Population missing '+code)
 facts=[]
 candidates=[('Behind the name',g.get('Country name',{}).get('etymology')),('A geographical surprise',geo.get('Geography - note')),('National symbols',g.get('National symbol(s)')),('A musical connection',g.get('National anthem(s)',{}).get('history'))]
 for title,value in candidates:
  if value and plain(value).lower() not in ['none','na']:
   text=sentence(value)
   if len(text)<=650:facts.append({'title':title,'text':text})
  if len(facts)==3:break
 if len(facts)<3:facts.append({'title':'On the map','text':f"{'A landlocked country' if s['landlocked'] else 'A country with access to the sea'} in {s['subregion'] or s['region']}."})
 if len(facts)<3:facts.append({'title':'Words to listen for','text':'Languages include '+', '.join(s['languages'].values())+'.'})
 currencies=[{'code':key,'name':val['name']} for key,val in s['currencies'].items()]
 if code=='fm':currencies=[{'code':'USD','name':'United States dollar'}]
 if code=='cu':currencies=[{'code':'CUP','name':'Cuban peso'}]
 if code=='zw':currencies=[{'code':'ZWG','name':'Zimbabwe Gold (ZiG)'},{'code':'USD','name':'US dollar (also widely used)'}]
 if code=='ps':
  flagparts=['Three horizontal stripes of black, white and green meet a red triangle at the hoist. These four colours are shared with several other Arab flags.','A useful visual clue: unlike Jordan’s otherwise similar design, Palestine’s red triangle has no white star.']
  facts=[{'title':'Two separate areas','text':'The West Bank and Gaza Strip are geographically separate. The West Bank lies east of Israel; Gaza is on the Mediterranean coast.'},{'title':'Below sea level','text':'The West Bank borders the Dead Sea, whose shoreline lies hundreds of metres below sea level.'},{'title':'Words to listen for','text':'Arabic is the official language. The country name in Arabic is Filasṭīn.'}]
  currencies=[{'code':'ILS','name':'Israeli new shekel'},{'code':'JOD','name':'Jordanian dinar'},{'code':'USD','name':'US dollar'}]
  note+=' The listed currencies circulate locally; there is no separate Palestinian national currency.'
 if code=='af':flag_note='The quiz shows Afghanistan’s 2004 black-red-green tricolour, as retained in this Factbook source. The Taliban authorities use a different white flag.'
 if not flagparts:raise ValueError('Flag story missing '+code)
 path=pathlib.Path(match[code]).relative_to('/tmp/flagbook-factbook').as_posix() if code in match else 'middle-east/we.json'
 result[code]={'name':country['name'],'numeric':s['ccn3'],'region':s['subregion'] or s['region'],'coordinates':s['latlng'],'area':s['area'],'capitals':capitals,'capitalAnswers':aliases,'capitalNote':note,'population':population,'currencies':currencies,'flagStory':flagparts,'flagNote':flag_note,'facts':facts[:3],'source':'https://github.com/factbook/factbook.json/blob/144d6977b2b01ac1cbd220de754c0a005616760b/'+path,'updated':'2026-09-28'}
 if len(result[code]['facts'])!=3:raise ValueError('Facts missing '+code)
result['fm']['extraSource']='https://bankingboard.gov.fm/overview.htm'
result['ps']['extraSource']='https://www.pma.ps/'
result['gq']['extraSource']='https://www.guineaecuatorialpress.com/noticias/decreto_ley_por_el_que_se_declara_la_ciudad_de_la_paz_djibloho_capital_de_la_republica_de_guinea_ecuatorial'
result['lk']['extraSource']='https://www.emb-seoul.gov.lk/en/srilanka-at-glance'
result['id']['extraSource']='https://ikn.go.id/id/posts/perpres-nomor-79-tahun-2025-pertegas-kepastian-kelanjutan-dan-penyelesaian-ibu-kota-nusantara'
result['bg']['extraSource']='https://economy-finance.ec.europa.eu/euro/eu-countries-and-euro/bulgaria-and-euro_en'
result['zw']['extraSource']='https://www.rbz.co.zw/documents/ar/Reserve%20Bank%20of%20Zimbabwe_2025%20_Annual%20Report.pdf'
(ROOT/'data/country-details.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('Built',len(result),'country profiles;',sum(len(x['facts']) for x in result.values()),'facts.')
