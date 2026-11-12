import test from 'node:test';
import assert from 'node:assert/strict';
import {assessmentTags,preferenceMatch,validPreference,assessmentMatches} from '../src/assessment.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {createDraft} from '../src/elective-plan.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';

const record={year:2026,term:2,tasks:[
 {category:'Examination',task:'In-Semester Exam',weight:'30%',flags:[]},
 {category:'Examination',task:'Final Exam',weight:'40%',flags:[]},
 {category:'Presentation',task:'Team pitch',weight:'30%',flags:['Team or group-based']},
]};
test('assessment tags distinguish exam timing and use official category and group evidence',()=>{
 assert.deepEqual(assessmentTags(record),['期中','期末','考试','演讲','团队']);
 assert.deepEqual(assessmentTags({tasks:[{category:'Quiz',task:'Final quiz',weight:'10%',flags:[]}]}),['小测']);
 assert.deepEqual(assessmentTags(undefined),[]);
 assert.equal(preferenceMatch('no_exam',undefined),false);
 assert.equal(preferenceMatch('no_exam',{tasks:[{category:'Quiz'}]}),true);
 assert.equal(preferenceMatch('no_exam',record),false);
});
test('preference breaks ties after academic relevance and never makes a blocked course eligible',()=>{
 const selection={id:'advertising',year:2026,intake:1,duration:'2',preference:'presentation'};
 const d=createDraft(selection,{semesters:[['FINM7409'],['?广告专业方向课程','?选修课程']]});
 const course=(code,categories,extra={})=>({code,name:code,units:2,categories,incompatible:'',prerequisite:'Not listed',offerings:{2026:[1,2]},...extra});
 const major=(code)=>course(code,['Advertising Elective Courses']);
 const good=major('ADVT7501'),preferred=major('ADVT7502');
 const unrelated=course('ECON7001',[]),blocked=major('ADVT7503');
 blocked.offerings={2024:[1],2025:[1],2026:[1]};
 const entries={[preferred.code]:record,[unrelated.code]:record,[blocked.code]:record};
 const result=guidedCandidates(d,1,[good,unrelated,blocked,preferred],entries);
 assert.deepEqual(result.map(x=>x.course.code),['ADVT7502','ADVT7501','ECON7001','ADVT7503']);
 assert.equal(result[0].preference,true);
 assert.equal(result.at(-1).allowed,false);
});
test('assignment filters distinguish absent examination from missing assessment data',()=>{
 const quiz={tasks:[{category:'Quiz'}]};
 assert.equal(assessmentMatches('quiz',quiz),true);
 assert.equal(assessmentMatches('no_exam',quiz),true);
 assert.equal(assessmentMatches('no_exam',undefined),false);
 assert.equal(assessmentMatches('unknown',undefined),true);
 assert.equal(assessmentMatches('exam',record),true);
});
test('preference survives exported plans while older plans remain supported',()=>{
 const selection={id:'advertising',year:2026,intake:1,duration:'2',preference:'group'};
 const reference={semesters:[['?选修']]},resolve=()=>reference;
 const draft=createDraft(selection,reference),file=exportDraft(draft);
 assert.equal(parseDraft(JSON.stringify(file),resolve).selection.preference,'group');
 delete file.draft.selection.preference;
 assert.equal(parseDraft(JSON.stringify(file),resolve).selection.preference,undefined);
 file.draft.selection.preference='invented';
 assert.throws(()=>parseDraft(JSON.stringify(file),resolve),/偏好/);
 assert.equal(validPreference('any'),true);
});
