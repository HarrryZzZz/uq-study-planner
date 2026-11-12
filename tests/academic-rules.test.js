import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseExpression,prerequisiteCheck} from '../src/academic-rules.js';
import {createDraft,checkAddition,addCourse,planIssues,moveReferenceCourse} from '../src/elective-plan.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {getReference} from '../src/reference-data.js';
import {getReference15} from '../src/reference-15.js';
import {completeSemester} from '../src/study-progress.js';
const catalogue=JSON.parse(readFileSync(new URL('../src/data/electives.json',import.meta.url))).courses;
const byCode=code=>catalogue.find(c=>c.code===code);
const s={id:'is',year:2026,intake:1,duration:'2'},resolve=x=>(x.duration==='1.5'?getReference15:getReference)(x.id,x.intake);

test('compound incompatible expressions require the whole combination',()=>{
 const t=byCode('FINM7409').incompatible;
 assert.equal(courseExpression(t,new Set(['ACCT7101'])),false);
 assert.equal(courseExpression(t,new Set(['ACCT7101','FINM7401'])),true);
 assert.equal(courseExpression(t,new Set(['FINM2401'])),true);
 assert.equal(courseExpression('Completion of 16 units in business',new Set()),null);
 const d=createDraft(s,resolve(s));assert.equal(checkAddition(d,1,byCode('ACCT7101'),catalogue).conflicts.length,0);
});
test('exclusive non-business program restriction blocks the real ADPS7300 example',()=>{
 const d=createDraft(s,resolve(s)),c=byCode('ADPS7300'),r=checkAddition(d,1,c,catalogue);
 assert.equal(r.allowed,false);assert.match(r.warnings[0],/指定专业/);
 assert.equal(guidedCandidates(d,1,catalogue).find(x=>x.course.code===c.code).allowed,false);
});
test('OR prerequisites recognise a completed passing alternative; planned or missing remains unverified',()=>{
 const c=byCode('BISM7208');let d=createDraft(s,{semesters:[['BISM7233','MGTS7610','BISM7255'],['?选修课程']]});
 assert.equal(prerequisiteCheck(d,1,c).state,'planned');
 d=completeSemester(d,0,{BISM7233:'5',MGTS7610:'5',BISM7255:'2'},catalogue);
 assert.equal(prerequisiteCheck(d,1,c).state,'satisfied');
 assert.equal(guidedCandidates(d,1,catalogue).find(x=>x.course.code===c.code).needsReview,false);
 const base=createDraft(s,resolve(s)),after=addCourse(base,1,c,catalogue);
 assert.ok(planIssues(after,catalogue).review.some(w=>w.includes('BISM7208')&&w.includes('先修')));
});
test('initial reference offering discrepancies surface as unverified',()=>{
 const x={...s,id:'hr-international',duration:'1.5',intake:2},d=createDraft(x,resolve(x)),r=planIssues(d,catalogue);
 for(const code of ['MGTS7329','MGTS7604','IBUS7306'])assert.ok(r.review.some(w=>w.includes(code)&&w.includes('历史开课')));
 assert.equal(r.invalid.length,0);
});
test('import rejects selected-versus-fixed duplicates and unknown catalogue identifiers',()=>{
 const d=createDraft(s,resolve(s)),file=exportDraft(d),slot=file.draft.semesters[1].slots.find(x=>x.original.startsWith('?'));
 slot.course={code:'BISM7202',name:'Example',units:2};assert.throws(()=>parseDraft(JSON.stringify(file),resolve,catalogue),/重复/);
 slot.course={code:'FAKE7001',name:'Example',units:2};assert.throws(()=>parseDraft(JSON.stringify(file),resolve,catalogue),/不在当前课程资料/);
});
test('capstone and foundation violations change export status while uncertain data stays unverified',()=>{
 const d=createDraft(s,resolve(s)),early=moveReferenceCourse(d,3,1,'MGTS7621',[]);
 assert.equal(exportDraft(early,[],catalogue).validationSnapshot.status,'invalid');
 assert.match(planIssues(early,catalogue).invalid.join(' '),/MGTS7621/);
 const x={...s,duration:'1.5'},bad=createDraft(x,resolve(x));bad.semesters[1].slots.find(x=>x.original.startsWith('?')).course={code:'FINM7409',name:'Example',units:2};
 assert.equal(exportDraft(bad,[],catalogue).validationSnapshot.status,'invalid');
 assert.equal(exportDraft(d,[],catalogue).validationSnapshot.status,'unverified');
});
