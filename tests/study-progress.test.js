import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,addCourse,moveReferenceCourse,checkAddition,projectedCourseCount,foundationRuleWarnings} from '../src/elective-plan.js';
import {completeSemester,overloadEligibility,progressSummary,reopenSemester,semesterUnits,possibleDistributions} from '../src/study-progress.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {getReference} from '../src/reference-data.js';

const selection={id:'is',year:2026,intake:1,duration:'2'};
const reference=getReference('is',1);
const course={code:'TEST7000',name:'Test elective',units:2,incompatible:''};
test('first semester rejects a fifth course and more than eight units',()=>{
 const d=createDraft(selection,reference);
 assert.match(checkAddition(d,0,course,[]).warnings[0],/第一学期/);
 const empty=createDraft(selection,{semesters:[['?选修','?选修','?选修','?选修']]});
 const fourUnit=addCourse(empty,0,{...course,units:4},[]);
 const withSix=addCourse(fourUnit,0,{...course,code:'TEST7002'},[]);
 assert.match(checkAddition(withSix,0,{...course,code:'TEST7003',units:4},[]).warnings[0],/8 学分/);
});
test('distributions enforce first semester four-course cap',()=>{
 assert.ok(!possibleDistributions(4,16).includes('5335'));
 assert.ok(!possibleDistributions(3,12).includes('534'));
 assert.ok(possibleDistributions(3,12).includes('345'));
});
test('planning ten units works regardless of recorded GPA while eligibility stays separate',()=>{
 const base=createDraft(selection,reference);
 const fill=d=>['TEST7001','TEST7002'].reduce((draft,code)=>addCourse(draft,1,{...course,code},[]),d);
 assert.equal(semesterUnits(addCourse(fill(base),1,course,[]).semesters[1]),10);
 const low=completeSemester(base,0,4.49,[]);
 assert.equal(overloadEligibility(low,1).eligible,false);
 assert.equal(semesterUnits(addCourse(fill(low),1,course,[]).semesters[1]),10);
 const qualified=completeSemester(base,0,4.5,[]);
 assert.equal(overloadEligibility(qualified,1).eligible,true);
 assert.equal(semesterUnits(addCourse(fill(qualified),1,course,[]).semesters[1]),10);
});
test('five-course overload borrows only an empty position from the final semester',()=>{
 let d=createDraft(selection,reference);d=completeSemester(d,0,4.5,[]);
 const examples=['TEST7001','TEST7002','TEST7003'].map(code=>({code,name:code,units:2,incompatible:''}));
 for(const c of examples)d=addCourse(d,1,c,[]);
 assert.equal(semesterUnits(d.semesters[1]),10);
 assert.deepEqual(d.semesters.map(projectedCourseCount),[4,5,4,3]);
 assert.equal(checkAddition(d,1,{...course,code:'TEST7009'},[]).allowed,false);
 assert.deepEqual(reference.semesters[2],d.semesters[2].slots.map(s=>s.original));
});
test('consecutive eligible overloads can create a 4-5-5-2 plan without moving other courses',()=>{
 let d=createDraft(selection,reference);d=completeSemester(d,0,4.5,[]);
 for(const code of ['TEST7011','TEST7012','TEST7013'])d=addCourse(d,1,{...course,code},[]);
 d=completeSemester(d,1,5,[]);
 for(const code of ['TEST7021','TEST7022','TEST7023'])d=addCourse(d,2,{...course,code},[]);
 assert.deepEqual(d.semesters.map(projectedCourseCount),[4,5,5,2]);
 assert.equal(d.semesters[1].progress.gpa,5);
 assert.equal(d.semesters[3].slots.some(s=>s.original==='MGTS7621'),true);
});
test('manual course move changes the source and destination only, without swapping placeholders',()=>{
 let d=createDraft(selection,reference);d=completeSemester(d,0,5,[]);
 const moved=moveReferenceCourse(d,3,1,'MGTS7621',[]);
 assert.deepEqual(moved.semesters.map(projectedCourseCount),[4,5,4,3]);
 assert.deepEqual(moved.semesters[2],d.semesters[2]);
 assert.throws(()=>moveReferenceCourse(d,0,1,'MGTS7610',[]),/已记录完成/);
});
test('1.5-year foundation incompatibility uses whole combinations, not either course alone',()=>{
 let d=createDraft({...selection,duration:'1.5'},{semesters:[['?选修','?选修'],['?选修','?选修'],['?选修','?选修']]});
 assert.match(checkAddition(d,0,{...course,code:'MGTS7617'},[]).warnings[0],/冲突/);
 const a={...course,code:'ACCT7101'},b={...course,code:'FINM7401'};
 d=addCourse(d,0,a,[]);
 assert.match(checkAddition(d,0,b,[]).warnings[0],/组合/);
 assert.equal(foundationRuleWarnings(d).length,0);
});
test('completion record survives JSON and can be reopened, without claiming a pass',()=>{
 const d=completeSemester(createDraft(selection,reference),0,4.5,[]);
 const parsed=parseDraft(JSON.stringify(exportDraft(d)),s=>getReference(s.id,s.intake));
 assert.equal(parsed.semesters[0].progress.gpa,4.5);
 assert.deepEqual(parsed.semesters[0].progress.courseCodes,d.semesters[0].progress.courseCodes);
 assert.equal(reopenSemester(parsed,0).semesters[0].progress,undefined);
 assert.throws(()=>completeSemester(createDraft(selection,reference),0,7.1,[]),/0 到 7/);
 const corrupted=exportDraft(d);corrupted.draft.semesters[0].progress.gpa=8;
 assert.throws(()=>parseDraft(JSON.stringify(corrupted),s=>getReference(s.id,s.intake)),/GPA/);
});
