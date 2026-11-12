// Standalone internal audit: no browser storage or student plans are touched.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {references,getReference} from '../src/reference-data.js';
import {references15,getReference15} from '../src/reference-15.js';
import {createDraft,checkAddition,addCourse,removeCourse,moveReferenceCourse,plannedCodes,offeringCheck,foundationRuleWarnings,findConflicts} from '../src/elective-plan.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {guidedCandidates} from '../src/guided-plan.js';
import {completeSemester,overloadEligibility,calculateGrades} from '../src/study-progress.js';

const catalogue=JSON.parse(fs.readFileSync('src/data/electives.json','utf8')).courses;
const assessments=JSON.parse(fs.readFileSync('src/data/assessments.json','utf8')).records;
const byCode=new Map(catalogue.map(c=>[c.code,c]));
const resolve=s=>(s.duration==='1.5'?getReference15:getReference)(s.id,s.intake);
const configs=[],unsupported=[],issues=[],historical=[];
const counters={configurations:0,initialRoundTrips:0,additionAttempts:0,additions:0,additionRoundTrips:0,moveAttempts:0,moves:0,moveRoundTrips:0,integrityFailures:0};
const initialState=(selection)=>createDraft(selection,resolve(selection));
const cloneString=x=>JSON.stringify(x);
const record=(section,detail)=>{issues.push({section,detail});counters.integrityFailures++};
let seed=123456789;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};

for(const [duration,refs] of [['2',references],['1.5',references15]]){
 for(const ref of refs)for(const year of [2026,2027,2028])for(const intake of [1,2]){
  const selection={id:ref.id,duration,year,intake,preference:'any'};
  if(!resolve(selection).semesters){unsupported.push(selection);continue}
  const draft=initialState(selection);
  counters.configurations++;
  try{
   assert.equal(draft.semesters.length,duration==='1.5'?3:4);
   assert.equal(draft.semesters.flatMap(s=>s.slots).length,duration==='1.5'?12:16);
   assert.deepEqual(parseDraft(JSON.stringify(exportDraft(draft)),resolve),draft);
   counters.initialRoundTrips++;
  }catch(e){record('初始配置', {selection,message:e.message})}
  configs.push({selection,draft});
  if(year===2026)for(let i=0;i<draft.semesters.length;i++)for(const slot of draft.semesters[i].slots){
   const c=byCode.get(slot.original);if(!c)continue;
   const o=offeringCheck(draft,i,c);
   if(!o.allowed)historical.push({duration,id:ref.id,intake,semester:i+1,code:c.code,message:o.message});
  }
 }
}

// Sample real catalogue candidates deterministically, independently per target.
for(const {selection,draft} of configs){
 for(let i=0;i<draft.semesters.length;i++)for(let n=0;n<12;n++){
  const course=catalogue[Math.floor(random()*catalogue.length)];
  counters.additionAttempts++;
  const original=cloneString(draft);
  try{
   const check=checkAddition(draft,i,course,catalogue);
   if(cloneString(draft)!==original)throw Error('检查时修改了原计划');
   if(!check.allowed||check.conflicts.length)continue;
   const next=addCourse(draft,i,course,catalogue);
   counters.additions++;
   assert.equal(cloneString(draft),original);
   assert.equal(plannedCodes(next).filter(x=>x===course.code).length,course.units/2);
   assert.deepEqual(parseDraft(JSON.stringify(exportDraft(next)),resolve),next);
   counters.additionRoundTrips++;
   const removed=removeCourse(next,i,course.code);
   assert.equal(plannedCodes(removed).includes(course.code),false);
  }catch(e){record('添加或移除',{selection,semester:i+1,code:course.code,message:e.message})}
 }
}

// Try moving every named example course to each other semester.
for(const {selection,draft} of configs){
 for(let from=0;from<draft.semesters.length;from++)for(const slot of draft.semesters[from].slots){
  if(!/^[A-Z]{4}\d{4}$/.test(slot.original))continue;
  for(let to=0;to<draft.semesters.length;to++){
   if(to===from)continue;
   counters.moveAttempts++;
   const before=cloneString(draft),originalSlots=draft.semesters.flatMap(s=>s.slots.map(x=>x.original)).sort();
   let next;try{next=moveReferenceCourse(draft,from,to,slot.original,catalogue)}catch{continue}
   try{
    counters.moves++;assert.equal(cloneString(draft),before);
    assert.deepEqual(next.semesters.flatMap(s=>s.slots.map(x=>x.original)).sort(),originalSlots);
    for(let i=0;i<draft.semesters.length;i++)if(i!==from&&i!==to)assert.deepEqual(next.semesters[i],draft.semesters[i]);
    assert.deepEqual(parseDraft(JSON.stringify(exportDraft(next)),resolve),next);
    counters.moveRoundTrips++;
   }catch(e){record('移动',{selection,from:from+1,to:to+1,code:slot.original,message:e.message})}
  }
 }
}

