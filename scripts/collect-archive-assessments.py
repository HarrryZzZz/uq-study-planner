#!/usr/bin/env python3
"""Supplement missing current ECPs with explicitly dated archived summaries."""
import concurrent.futures, json, os, re
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from lxml import html

PATH='outputs/uq_general_electives/assessment-audit.json'
def clean(el): return re.sub(r'\s+',' ',el.text_content()).strip()
def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; course research)'}),timeout=25) as response:
        return html.fromstring(response.read()),response.geturl()
def collect(old):
    base={**old,'archiveCheckedAt':datetime.now(timezone.utc).isoformat()}
    try:
        root,_=fetch(old['coursePage'])
        title=' '.join(root.xpath('//*[@id="course-title"]//text()'))
        if not re.search(r'\b'+re.escape(old['code'])+r'\b',title,re.I): raise ValueError('课程代码不匹配')
        found=[]
        for row in root.xpath('//table[@id="course-current-offerings" or @id="course-archived-offerings"]//tr'):
            period=row.xpath('.//*[contains(@class,"course-offering-year")]')
            match=re.search(r'\bSemester\s+([12]),?\s+(20\d{2})\b',clean(period[0]),re.I) if period else None
            if not match or not 2020<=int(match.group(2))<=2026:continue
            loc=row.xpath('.//*[contains(@class,"course-offering-location")]')
            mode=row.xpath('.//*[contains(@class,"course-offering-mode")]')
            for url in row.xpath('.//a[contains(@class,"profile-available")]/@href'):
                p=urlparse(url)
                if p.netloc!='archive.course-profiles.uq.edu.au' or not re.fullmatch(r'/student_section_loader/section_1/\d+',p.path):continue
                found.append({'url':url.replace('/section_1/','/section_5/'),'year':int(match.group(2)),'term':int(match.group(1)),'campus':clean(loc[0]) if loc else '', 'mode':clean(mode[0]) if mode else ''})
        found.sort(key=lambda c:(c['year'],c['campus']=='St Lucia',c['mode']=='In Person',c['term']),reverse=True)
        if not found:return {**base,'archiveStatus':'未找到 2020—2026 年公开旧版 ECP'}
        for info in found[:4]:
            try:
                page,url=fetch(info['url'])
                if not re.search(r'\b'+re.escape(old['code'])+r'\b',' '.join(page.xpath('//h1//text()')),re.I):continue
                tables=page.xpath('//h3[contains(normalize-space(.),"5.1 Assessment Summary")]/following::table[1]')
                if len(tables)!=1:continue
                heads=[clean(x).lower() for x in tables[0].xpath('./thead/tr/*')]
                if len(heads)<3 or heads[:3]!=['assessment task','due date','weighting']:continue
                tasks=[]
                for row in tables[0].xpath('./tbody/tr'):
                    cols=row.xpath('./td');types=cols[0].xpath('.//em') if cols else []
                    if len(cols)<3 or not types:raise ValueError('旧版考核类型缺失')
                    category=clean(types[0]);name=clean(cols[0]);name=name[len(category):].strip()
                    weight=clean(cols[2])
                    if not category or not name or not weight:raise ValueError('旧版考核信息不完整')
                    tasks.append({'category':category,'task':name,'weight':weight,'flags':[]})
                if not tasks:continue
                return {**base,**info,'url':url,'status':'已核对考核汇总表','archiveStatus':'已核对历史版本',
                    'categories':'; '.join(dict.fromkeys(t['category'] for t in tasks)),
                    'hasPresentation':any(re.search(r'\bpresentation\b',t['category'],re.I) for t in tasks),
                    'hasExam':any(re.search(r'\bexamination\b|\bexam\b',t['category'],re.I) for t in tasks),'tasks':tasks}
            except Exception:continue
        return {**base,'archiveStatus':'旧版 ECP 考核汇总无法核实'}
    except Exception as exc:return {**base,'archiveStatus':'旧版检索失败','archiveError':str(exc)[:180]}

with open(PATH,encoding='utf-8') as f:audit=json.load(f)
pending=[v for v in audit.values() if v.get('status')!='已核对考核汇总表' and not v.get('archiveStatus')]
print(f'Checking archived profiles for {len(pending)} courses',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for n,result in enumerate(pool.map(collect,pending),1):
        audit[result['code']]=result
        if n%25==0 or n==len(pending):
            with open(PATH+'.tmp','w',encoding='utf-8') as f:json.dump(audit,f,ensure_ascii=False,indent=2)
            os.replace(PATH+'.tmp',PATH)
            print(f'{n}/{len(pending)} checked; {sum(v.get("archiveStatus")=="已核对历史版本" for v in audit.values())} archived summaries recovered',flush=True)
