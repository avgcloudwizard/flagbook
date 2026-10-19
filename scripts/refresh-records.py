"""Refresh reviewed online datasets; no browser or quiz state is accessed.
Run from any directory: python3 scripts/refresh-records.py
Downloads cache in .qa/refresh (ignored); committed output includes provenance.
"""
import json,csv,re,subprocess,concurrent.futures,urllib.parse,collections,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'.qa/refresh';CACHE.mkdir(parents=True,exist_ok=True)
TODAY=datetime.date(2026,10,19).isoformat()
def get(url,name):
 p=CACHE/name
 if not p.exists():
  tmp=p.with_suffix(p.suffix+'.part')
  subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','60','--retry','1',url,'-o',str(tmp)],check=True)
  tmp.replace(p)
 return json.loads(p.read_text())
details=json.loads((ROOT/'data/country-details.json').read_text())
cs=get('https://raw.githubusercontent.com/mledoze/countries/master/countries.json','countries.json');by3={c['cca3']:c['cca2'].lower() for c in cs if c['cca2'].lower() in details}
# Version the country-code crosswalk for rebuilds and independent data audits.
(ROOT/'data/editorial/country-iso3.json').write_text(json.dumps(by3,sort_keys=True)+'\n')
items=[];failures=[]
def rank(entries):
 entries.sort(key=lambda e:(-e['value'],e.get('code','')))
 for i,e in enumerate(entries):e['rank']=i+1 if i==0 or e['value']!=entries[i-1]['value'] else entries[i-1]['rank']
 return entries
def add(**i):
 if not i['entries']:return
 if i['year'].isdigit() and int(i['year'])<2022:return
 i['entries']=rank(i['entries']);i['checked']=TODAY;items.append(i)
def food(spec):
 id=spec['indicator'];m=get(f'https://api.ourworldindata.org/v1/indicators/{id}.metadata.json',f'{id}-meta.json');d=get(f'https://api.ourworldindata.org/v1/indicators/{id}.data.json',f'{id}-data.json')
 if m.get('nonRedistributable'):raise ValueError('non-redistributable')
 em={e['id']:by3[e['code']] for e in m['dimensions']['entities']['values'] if e.get('code') in by3}
 years=sorted(set(d['years']),reverse=True);year=next(y for y in years if any(yy==y and ee in em and vv is not None and vv>0 for yy,ee,vv in zip(d['years'],d['entities'],d['values'])))
 allrows=[(em[e],y,v) for e,y,v in zip(d['entities'],d['years'],d['values']) if e in em and v is not None]
 prev={c:v for c,y,v in allrows if y==year-1};worldids={e['id'] for e in m['dimensions']['entities']['values'] if e['name']=='World'}
 world=next((v for e,y,v in zip(d['entities'],d['years'],d['values']) if e in worldids and y==year),None)
 entries=[dict(code=c,value=v,**({'previous':prev[c]} if c in prev else {})) for c,y,v in allrows if y==year and v>0]
 name=spec['label'];cat='Agriculture';group='Crops'
 if any(s in name.lower() for s in ['meat','milk','cheese','eggs','fat,','offal','hides','skins','honey','beeswax','whey']):cat='Food & livestock';group='Animal products'
 if any(s in name.lower() for s in ['cotton','flax','fibre','jute','silk','wool','hemp']):cat='Textiles';group='Fibres & materials'
 elif cat=='Agriculture' and ('oil' in name.lower() or name in ['Wine','Margarine','Molasses','Sugar, raw']):group='Oils & processed food'
 measure=m['name'].split(' |')[0];slug=re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
 aliases={'coffee-green':'coffee','maize-corn':'maize','rice':'rice','wheat':'wheat','sugar-cane':'sugarcane','cotton':'cotton-fao'};slug=aliases.get(slug,slug)
 note=f'{measure}. Annual production; not exports or consumption. '+('Paddy rice before milling. ' if name=='Rice' else '')
 source='https://ourworldindata.org/explorers/global-food?'+urllib.parse.urlencode({'Food':name,'Metric':'Production','Per capita':'false'})
 return dict(id=slug,category=cat,group=group,label=name,measure=measure,unit=m['unit'],year=str(year),art='textiles' if cat=='Textiles' else 'crops',note=note,source=source,sourceLabel='FAOSTAT / Our World in Data',sourceUpdated=m.get('updatedAt','')[:10],coverage=f'{len(entries)} reporting countries in the 195-country learning set; same-year values. World share uses FAO’s full world total where available.',worldTotal=world,indicator=id,entries=entries)
