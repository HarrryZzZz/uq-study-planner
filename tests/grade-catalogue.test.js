import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,addCourse,removeCourse,checkAddition,moveReferenceCourse,projectedCourseCount} from '../src/elective-plan.js';
import {calculateGrades,completeSemester,overloadEligibility,progressSummary} from '../src/study-progress.js';
import {catalogueCourses} from '../src/catalogue.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {getReference15} from '../src/reference-15.js';

const selection={id:'is',year:2026,intake:1,duration:'1.5'};
const reference=getReference15('is',1);
const fake=code=>({code,name:code,units:2,incompatible:'',categories:[]});
test('a 1.5-year 3-5-4 plan retains all four third-semester positions',()=>{
 let d=createDraft(selection,reference);
 d=moveReferenceCourse(d,0,1,'BISM7202',[]);
 d=addCourse(d,0,fake('TEST7001'),[]);
 d=completeSemester(d,0,{BISM7206:'5',MGTS7610:'5',TEST7001:'5'},[]);
 d=addCourse(d,1,fake('TEST7002'),[]);
 d=addCourse(d,1,fake('TEST7003'),[]);
 for(const code of ['TEST7004','TEST7005','TEST7006'])d=addCourse(d,2,fake(code),[]);
 assert.deepEqual(d.semesters.map(projectedCourseCount),[3,5,4]);
 assert.equal(d.semesters[2].slots.filter(s=>s.course).length,3);
 assert.equal(d.semesters[2].slots.some(s=>s.original==='MGTS7621'),true);
});
test('completing three chosen first-semester courses moves only the unused position to semester two',()=>{
 let d=createDraft(selection,reference);
 const lastBefore=structuredClone(d.semesters[2]);
 d=completeSemester(d,0,{BISM7202:'5',BISM7206:'5',MGTS7610:'5'},[]);
 assert.deepEqual(d.semesters.map(projectedCourseCount),[3,5,4]);
 assert.deepEqual(d.semesters[2],lastBefore);
 for(const code of ['TEST7011','TEST7012','TEST7013'])d=addCourse(d,1,fake(code),[]);
 for(const code of ['TEST7021','TEST7022','TEST7023'])d=addCourse(d,2,fake(code),[]);
 assert.deepEqual(d.semesters.map(projectedCourseCount),[3,5,4]);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(d)),s=>getReference15(s.id,s.intake)),d);
});
test('a named alternative accepts only its listed courses and survives import',()=>{
 const selectionHR={...selection,id:'hr'},ref=getReference15('hr',1);
 let d=createDraft(selectionHR,ref);
 const unrelated=fake('TEST7001');d=addCourse(d,0,unrelated,[]);
 assert.equal(d.semesters[0].slots.find(s=>s.original.includes('MGTS7601')).course,null);
 d=addCourse(d,0,fake('MGTS7601'),[]);
 assert.equal(d.semesters[0].slots.find(s=>s.original.includes('MGTS7601')).course.code,'MGTS7601');
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(d)),s=>getReference15(s.id,s.intake)),d);
});
test('a full five-position semester cannot borrow a sixth from the final semester',()=>{
 const r={semesters:[['TEST7001','TEST7002','TEST7003'],['TEST7011','TEST7012','TEST7013','?MGTS7601 或 MGTS7612（二选一）','?MGTS7601 或 MGTS7612（二选一）'],['TEST7021','?选修','?选修','?选修']]};
 let d=createDraft(selection,r);d=completeSemester(d,0,{TEST7001:'5',TEST7002:'5',TEST7003:'5'},[]);
 const result=checkAddition(d,1,fake('TEST7999'),[]);
 assert.equal(result.allowed,false);assert.equal(projectedCourseCount(d.semesters[2]),4);
});
test('visible catalogue places selected courses after remaining choices',()=>{
 const reference={semesters:[['TEST7001','?选修'],['?选修'],['?选修','?选修']]},catalogue=[fake('TEST7001'),fake('TEST7002'),fake('TEST7003')];
 let d=createDraft(selection,reference);
 assert.deepEqual(catalogueCourses(catalogue,d).map(c=>c.code),['TEST7002','TEST7003','TEST7001']);
 d=addCourse(d,0,catalogue[1],catalogue);
 assert.deepEqual(catalogueCourses(catalogue,d).map(c=>c.code),['TEST7003','TEST7001','TEST7002']);
 d=removeCourse(d,0,'TEST7002');
 assert.deepEqual(catalogueCourses(catalogue,d).map(c=>c.code),['TEST7002','TEST7003','TEST7001']);
});
test('grades use units for GPA, exclude P and treat N as grade 2',()=>{
 const courses=[{code:'TEST7001',units:2},{code:'TEST7002',units:4},{code:'TEST7003',units:2},{code:'TEST7004',units:2}];
 const result=calculateGrades(courses,{TEST7001:'7',TEST7002:'3',TEST7003:'P',TEST7004:'N'});
 assert.equal(result.gpa,30/8);assert.equal(result.gpaUnits,8);assert.equal(result.passedUnits,4);
 assert.equal(calculateGrades([{code:'TEST7003',units:2}],{TEST7003:'P'}).gpa,null);
 assert.throws(()=>calculateGrades(courses,{TEST7001:'4.5'}));
});
test('per-course grades and GPA round-trip, and old GPA-only records remain usable',()=>{
 let d=createDraft(selection,reference);
 const initial=completeSemester(d,0,{BISM7202:'7',BISM7206:'4',MGTS7610:'P'},[]);
 assert.equal(initial.semesters[0].progress.gpa,5.5);
 assert.equal(progressSummary(initial).passedUnits,6);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(initial)),s=>getReference15(s.id,s.intake)),initial);
 const tampered=exportDraft(initial);tampered.draft.semesters[0].progress.grades[0].grade='2';
 assert.throws(()=>parseDraft(JSON.stringify(tampered),s=>getReference15(s.id,s.intake)),/不一致/);
 const legacy=completeSemester(d,0,4.5,[]);assert.equal(overloadEligibility(legacy,1).eligible,true);
 assert.equal(progressSummary(legacy).legacy,true);assert.equal(progressSummary(legacy).mean,null);
});
test('a full-time semester with only P grades has no GPA and cannot establish overload eligibility',()=>{
 const original=createDraft(selection,reference);
 const d=completeSemester(original,0,{BISM7202:'P',BISM7206:'P',MGTS7610:'P'},[]);
 assert.equal(d.semesters[0].progress.gpa,null);
 assert.equal(overloadEligibility(d,1).eligible,false);
 assert.equal(progressSummary(d).passedUnits,6);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(d)),s=>getReference15(s.id,s.intake)),d);
});
test('editing course grades preserves the saved unit snapshot after catalogue updates',()=>{
 const original=createDraft(selection,reference),grades={BISM7202:'7',BISM7206:'4',MGTS7610:'5'};
 const saved=completeSemester(original,0,grades,[]);
 const edited=completeSemester(saved,0,grades,[{code:'BISM7202',units:4}],{replace:true});
 assert.equal(edited.semesters[0].progress.recordedUnits,6);
 assert.equal(edited.semesters[0].progress.gpa,16/3);
});
test('overall recorded GPA weights individual course units across semesters',()=>{
 const d={semesters:[
  {progress:{courseCodes:['TEST7001'],recordedUnits:4,grades:[{code:'TEST7001',units:4,grade:'7'}]}},
  {progress:{courseCodes:['TEST7002','TEST7003'],recordedUnits:4,grades:[{code:'TEST7002',units:2,grade:'4'},{code:'TEST7003',units:2,grade:'P'}]}}
 ]};
 const summary=progressSummary(d);
 assert.equal(summary.mean,6);assert.equal(summary.passedUnits,8);
});
