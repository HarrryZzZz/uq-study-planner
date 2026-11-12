import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,addCourse,checkAddition} from '../src/elective-plan.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {getReference} from '../src/reference-data.js';
import {readFileSync} from 'node:fs';

const selection={id:'advertising',duration:'2',year:2026,intake:1};
const reference={semesters:[['FINM7409','MGTS7608','MGTS7610','ADVT7508'],['MGTS7301','?广告专业方向课程','?选修课程','?选修课程'],['?广告专业方向课程','?选修课程','?选修课程','?选修课程'],['ADVT7506','MGTS7621','?选修课程','?选修课程']]};
const course=(code,categories=[],extra={})=>({code,name:code,units:2,categories,incompatible:'Not listed on the viewed page',prerequisite:'Not listed on the viewed page',offerings:{'2026':[1,2]},...extra});
const major=course('ADVT7507',['Advertising Elective Courses']);
const other=course('ECON7000');
const conflict=course('ADVT7509',['Advertising Elective Courses'],{incompatible:'MGTS7301'});
const wrongTerm=course('ADVT7511',['Advertising Elective Courses'],{offerings:{'2024':[1],'2025':[1],'2026':[1]}});

test('guided suggestions retain conflicts, wrong-term and selected courses as unavailable at the end',()=>{
 const draft=createDraft(selection,reference),catalogue=[other,major,conflict,wrongTerm];
 const options=guidedCandidates(draft,1,catalogue);
 assert.equal(options[0].course.code,major.code);
 assert.equal(options.find(x=>x.course.code===conflict.code).allowed,false);
 assert.match(options.find(x=>x.course.code===conflict.code).reason,/不兼容/);
 assert.equal(options.find(x=>x.course.code===wrongTerm.code).allowed,false);
 assert.match(options.find(x=>x.course.code===wrongTerm.code).reason,/开课/);
 const next=addCourse(draft,1,major,catalogue);
 const result=guidedCandidates(next,2,catalogue);
 assert.equal(result.at(-1).course.code,major.code);
 assert.equal(result.at(-1).selected,true);
 assert.equal(result.at(-1).allowed,false);
 assert.equal(draft.semesters[1].slots.some(x=>x.course),false);
});
test('a named major-only position does not accept unrelated general electives',()=>{
 const d=createDraft(selection,{semesters:[['?广告专业方向课程']]});
 assert.equal(checkAddition(d,0,other,[other]).allowed,false);
 assert.equal(checkAddition(d,0,major,[major]).allowed,true);
});
test('Information Systems no-exam preference surfaces BISM7208 while flagging prerequisites for review',()=>{
 const selection={id:'is',duration:'2',year:2026,intake:1,preference:'no_exam'};
 const d=createDraft(selection,getReference('is',1));
 const courses=JSON.parse(readFileSync(new URL('../src/data/electives.json',import.meta.url),'utf8')).courses;
 const assessments=JSON.parse(readFileSync(new URL('../src/data/assessments.json',import.meta.url),'utf8')).records;
 const result=guidedCandidates(d,1,courses,assessments);
 assert.equal(result[0].course.code,'BISM7208');
 assert.equal(result[0].preference,true);
 assert.equal(result[0].needsReview,true);
 assert.equal(result[0].allowed,true);
 assert.equal(result[0].category.key,'major-elective');
});
test('academic category and offering evidence rank ahead of preferences, and blocked choices remain visible',()=>{
 const d=createDraft({...selection,preference:'presentation'},{semesters:[['TEST7001'],['?选修课程','?选修课程']]});
 const core=course('MGTS7610'),required=course('ADVT7508',['Advertising Compulsory Courses']);
 const elective=course('ADVT7509',['Advertising Elective Courses']);
 const project=course('RBUS6901',['MBus Research Courses']);
 const general=course('ECON7000');
 const closed=course('ADVT7511',['Advertising Elective Courses'],{offerings:{2024:[1],2025:[1],2026:[1]}});
 const records=Object.fromEntries([required,elective,general,closed].map(c=>[c.code,{tasks:[{category:'Presentation'}]}]));
 const result=guidedCandidates(d,1,[general,elective,closed,required,core,project],records);
 assert.deepEqual(result.map(x=>x.course.code),['MGTS7610','ADVT7508','ADVT7509','RBUS6901','ECON7000','ADVT7511']);
 assert.equal(result.at(-1).allowed,false);
 assert.match(result.at(-1).reason,/开课/);
});