specs=json.loads((ROOT/'data/editorial/food-indicators.json').read_text())
# Cocoa is not exposed in every version of the food explorer; resolve the maintained chart.
cocoa=get('https://ourworldindata.org/grapher/cocoa-bean-production.metadata.json','cocoa-chart.json');specs.append({'label':'Cocoa beans','indicator':next(iter(cocoa['columns'].values()))['owidVariableId']})
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 jobs={pool.submit(food,s):s for s in specs}
 for future in concurrent.futures.as_completed(jobs):
  s=jobs[future]
  try:
   item=future.result()
   if s['label']=='Cocoa beans':item['id']='cocoa';item['source']='https://ourworldindata.org/grapher/cocoa-bean-production'
   add(**item)
  except Exception as e:failures.append({'label':s['label'],'error':str(e)})
print('Food topics:',len(items),'failures:',len(failures),flush=True)
wb=[
 ('gdp','Economy','Economic output (GDP)','NY.GDP.MKTP.CD','US$'),('gdp-person','Economy','GDP per person','NY.GDP.PCAP.CD','US$'),
 ('manufacturing','Industry','Manufacturing value added','NV.IND.MANF.CD','US$'),('services','Services','Services exports','BX.GSR.NFSV.CD','US$'),
 ('goods-exports','Economy','Merchandise exports','TX.VAL.MRCH.CD.WT','US$'),('high-tech','Industry','High-technology exports','TX.VAL.TECH.CD','US$'),
 ('population','People','Population','SP.POP.TOTL','people'),('density','People','Population density','EN.POP.DNST','people / km²'),('urban','People','Urban population share','SP.URB.TOTL.IN.ZS','%'),
 ('life','People','Life expectancy at birth','SP.DYN.LE00.IN','years'),('internet','People','Internet use','IT.NET.USER.ZS','%'),
 ('forest','Environment','Forest area','AG.LND.FRST.K2','km²'),('forest-share','Environment','Forest share of land','AG.LND.FRST.ZS','%'),
 ('farmland','Environment','Agricultural land','AG.LND.AGRI.K2','km²'),('freshwater','Environment','Renewable freshwater resources','ER.H2O.INTR.K3','billion m³'),
 ('air-passengers','Transport','Air passengers carried','IS.AIR.PSGR','passengers'),('air-freight','Transport','Air freight','IS.AIR.GOOD.MT.K1','million tonne-km'),
 ('containers','Transport','Container port traffic','IS.SHP.GOOD.TU','TEU'),('rail','Transport','Railway network','IS.RRS.TOTL.KM','km'),
 ('fish','Food & livestock','Fish production','ER.FSH.PROD.MT','tonnes'),('aquaculture','Food & livestock','Aquaculture production','ER.FSH.AQUA.MT','tonnes'),
 ('tourism','Services','International arrivals','ST.INT.ARVL','arrivals')]
def worldbank(spec):
 id,cat,label,indicator,unit=spec
 d=get(f'https://api.worldbank.org/v2/country/all/indicator/{indicator}?format=json&date=2020:2025&per_page=20000',f'wb-{indicator}.json');rows=[r for r in d[1] if r['countryiso3code'] in by3 and r['value'] is not None and r['value']>=0]
 counts=collections.Counter(r['date'] for r in rows);threshold=min(30,max(counts.values()));year=max(y for y,n in counts.items() if n>=threshold)
 previous={by3[r['countryiso3code']]:r['value'] for r in rows if int(r['date'])==int(year)-1}
 entries=[dict(code=by3[r['countryiso3code']],value=r['value'],**({'previous':previous[by3[r['countryiso3code']]]} if by3[r['countryiso3code']] in previous else {})) for r in rows if r['date']==year and r['value']>0]
 special={'gdp':'Current US dollars, not purchasing-power adjusted.','gdp-person':'Current US dollars per person; an average, not typical household income.','air-passengers':'Passengers carried by registered air carriers, not all arrivals at airports.','containers':'Twenty-foot equivalent units; throughput, not number of physical containers.','life':'Period life expectancy at birth, both sexes; not maximum lifespan.','tourism':'Reported international arrivals. Countries may use different visitor definitions; this is not a universal overnight-tourist league table.','rail':'Route kilometres, not total track length.','freshwater':'Long-term average internal renewable resources; the observation year is a reporting year, not that year’s rainfall.'}
 note=special.get(id,'Absolute annual value under the World Bank indicator definition.')
 return dict(id=id,category=cat,group=cat,label=label,unit=unit,year=year,art='rivers' if cat=='Environment' else 'industry',note=note,source=f'https://data.worldbank.org/indicator/{indicator}',sourceLabel='World Bank · World Development Indicators',sourceUpdated=d[0].get('lastupdated',''),coverage=f'{len(entries)} reporting countries. Latest year with at least 30 reported countries (or the maximum coverage if smaller); no mixing observation years.',entries=entries)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for spec,result in zip(wb,pool.map(lambda s: (worldbank(s) if True else None),wb)):
  add(**result)
