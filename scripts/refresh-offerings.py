#!/usr/bin/env python3
"""Refresh catalogue offerings from individual official UQ course pages.

The checkpoint preserves failed and successful requests independently, so the
remaining courses can be retried without repeating the entire collection.
"""
import concurrent.futures
import html.parser
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

CATALOGUE = 'src/data/electives.json'
AUDIT = 'outputs/uq_general_electives/offering-audit.json'

class CoursePage(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ''
        self.table = None
        self.anchor = False
        self.anchor_text = ''
        self.offerings = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id') == 'course-title': self.in_title = True
        if tag == 'table' and attrs.get('id') in ('course-current-offerings', 'course-archived-offerings'):
            self.table = attrs['id']
        if self.table and tag == 'a' and 'course-offering-year' in attrs.get('class', '').split():
            self.anchor = True
            self.anchor_text = ''

    def handle_endtag(self, tag):
        if tag == 'h1' and self.in_title: self.in_title = False
        if tag == 'a' and self.anchor:
            match = re.search(r'\bSemester\s+([12]),?\s+(20\d{2})\b', self.anchor_text, re.I)
            if match:
                self.offerings.setdefault(match.group(2), set()).add(int(match.group(1)))
            self.anchor = False
        if tag == 'table' and self.table: self.table = None

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.anchor: self.anchor_text += data

def get(course):
    code = course['code']
    url = 'https://programs-courses.uq.edu.au/course.html?' + urllib.parse.urlencode({'course_code': code})
    error = ''
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; academic course research)'})
            with urllib.request.urlopen(request, timeout=25) as response:
                body = response.read().decode('utf-8', 'replace')
                final_url = response.geturl()
            page = CoursePage()
            page.feed(body)
            if not re.search(r'\b' + re.escape(code) + r'\b', page.title):
                raise ValueError('Course identity not found on official page')
            return code, {'checked': True, 'url': final_url,
                'checkedAt': datetime.now(timezone.utc).isoformat(),
                'offerings': {year: sorted(terms) for year, terms in sorted(page.offerings.items())}}
        except Exception as exc:
            error = str(exc)
            time.sleep((attempt + 1) * .5)
    return code, {'checked': False, 'url': url, 'error': error,
                  'checkedAt': datetime.now(timezone.utc).isoformat()}

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(path + '.tmp', path)

with open(CATALOGUE, encoding='utf-8') as f: catalogue = json.load(f)
try:
    with open(AUDIT, encoding='utf-8') as f: audit = json.load(f)
except FileNotFoundError:
    audit = {}
if '--merge-only' not in sys.argv:
    pending = [c for c in catalogue['courses'] if not audit.get(c['code'], {}).get('checked')]
    print(f'Total {len(catalogue["courses"])}; remaining {len(pending)}', flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(get, course) for course in pending]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            code, entry = future.result()
            audit[code] = entry
            if index % 40 == 0 or index == len(pending):
                write_json(AUDIT, audit)
                print(f'Processed {index}/{len(pending)}; successful {sum(v["checked"] for v in audit.values())}', flush=True)

# Keep prior search evidence and merge verified detail-page records; a missing
# row does not prove that an offering did not exist.
for course in catalogue['courses']:
    entry = audit.get(course['code'], {})
    if entry.get('checked'):
        for year, terms in entry['offerings'].items():
            course.setdefault('offerings', {})[year] = sorted(set(course.get('offerings', {}).get(year, [])) | set(terms))
    course['offeringPage'] = {'checked': bool(entry.get('checked')), 'url': entry.get('url'), 'checkedAt': entry.get('checkedAt')}
catalogue['offeringPageSource'] = {'description': 'Official individual UQ course current and archived offerings; merged with prior search evidence',
                                  'audit': AUDIT, 'checkedAt': datetime.now(timezone.utc).isoformat()}
write_json(CATALOGUE, catalogue)
print('Catalogue updated.', flush=True)
