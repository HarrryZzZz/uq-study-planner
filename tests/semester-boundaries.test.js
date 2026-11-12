import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,checkAddition,moveReferenceCourse,movePendingSlot,projectedCourseCount} from '../src/elective-plan.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {choiceLabel} from '../src/choice-label.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {getReference} from '../src/reference-data.js';
const config={id:'is',year:2026,intake:1,duration:'2'};
const resolve=s=>getReference(s.id,s.intake);
const extra={code:'TEST7001',name:'Test course',units:2,categories:[],incompatible:'',offerings:{2026:[1,2]}};
test('first semester never offers or accepts a fifth course',()=>{
 const draft=createDraft(config,resolve(config)),snapshot=JSON.stringify(draft);
 assert.equal(checkAddition(draft,0,extra,[extra]).allowed,false);
 assert.equal(guidedCandidates(draft,0,[extra])[0].allowed,false);
 assert.equal(JSON.stringify(draft),snapshot);
 assert.throws(()=>moveReferenceCourse(draft,1,0,'BISM7206',[]),/第一学期/);
});
test('moving into a filled set of positions returns a vacancy without moving other courses',()=>{
 let d=createDraft(config,resolve(config));
 d=moveReferenceCourse(d,0,2,'MGTS7610',[]);
 d=movePendingSlot(d,3,0,d.semesters[3].slots.findIndex(s=>s.original.startsWith('?')));
 const moved=moveReferenceCourse(d,1,0,'BISM7206',[]);
 assert.equal(moved.semesters[0].slots.filter(s=>/^\?/.test(s.original)).length,0);
 assert.equal(moved.semesters[1].slots.filter(s=>/^\?/.test(s.original)).length,3);
 assert.deepEqual(moved.semesters.map(projectedCourseCount),[4,4,5,3]);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(moved)),resolve),moved);
});
test('a legacy overloaded first semester can be fixed without deleting its vacancy',()=>{
 let d=createDraft(config,resolve(config));
 const vacancy=d.semesters[3].slots.findIndex(s=>s.original.startsWith('?'));
 d.semesters[0].slots.push(...d.semesters[3].slots.splice(vacancy,1));
 const i=d.semesters[0].slots.findIndex(s=>s.original.startsWith('?'));
 const fixed=movePendingSlot(d,0,3,i);
 assert.deepEqual(fixed.semesters.map(projectedCourseCount),[4,4,4,4]);
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(fixed)),resolve),fixed);
 assert.equal(d.semesters[0].slots.length,5);
});
test('single-major labels omit second-major options without changing source data',()=>{
 const mixed='?专业方向课程 / 选修课程 / 第二专业课程';
 assert.equal(choiceLabel(mixed,config),'专业方向课程 / 选修课程');
 assert.equal(choiceLabel('?第二专业课程 / 选修课程',config),'选修课程');
 assert.equal(choiceLabel(mixed,{...config,id:'is-marketing'}),'专业方向课程 / 选修课程 / 第二专业课程');
 assert.equal(mixed,'?专业方向课程 / 选修课程 / 第二专业课程');
});