# Annual energy series is downloaded from the maintained OWID distribution.
energy=CACHE/'energy.csv'
if not energy.exists():subprocess.run(['curl','-fsSL','--max-time','90','https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv','-o',str(energy)],check=True)
rows=list(csv.DictReader(energy.open()))
for column,label,unit in [('oil_production','Oil production','TWh'),('gas_production','Natural gas production','TWh'),('coal_production','Coal production','TWh'),('solar_electricity','Solar electricity','TWh'),('wind_electricity','Wind electricity','TWh'),('hydro_electricity','Hydroelectricity','TWh'),('nuclear_electricity','Nuclear electricity','TWh'),('biofuel_electricity','Bioenergy electricity','TWh'),('geothermal_electricity','Geothermal electricity','TWh'),('electricity_generation','Electricity generation','TWh'),('renewables_share_elec','Renewables in electricity','%'),('energy_per_capita','Energy use per person','kWh / person')]:
 available=[r for r in rows if r.get('iso_code') in by3 and r.get(column) and int(r['year'])<=2025];counts=collections.Counter(r['year'] for r in available)
 if not counts:continue
 year=max(y for y,n in counts.items() if n>=5);prev={r['iso_code']:float(r[column]) for r in available if int(r['year'])==int(year)-1}
 entries=[dict(code=by3[r['iso_code']],value=float(r[column]),**({'previous':prev[r['iso_code']]} if r['iso_code'] in prev else {})) for r in available if r['year']==year and float(r[column])>0]
 add(id={'oil_production':'oil','gas_production':'gas'}.get(column,column.replace('_','-')),category='Energy',group='Energy',label=label,unit=unit,year=year,art='industry',note='Energy quantities, not fuel weight or volume. '+('Share of electricity generation from renewable sources.' if unit=='%' else 'Generation is electricity output; production is fuel energy content.'),source='https://github.com/owid/energy-data',sourceLabel='Our World in Data · Energy Institute / Ember / EIA',coverage=f'{len(entries)} same-year reporting countries. Latest available year with at least five reporting countries; source coverage varies.',entries=entries)
# The maintained Grapher series has a newer fossil-fuel release than energy-data CSV.
for fuel,topic in [('oil','oil'),('gas','gas'),('coal','coal-production')]:
 source=f'https://ourworldindata.org/grapher/fossil-fuels?fuel={fuel}&metric=production&per_capita=total'
 meta=get(source.replace('fossil-fuels?','fossil-fuels.metadata.json?'),f'fossil-{fuel}-meta.json');col=next(iter(meta['columns'].values()));indicator=col['owidVariableId']
 m=get(f'https://api.ourworldindata.org/v1/indicators/{indicator}.metadata.json',f'{indicator}-meta.json');d=get(f'https://api.ourworldindata.org/v1/indicators/{indicator}.data.json',f'{indicator}-data.json')
 em={e['id']:by3[e['code']] for e in m['dimensions']['entities']['values'] if e.get('code') in by3};year=max(y for e,y,v in zip(d['entities'],d['years'],d['values']) if e in em and v is not None)
 previous={em[e]:v for e,y,v in zip(d['entities'],d['years'],d['values']) if e in em and y==year-1 and v is not None}
 entry=[dict(code=em[e],value=v,**({'previous':previous[em[e]]} if em[e] in previous else {})) for e,y,v in zip(d['entities'],d['years'],d['values']) if e in em and y==year and v is not None and v>0]
 item=next(i for i in items if i['id']==topic);item.update(year=str(year),entries=rank(entry),source=source,sourceLabel=meta['chart']['citation'],sourceUpdated=col['lastUpdated'],note=meta['chart']['subtitle'],coverage=f'{len(entry)} same-year reporting countries from the newer OWID fossil-fuel release; no regional aggregates.')
