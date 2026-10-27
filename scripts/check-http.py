#!/usr/bin/env python3
import concurrent.futures,json,os,re,urllib.request,urllib.error,xml.etree.ElementTree as ET
from pathlib import Path
base=os.environ.get('BASE_URL','https://www.minoxidilencdmx.com').rstrip('/')
xml=ET.parse('dist/sitemap.xml');urls=[u.text for u in xml.findall('.//{*}loc')]
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a):return None
opener=urllib.request.build_opener(NoRedirect)
def fetch(path):
 try:r=opener.open(base+path,timeout=25)
 except urllib.error.HTTPError as e:r=e
 return r.status,dict(r.headers),r.read().decode(errors='replace')
def check(url):
 path=urllib.request.urlparse(url).path if hasattr(urllib.request,'urlparse') else __import__('urllib.parse',fromlist=['urlparse']).urlparse(url).path
 try:
  status,headers,html=fetch(path);canonical=re.findall(r'<link rel="canonical" href="([^"]+)"',html)
  passed=status==200 and canonical==[url] and html.count('<h1')==1 and 'cdmx-20261027-03' in html
  return dict(path=path,status=status,canonical=canonical,passed=passed)
 except Exception as e:return dict(path=path,passed=False,error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(check,urls))
for path,expected in [('/no-sabes-como-aplicarte-el-minoxidil-checa-aqui-las-instrucciones-en-video/',301),('/ruta-no-existente-cdmx-test/',404),('/robots.txt',200),('/sitemap.xml',200),('/assets/site.css',200),('/assets/site.js',200),('/icon.svg',200),('/43-2/',301),('/47-2/',301)]:
 status,headers,html=fetch(path);results.append(dict(path=path,status=status,location=headers.get('Location'),passed=status==expected))
report=dict(base=base,total=len(results),passed=sum(bool(r['passed']) for r in results),results=results)
Path('artifacts/http-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='results'}));print('failures',[r for r in results if not r['passed']]);raise SystemExit(any(not r['passed'] for r in results))
