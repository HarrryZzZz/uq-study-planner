import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,addCourse,removeCourse,projectedCourseCount,movePendingSlot,moveReferenceCourse} from '../src/elective-plan.js';
import {getReference} from '../src/reference-data.js';
import {getReference15} from '../src/reference-15.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
const choose=s=>(s.duration==='1.5'?getReference15:getReference)(s.id,s.intake);
const mk=code=>({code,name:code,units:2,categories:[],incompatible:''});
const cfg={id:'is',year:2026,intake:1,duration:'2'};
const count=d=>d.semesters.map(projectedCourseCount);
const selected=(d,i)=>d.semesters[i].slots.filter(x=>x.course).map(x=>x.course.code);
function filled(d){return ['TEST7001','TEST7002'].reduce((x,c)=>addCourse(x,1,mk(c),[]),d)}
test('adding then removing the borrowed fifth course restores last-semester position',()=>{
 const four=filled(createDraft(cfg,choose(cfg))),before=structuredClone(four);
 const five=addCourse(four,1,mk('TEST7003'),[]);
 assert.deepEqual(count(five),[4,5,4,3]);assert.deepEqual(four,before);
 const reopened=parseDraft(JSON.stringify(exportDraft(five)),choose);
 const removed=removeCourse(reopened,1,'TEST7003');
 assert.deepEqual(count(removed),[4,4,4,4]);
 assert.deepEqual(selected(removed,1),['TEST7001','TEST7002']);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(removed)),choose),removed);
});
test('removing another selected course also returns a vacancy while retaining the fifth course',()=>{
 const four=filled(createDraft(cfg,choose(cfg))),five=addCourse(four,1,mk('TEST7003'),[]);
 const removed=removeCourse(five,1,'TEST7001');
 assert.deepEqual(count(removed),[4,4,4,4]);
 assert.deepEqual(selected(removed,1),['TEST7002','TEST7003']);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(removed)),choose),removed);
});
test('editing borrowed position respects a full final semester and supports manual movement',()=>{
 const five=addCourse(filled(createDraft(cfg,choose(cfg))),1,mk('TEST7003'),[]);
 // Fill the origin's remaining capacity by moving an unselected position explicitly.
 let changed=movePendingSlot(five,2,3,five.semesters[2].slots.findIndex(s=>s.original.startsWith('?')));
 changed=moveReferenceCourse(changed,0,3,'MGTS7608',[]);
 const removed=removeCourse(changed,1,'TEST7003');
 assert.equal(removed.semesters[1].slots.some(s=>s.course===null&&s.borrowedFrom),true);
 assert.equal(projectedCourseCount(removed.semesters[3]),5);
});
test('1.5-year plan restores final vacancy after removing fifth course',()=>{
 const s={...cfg,duration:'1.5'},d=createDraft(s,choose(s));
 const two=addCourse(addCourse(d,1,mk('TEST7001'),[]),1,mk('TEST7002'),[]);
 const five=addCourse(two,1,mk('TEST7003'),[]);
 assert.deepEqual(count(five),[4,5,3]);
 const removed=removeCourse(five,1,'TEST7003');
 assert.deepEqual(count(removed),[4,4,4]);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(removed)),choose),removed);
});
test('older plans without provenance are not silently rearranged and can be repaired explicitly',()=>{
 const five=addCourse(filled(createDraft(cfg,choose(cfg))),1,mk('TEST7003'),[]);
 for(const slot of five.semesters[1].slots)delete slot.borrowedFrom;
 const removed=removeCourse(five,1,'TEST7003');
 assert.deepEqual(count(removed),[4,5,4,3]);
 const vacancy=removed.semesters[1].slots.findIndex(s=>s.original.startsWith('?')&&!s.course);
 const fixed=movePendingSlot(removed,1,3,vacancy);
 assert.deepEqual(count(fixed),[4,4,4,4]);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(fixed)),choose),fixed);
});