const selection={id:'is',year:2026,intake:1,duration:'2',preference:'no_exam'};
const draft=initialState(selection),bism=byCode.get('BISM7208'),adps=byCode.get('ADPS7300'),acct=byCode.get('ACCT7101');
const early=checkAddition(draft,1,bism,catalogue);
const ranking=guidedCandidates(draft,1,catalogue,assessments);
const after=addCourse(draft,1,bism,catalogue);
const degreeRestrictions={sourceText:adps.prerequisite,result:checkAddition(draft,1,adps,catalogue),guide:ranking.find(x=>x.course.code===adps.code)};
const compound=checkAddition(draft,1,acct,catalogue);
const capstone=moveReferenceCourse(draft,3,1,'MGTS7621',catalogue);
const dup=exportDraft(draft);
dup.draft.semesters[1].slots.find(s=>s.original.startsWith('?')).course={code:'BISM7202',name:'Information Systems for Management',units:2};
let duplicateAccepted=false;try{parseDraft(JSON.stringify(dup),resolve,catalogue);duplicateAccepted=true}catch{}
const fake=exportDraft(draft);
fake.draft.semesters[1].slots.find(s=>s.original.startsWith('?')).course={code:'FAKE7001',name:'不存在的测试课程',units:2};
let unknownCourseAccepted=false;try{parseDraft(JSON.stringify(fake),resolve,catalogue);unknownCourseAccepted=true}catch{}
const badSelection={...selection,duration:'1.5'},bad=exportDraft(initialState(badSelection));
bad.draft.semesters[1].slots.find(s=>s.original.startsWith('?')).course={code:'FINM7409',name:'Financial Management for Decision Makers',units:2};
let badImported;try{badImported=parseDraft(JSON.stringify(bad),resolve)}catch{}
// A previous semester where one OR-alternative really passed.
const passed=createDraft(selection,{semesters:[['BISM7233','BISM7255','MGTS7610'],['?选修课程']]});
const passedWithGrades=completeSemester(passed,0,{BISM7233:'5',BISM7255:'5',MGTS7610:'5'},catalogue);
const orPrereq=guidedCandidates(passedWithGrades,1,catalogue,assessments).find(x=>x.course.code==='BISM7208');
const completed=completeSemester(initialState(badSelection),0,{BISM7202:'4',BISM7206:'5',MGTS7610:'P'},catalogue);
const grade=calculateGrades([{code:'TEST7001',units:2},{code:'TEST7002',units:2},{code:'TEST7003',units:2}],{TEST7001:'4',TEST7002:'5',TEST7003:'P'});
const targeted={
 prerequisite:{code:bism.code,prior: bism.prerequisite,allowed:early.allowed,warnings:early.warnings,plannedYearSemester:2,guideFlag:ranking.find(x=>x.course.code===bism.code).needsReview,added:plannedCodes(after).includes(bism.code)},
 prerequisiteOr:{completed:['BISM7233','BISM7255'],text:bism.prerequisite,needsReview:orPrereq.needsReview},
 programEligibility:{code:adps.code,sourceText:adps.prerequisite,allowed:degreeRestrictions.result.allowed,warnings:degreeRestrictions.result.warnings,guideNeedsReview:degreeRestrictions.guide.needsReview,guideAllowed:degreeRestrictions.guide.allowed},
 compoundIncompatible:{code:acct.code,sourceText:byCode.get('FINM7409').incompatible,allowed:compound.allowed,warnings:compound.warnings},
 duplicateImportAccepted:duplicateAccepted,
 unknownCourseImportAccepted:unknownCourseAccepted,
 capstone:{from:4,to:2,moveAllowed:capstone.semesters[1].slots.some(x=>x.original==='MGTS7621'),conflicts:findConflicts(capstone,catalogue),exportStatus:exportDraft(capstone).validationSnapshot.status},
 invalidSnapshot:{importAccepted:Boolean(badImported),warnings:badImported?foundationRuleWarnings(badImported):[],status:badImported?exportDraft(badImported,foundationRuleWarnings(badImported)).validationSnapshot.status:''},
 gradeBoundary:{gpa:grade.gpa,overloadEligible:overloadEligibility(completed,1).eligible,slots:completed.semesters.map(s=>s.slots.length)}
};
const report={ranAt:new Date().toISOString(),randomSeed:123456789,counters,unsupported,historicalOfferingMismatchCount:historical.length,historicalOfferingExamples:historical.slice(0,12),integrityFailures:issues,targeted};
fs.mkdirSync('outputs/internal_testing',{recursive:true});
fs.writeFileSync('outputs/internal_testing/course-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,integrityFailures:issues.slice(0,5),targeted:{...targeted,programEligibility:{...targeted.programEligibility,sourceText:targeted.programEligibility.sourceText?.slice(0,180)}}},null,2));

if (issues.length) process.exitCode=1;
