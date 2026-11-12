import test from 'node:test';import assert from 'node:assert/strict';import {createDraft,checkAddition,addCourse,removeCourse,mentionedCodes,moveReferenceCourse,offeringPattern,offeringCheck,semesterCourseCount} from '../src/elective-plan.js';
const conf={id:'x',year:2026,intake:1,duration:'2'}, ref={semesters:[['ACCT7101','?选修课程','?选修课程','?MGTS7601 或 MGTS7612（二选一）'],['?选修课程']]};
const c={code:'ACCT7804',name:'Accounting',units:2,incompatible:'ACCT1110 or 7101 or 1112',prerequisite:'ACCT7102',status:'Information valid for Semester 1, 2026'};
test('warns about shorthand incompatible course and prerequisite before adding',()=>{const d=createDraft(conf,ref);const v=checkAddition(d,0,c,[c]);assert.ok(v.allowed);assert.ok(v.warnings.some(x=>x.includes('ACCT7101')));assert.ok(!v.warnings.some(x=>x.includes('ACCT7102')));assert.deepEqual(mentionedCodes('ACCT1110 or 7101 or 1112'),['ACCT1110','ACCT7101','ACCT1112'])});
test('adding and removing retains reference courses and restores slots',()=>{const d=createDraft(conf,ref),n=addCourse(d,0,c,[c]);assert.equal(d.semesters[0].slots[1].course,null);assert.equal(n.semesters[0].slots[1].course.code,'ACCT7804');assert.equal(n.semesters[0].slots[0].original,'ACCT7101');assert.equal(checkAddition(n,1,c,[c]).allowed,false);assert.equal(removeCourse(n,0,c.code).semesters[0].slots[1].course,null)});
test('does not fill named alternatives and requires enough matching slots',()=>{const d=createDraft(conf,{semesters:[['?MGTS7601 或 MGTS7612（二选一）'],['?选修课程']]});assert.equal(checkAddition(d,1,{...c,units:4},[c]).allowed,false);const other=createDraft(conf,ref);const n=addCourse(other,0,{...c,units:4},[c]);assert.equal(n.semesters[0].slots.filter(x=>x.course).length,2);assert.equal(n.semesters[0].slots[3].course,null)});
test('reverse incompatibility and restricted 1.5 year courses are checked',()=>{const d=createDraft({...conf,duration:'1.5'},ref);assert.ok(checkAddition(d,0,{...c,incompatible:''},[{code:'ACCT7101',incompatible:'ACCT7804',status:'2026'}]).warnings.some(w=>w.includes('ACCT7101')));assert.equal(checkAddition(d,0,{...c,code:'FINM7409'},[]).allowed,false)});

test('regular S1, S2 and insufficient histories use separate outcomes',()=>{const d=createDraft(conf,ref);const only1={code:'TEST7001',offerings:{'2024':[1],'2025':[1],'2026':[1]}};assert.equal(offeringPattern(only1),'s1');assert.equal(offeringCheck(d,1,only1).allowed,false);assert.equal(offeringCheck(d,0,only1).allowed,true);assert.equal(offeringPattern({offerings:{'2025':[1]}}),'unknown');assert.equal(offeringPattern({offerings:{'2024':[1],'2025':[2]}}),'both')});
test('newly published future offerings override history without changing the historical filter',()=>{const c={code:'TEST7002',offerings:{'2024':[1],'2025':[1],'2026':[1],'2027':[2]}};const d=createDraft({...conf,year:2027},ref);assert.equal(offeringPattern(c),'s1');assert.equal(offeringCheck(d,1,c).allowed,true);assert.equal(offeringPattern({offerings:{'2027':[1,2]}}),'unknown');});
test('moving an existing compulsory course preserves all other slots',()=>{const d=createDraft(conf,ref),c={code:'ACCT7101',offerings:{'2024':[1,2],'2025':[1,2]}};const next=moveReferenceCourse(d,0,1,'ACCT7101',[c]);assert.equal(next.semesters[0].slots.some(x=>x.original==='ACCT7101'),false);assert.equal(next.semesters[1].slots.at(-1).original,'ACCT7101');assert.equal(d.semesters[0].slots[0].original,'ACCT7101');assert.deepEqual(next.semesters[0].slots.map(x=>x.original),ref.semesters[0].slice(1));assert.deepEqual(next.semesters[1].slots.map(x=>x.original),['?选修课程','ACCT7101']);assert.throws(()=>moveReferenceCourse(d,0,1,'ACCT7101',[{code:'ACCT7101',offerings:{'2024':[1],'2025':[1]}}]));});
test('moving an added elective preserves the rest of the plan and respects offering restrictions',()=>{
 const course={code:'TEST7003',name:'Elective',units:2,incompatible:'',offerings:{'2024':[1,2],'2025':[1,2]}};
 const original=createDraft(conf,ref),withCourse=addCourse(original,0,course,[course]);
 const moved=moveReferenceCourse(withCourse,0,1,course.code,[course]);
 assert.equal(moved.semesters[1].slots.filter(x=>x.course?.code===course.code).length,1);
 assert.equal(moved.semesters[0].slots.some(x=>x.course?.code===course.code),false);
 assert.equal(moved.semesters[0].slots.some(x=>x.original==='ACCT7101'),true);
 assert.throws(()=>moveReferenceCourse(withCourse,0,1,course.code,[{...course,offerings:{'2024':[1],'2025':[1]}}]));
});
test('uncertain-credit field can accept one provisional 2-unit course without losing its warning',()=>{
 const r={semesters:[['?信息系统 / 市场营销专业方向课程（学分待核实）']]},d=createDraft({...conf,id:'is-marketing'},r);
 const eligible={...c,incompatible:'',categories:['Marketing Elective Courses']};
 const next=addCourse(d,0,eligible,[]);
 assert.equal(next.semesters[0].slots[0].course.code,c.code);
 assert.match(next.semesters[0].slots[0].original,/学分待核实/);
 assert.equal(checkAddition(d,0,{...eligible,units:4},[]).allowed,false);
 assert.equal(checkAddition(d,0,{...c,categories:[]},[]).allowed,false);
});
test('at most five courses can be added or moved into a semester, counting multi-unit courses once',()=>{
 const r={semesters:[['ACCT7102'],['ACCT7101','TEST7001','TEST7002','TEST7003','TEST7004','?选修']]};
 const d=createDraft(conf,r);
 assert.equal(semesterCourseCount(d.semesters[1]),5);
 assert.match(checkAddition(d,1,{code:'TEST7005',units:2},[]).warnings[0],/最多安排 5 门/);
 assert.throws(()=>moveReferenceCourse(d,0,1,'ACCT7102',[]),/最多安排 5 门/);
 const multi=createDraft(conf,{semesters:[['?选修','?选修']]});
 const withMulti=addCourse(multi,0,{code:'TEST7007',units:4,name:'Four units',incompatible:''},[]);
 assert.equal(semesterCourseCount(withMulti.semesters[0]),1);
});