for item in json.loads((ROOT/'data/editorial/records-reference.json').read_text()):add(**{k:v for k,v in item.items() if k!='checked'})
# Highest points and land area are geographical references, not annual estimates.
extras=json.loads((ROOT/'data/country-extras.json').read_text())
for id,label,unit,entries,note in [
 ('country-area','Largest countries by area','km²',[{'code':c,'value':v['area']} for c,v in details.items()],'Total area in the bundled country reference. Border and inland-water conventions vary.'),
 ('country-peaks','Highest point in each country','m',[{'code':c,'value':float(re.search(r'([\d,]+(?:\.\d+)?)\s*m\b',x['highestPoint'])[1].replace(',','')),'name':x['highestPoint']} for c,x in extras.items() if re.search(r'([\d,]+(?:\.\d+)?)\s*m\b',x['highestPoint'])],'Each country’s highest point under the reference’s geographic convention. Shared summits can appear more than once.')]:
 add(id=id,category='Nature',group='Geography',label=label,unit=unit,year='Geographic reference',art='mountains',note=note,source='https://github.com/mledoze/countries' if id=='country-area' else 'https://github.com/factbook/factbook.json',sourceLabel='mledoze country area reference' if id=='country-area' else 'World Factbook country references',coverage='Countries in the 195-country learning set; not a ranking of sovereign territorial claims.',entries=entries)
# Further geographic comparisons from the pinned, committed reference.
import html
geo=json.loads((ROOT/'data/editorial/geography-notes.json').read_text())
def plain(v):
 if isinstance(v,dict):v=v.get('text','')
 return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',str(v or '')))).strip()
for id,label,field,sub,unit,note in [
 ('coastlines','Longest coastlines','Coastline',None,'km','Coastline lengths depend on map scale and measurement method. These are reference estimates, not exact comparable survey lengths.'),
 ('borders','Longest land borders','Land boundaries','total','km','Combined length of a country’s land boundaries, under the source’s territorial convention.'),
 ('mean-elevation','Highest average elevation','Elevation','mean elevation','m','Mean elevation of the land, not the highest mountain or the altitude of the capital.'),
 ('inland-water','Largest inland-water area','Area','water','km²','Inland water within the total-area reference; not territorial seas.')]:
 entries=[]
 for code,c in geo.items():
  v=c['geography'].get(field,{})
  if sub:v=v.get(sub,{})
  m=re.match(r'([\d,]+(?:\.\d+)?)',plain(v))
  if m and float(m[1].replace(',',''))>0:entries.append({'code':code,'value':float(m[1].replace(',','')),'source':c['source']})
 add(id=id,category='Nature',group='Geography',label=label,unit=unit,year='Geographic reference',art='rivers' if id in ['coastlines','inland-water'] else 'mountains',note=note,source='https://github.com/factbook/factbook.json',sourceLabel='World Factbook geographic reference',coverage=f'{len(entries)} countries with a reported value. Geography is not an annual time series.',entries=entries)
lakes=[('Caspian Sea',374000,['az','ir','kz','ru','tm']),('Lake Superior',82100,['ca','us']),('Lake Victoria',62940,['ke','tz','ug']),('Lake Huron',59600,['ca','us']),('Lake Michigan',57750,['us']),('Lake Tanganyika',32000,['bi','cd','tz','zm']),('Lake Baikal',31500,['ru']),('Great Bear Lake',31328,['ca']),('Great Slave Lake',28568,['ca']),('Lake Malawi',22490,['mw','mz','tz'])]
add(id='lakes',category='Nature',group='Geography',label='Largest natural lakes',unit='km²',year='Geographic reference',art='rivers',note='Surface area, not volume. The Caspian Sea is saline. Huron and Michigan are separated here; hydraulically they form one lake. Areas vary seasonally.',source='https://github.com/factbook/factbook.json/blob/144d6977b2b01ac1cbd220de754c0a005616760b/world/xx.json',sourceLabel='World Factbook · world geography',coverage='Ten named natural lakes in the source; reservoirs excluded.',entries=[{'name':n,'value':v,'countries':cs} for n,v,cs in lakes])

items.sort(key=lambda i:(i['category'],i['label']))
assert len({i['id'] for i in items})==len(items),'duplicate topic IDs'
assert len(items)>180,(len(items),failures)
(ROOT/'data/world-records.json').write_text(json.dumps({'checked':TODAY,'items':items,'refreshFailures':failures},ensure_ascii=False,separators=(',',':'))+'\n')
print('Wrote',len(items),'topics;',sum(len(i['entries']) for i in items),'country observations; years',collections.Counter(i['year'] for i in items),flush=True)
if failures:print('Skipped:',failures)
