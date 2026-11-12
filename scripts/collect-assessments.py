#!/usr/bin/env python3
"""Collect one traceable historical UQ ECP per workbook course.

Use the most recent published profile through 2026, preferring St Lucia,
in-person delivery and semester 2 when comparable. A missing table is unknown.
"""
import concurrent.futures
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import openpyxl
from lxml import html

SOURCE = 'outputs/uq_general_electives/Course basic Info - general electives.xlsx'
AUDIT = 'outputs/uq_general_electives/assessment-audit.json'
UA = 'Mozilla/5.0 (compatible; course research; +https://uq.edu.au/)'

def clean(element):
    return re.sub(r'\s+', ' ', element.text_content()).strip()

def fetch(url):
    request = Request(url, headers={'User-Agent': UA})
    with urlopen(request, timeout=25) as response:
        return html.fromstring(response.read()), response.geturl()

def collect(code):
    checked = datetime.now(timezone.utc).isoformat()
    link = 'https://programs-courses.uq.edu.au/course.html?' + urlencode({'course_code': code})
    result = {'code': code, 'checkedAt': checked, 'coursePage': link}
    try:
        root, _ = fetch(link)
        title = ' '.join(root.xpath('//*[@id="course-title"]//text()'))
        if not re.search(r'\b'+re.escape(code)+r'\b', title, re.I):
            raise ValueError('无法核实课程页面身份')
        candidates = []
        for row in root.xpath('//table[@id="course-current-offerings" or @id="course-archived-offerings"]//tr'):
            period = clean(row.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," course-offering-year ")]')[0]) if row.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," course-offering-year ")]') else ''
            match = re.search(r'\bSemester\s+([12]),?\s+(20\d{2})\b', period, re.I)
            if not match or int(match.group(2)) > 2026:
                continue
            links = row.xpath('.//a[contains(@class,"profile-available")]/@href')
            if not links:
                continue
            loc = row.xpath('.//*[contains(@class,"course-offering-location")]')
            mode = row.xpath('.//*[contains(@class,"course-offering-mode")]')
            campus = clean(loc[0]) if loc else ''
            delivery = clean(mode[0]) if mode else ''
            for url in links:
                if urlparse(url).netloc != 'course-profiles.uq.edu.au' or not urlparse(url).path.startswith('/course-profiles/'):
                    continue
                candidates.append({'url':url, 'year':int(match.group(2)), 'term':int(match.group(1)), 'campus':campus, 'mode':delivery})
        if not candidates:
            return {**result,'status':'未找到 2026 年或以前可公开访问的新版 ECP'}
        candidates.sort(key=lambda c:(c['year'],c['campus']=='St Lucia',c['mode']=='In Person',c['term']),reverse=True)
        errors=[]
        for profile in candidates[:4]:
            try:
                page, final_url = fetch(profile['url'])
                heading=' '.join(page.xpath('//h1//text()'))
                if not re.search(r'\b'+re.escape(code)+r'\b',heading,re.I):
                    raise ValueError('ECP 课程代码不匹配')
                tables=page.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," assessment-summary-table ")]//table')
                if len(tables)!=1:
                    raise ValueError('考核汇总表缺失或结构不明确')
                headings=[clean(x).lower() for x in tables[0].xpath('./thead/tr/th')]
                if headings[:3]!=['category','assessment task','weight']:
                    raise ValueError('考核汇总表列名异常')
                tasks=[]
                for row in tables[0].xpath('./tbody/tr'):
                    cells=row.xpath('./td')
                    if len(cells)<3:
                        raise ValueError('考核项目不完整')
                    title=cells[1].xpath('./a')
                    name=clean(title[0]) if title else clean(cells[1])
                    flags=[clean(x) for x in cells[1].xpath('.//li')]
                    tasks.append({'category':clean(cells[0]),'task':name,'weight':clean(cells[2]),'flags':flags})
                if not tasks or any(not x['category'] or not x['task'] or not x['weight'] for x in tasks):
                    raise ValueError('考核汇总表为空或内容不完整')
                categories='; '.join(dict.fromkeys(x['category'] for x in tasks))
                has_presentation=any(re.search(r'\bpresentation\b',x['category'],re.I) for x in tasks)
                has_exam=any(re.search(r'\bexamination\b|\bexam\b',x['category'],re.I) for x in tasks)
                return {**result,**profile,'url':final_url,'status':'已核对考核汇总表','categories':categories,
                        'hasPresentation':has_presentation,'hasExam':has_exam,'tasks':tasks}
            except Exception as exc:
                errors.append(str(exc)[:120])
        return {**result,'status':'已找到 ECP，但考核表无法核实','profile':candidates[0], 'error':'; '.join(errors)}
    except Exception as exc:
        return {**result,'status':'课程页面读取失败，待重试','error':str(exc)[:180]}

def write(path,data):
    with open(path+'.tmp','w',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,indent=2)
    os.replace(path+'.tmp',path)

workbook=openpyxl.load_workbook(SOURCE,read_only=True,data_only=True)
codes=[]
for sheet in workbook:
    for row in list(sheet.values)[1:]:
        code=row[0] if row else ''
        if isinstance(code,str) and re.fullmatch(r'[A-Z]{4}\d{4}',code) and code not in codes:
            codes.append(code)
try:
    with open(AUDIT,encoding='utf-8') as f:audit=json.load(f)
except FileNotFoundError:audit={}
pending=[code for code in codes if code not in audit or audit[code]['status']=='课程页面读取失败，待重试']
limit=int(sys.argv[1]) if len(sys.argv)>1 else len(pending)
pending=pending[:limit]
print(f'Total {len(codes)} unique courses; processing {len(pending)}',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    futures={pool.submit(collect,code):code for code in pending}
    for n,future in enumerate(concurrent.futures.as_completed(futures),1):
        audit[futures[future]]=future.result()
        if n%25==0 or n==len(pending):
            write(AUDIT,audit)
            good=sum(x.get('status')=='已核对考核汇总表' for x in audit.values())
            print(f'{n}/{len(pending)} processed; {good} verified tables',flush=True)
