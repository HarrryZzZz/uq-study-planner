import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeMajorSelection,resolveMajorReference} from '../src/major-planner.js';
import {courseCategory} from '../src/course-category.js';
import {majorProgress,assignMajor} from '../src/course-progress.js';
import {createDraft,addCourse,removeCourse,moveReferenceCourse,checkAddition,findSlots,foundationRuleWarnings,planIssues,sameSelection} from '../src/elective-plan.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {COMMERCE_EXTRA_COURSES} from '../src/commerce-extra-courses.js';
import {createConfirmationEmail} from '../src/confirmation-email.js';
const catalogue=[...JSON.parse(fs.readFileSync(new URL('../src/data/electives.json',import.meta.url))).courses,...COMMERCE_EXTRA_COURSES];
const course=code=>catalogue.find(c=>c.code===code);
const select=(duration='2',m='finance',n='')=>makeMajorSelection({program:'5584',duration,year:2026,intake:1,preference:'any'},m,n);
const create=s=>createDraft(s,resolveMajorReference(s,catalogue));
const resolver=s=>resolveMajorReference(s,catalogue);

test('Commerce uses the correct 12-unit programme groups and never inherits Business foundation exclusions',()=>{
 const d=create(select('1.5','is'));
 assert.equal(foundationRuleWarnings(d).length,0);
 assert.equal(majorProgress(d,catalogue).groups[0].targetUnits,12);
 assert.equal(majorProgress(d,catalogue).groups[0].plannedUnits,8);
 assert.equal(courseCategory(d.selection,course('BISM7208')).key,'major-required');
 assert.equal(courseCategory(d.selection,course('BISM7213')).key,'major-elective');
 assert.equal(courseCategory(d.selection,course('ACCT7101')).key,'program-required');
 assert.equal(courseCategory(d.selection,course('CYBR7003')).key,'program-elective');
 assert.equal(courseCategory(d.selection,course('FINM7402')).key,'program-elective');
});
test('Finance positions accept field courses but not unrelated electives, including guide recommendations',()=>{
 const d=create(select());
 assert.deepEqual(findSlots(d,1,2,course('FINM7402')),[0]);
 assert.deepEqual(findSlots(d,1,2,course('MKTG7502')),[2]);
 const candidates=guidedCandidates(d,1,catalogue);assert.equal(candidates.find(x=>x.course.code==='FINM7402').category.key,'major-elective');
 const next=addCourse(d,1,course('FINM7402'),catalogue);assert.equal(next.semesters[1].slots[0].course.code,'FINM7402');
 assert.equal(majorProgress(next,catalogue).groups[0].plannedUnits,2);
 const removed=removeCourse(next,1,'FINM7402');assert.equal(removed.semesters[1].slots[0].course,null);
});
test('Commerce JSON round trip keeps program, rule version, courses, status and arrangements',()=>{
 const s=select('2','finance'),d=create(s),next=addCourse(d,1,course('FINM7402'),catalogue),file=exportDraft(next,[],catalogue);
 assert.equal(file.program,'5584');assert.match(file.ruleset.id,/5584/);
 assert.deepEqual(parseDraft(JSON.stringify(file),resolver,catalogue),next);
 file.program='5583';assert.throws(()=>parseDraft(JSON.stringify(file),resolver,catalogue),/不受支持/);
 assert.equal(sameSelection(s,{...s,program:'5583'}),false);
});
test('every supported Commerce example exports and imports with the correct programme rules',()=>{
 for(const [duration,first,second] of [['1.5','finance',''],['1.5','is',''],['1.5','accounting',''],['2','finance',''],['2','is',''],['2','accounting',''],['2','finance','is'],['2','finance','accounting'],['2','is','accounting']]){
  for(const intake of [1,2]){const s=makeMajorSelection({program:'5584',duration,year:2026,intake,preference:'any'},first,second),d=create(s);assert.deepEqual(parseDraft(JSON.stringify(exportDraft(d,[],catalogue)),resolver,catalogue),d)}
 }
});
test('Commerce recognizes conditional IS/accounting ECON7300 substitution and research course approvals',()=>{
 const d=create(select('2','is','accounting'));
 const p=majorProgress(d,catalogue);assert.equal(p.groups[0].targetUnits,12);assert.equal(p.groups[1].targetUnits,12);
 assert.equal(courseCategory(d.selection,course('ECON7300')).key,'major-elective');
 assert.ok(findSlots(d,1,2,course('ECON7300')).length);
 const updated=addCourse(d,1,course('ECON7300'),catalogue);assert.ok(planIssues(updated,catalogue).review.some(x=>x.includes('BISM7216')));
 assert.equal(majorProgress(updated,catalogue).groups[0].plannedUnits,10);
 assert.equal(courseCategory(d.selection,course('ACCT6101')).key,'program-elective');
});
test('outside electives over four units are reported and unknown research restrictions remain visible',()=>{
 let d=create(select());
 for(const [i,code] of [[1,'MKTG7502'],[1,'MKTG7503'],[2,'MKTG7504']]){const c=course(code);assert.ok(c,code);const check=checkAddition(d,i,c,catalogue);if(check.allowed&&!check.conflicts.length)d=addCourse(d,i,c,catalogue);else assert.fail(JSON.stringify(check))}
 assert.ok(planIssues(d,catalogue).invalid.some(x=>x.includes('超过 4 学分')));
});
test('moving and exporting a Commerce course preserves the remaining arrangement',()=>{
 const start=create(select()),added=addCourse(start,1,course('FINM7402'),catalogue),moved=moveReferenceCourse(added,1,2,'FINM7402',catalogue);
 assert.ok(moved.semesters[2].slots.some(s=>s.course?.code==='FINM7402'));
 assert.equal(moved.semesters[0].slots.map(s=>s.original).join(','),added.semesters[0].slots.map(s=>s.original).join(','));
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(moved,[],catalogue)),resolver,catalogue),moved);
});
test('Commerce confirmation email names the correct degree',()=>{
 const text=createConfirmationEmail({name:'Test Student',studentId:'123',program:'5584',courses:{completed:[],current:[],future:[]}});
 assert.match(text,/Master of Commerce/);assert.doesNotMatch(text,/Master of Business/);
});
