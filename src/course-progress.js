import {selectedMajorNames,courseCategory,belongsToField} from './course-category.js?v=20261109l';
import {gradePoints} from './study-progress.js?v=20261109l';
const codePattern=/^[A-Z]{4}\d{4}$/;
export const COURSE_STATUSES=['planned','passed','failed'];

// Each record is one course attempt in one semester; repeated slots for a
// multi-unit course represent one attempt, not multiple credits.
export function courseRecords(draft,catalogue=[]){
 const byCode=new Map(catalogue.map(c=>[c.code,c])),records=[];
 for(const [index,semester] of draft.semesters.entries()){
  const seen=new Set();
  for(const slot of semester.slots){
   const code=slot.course?.code||(!slot.course&&codePattern.test(slot.original)?slot.original:null);
   if(!code||seen.has(code))continue;seen.add(code);
   const info=byCode.get(code),entry=semester.progress?.grades?.find(g=>g.code===code);
   let status=COURSE_STATUSES.includes(slot.studyStatus)?slot.studyStatus:'planned';
   if(entry){const points=gradePoints(entry.grade);status=entry.grade==='P'||(points!==null&&points>=4)?'passed':'failed'}
   records.push({code,index,status,name:slot.course?.name||info?.name||code,units:slot.course?.units??entry?.units??info?.units??null,needsGradeReview:Boolean(semester.progress&&!semester.progress.grades&&!slot.studyStatus),majorAllocation:slot.majorAllocation||null});
  }
 }
 return records;
}
export function setCourseStatus(draft,index,code,status){
 if(!COURSE_STATUSES.includes(status))throw Error('课程状态无效。');
 const semester=draft.semesters[index];if(!semester)throw Error('学期无效。');
 if(semester.progress?.grades)throw Error('该学期已有逐门成绩，请先撤销完成记录或修改成绩。');
 const next=structuredClone(draft),slots=next.semesters[index].slots.filter(s=>s.course?.code===code||(!s.course&&s.original===code));
 if(!slots.length)throw Error('未找到这门课程。');for(const slot of slots)slot.studyStatus=status;return next;
}
export function assignMajor(draft,index,code,name,catalogue){
 const names=selectedMajorNames(draft.selection),course=catalogue.find(c=>c.code===code);
 if(!names.includes(name)||!belongsToField(draft.selection,course,name))throw Error('该课程不属于所选专业的已收录课程。');
 const next=structuredClone(draft),slots=next.semesters[index]?.slots.filter(s=>s.course?.code===code||(!s.course&&s.original===code))||[];
 if(!slots.length)throw Error('未找到这门课程。');for(const slot of slots)slot.majorAllocation=name;return next;
}
export function majorProgress(draft,catalogue=[]){
 const names=selectedMajorNames(draft.selection),byCode=new Map(catalogue.map(c=>[c.code,c]));
 const groups=names.map(name=>({name,targetUnits:draft.selection.program==='5584'?12:10,targetVerified:draft.selection.year===2026,passedUnits:0,plannedUnits:0,failedUnits:0,courses:[]}));
 const unresolved=[],general={name:'通用选修候选',targetUnits:null,targetVerified:false,passedUnits:0,plannedUnits:0,failedUnits:0,courses:[]};
 const attempts=courseRecords(draft,catalogue),seen=new Set();
 // A passed attempt takes precedence when a course has multiple attempts.
 attempts.sort((a,b)=>({passed:0,planned:1,failed:2}[a.status]-({passed:0,planned:1,failed:2}[b.status])));
 for(const record of attempts){
  if(seen.has(record.code))continue;seen.add(record.code);
  const course=byCode.get(record.code);if(!course||!Number.isFinite(record.units)){unresolved.push(record);continue}
  const matches=names.filter(name=>belongsToField(draft.selection,course,name));
  if(courseCategory(draft.selection,course).key==='program-required')continue;
  let group;if(matches.length===1)group=groups.find(g=>g.name===matches[0]);
  else if(matches.length>1){if(matches.includes(record.majorAllocation))group=groups.find(g=>g.name===record.majorAllocation);else{unresolved.push({...record,possibleMajors:matches});continue}}
  else if(draft.semesters[record.index].slots.some(s=>s.course?.code===record.code)&&courseCategory(draft.selection,course).key==='general-elective')group=general;
  if(!group)continue;
  // Aggregate-only legacy GPA is not a passing grade.
  group.courses.push(record);if(!record.needsGradeReview)group[`${record.status}Units`]+=record.units;
 }
 for(const group of groups){group.remainingUnits=Math.max(0,group.targetUnits-group.passedUnits);group.overTarget=group.passedUnits+group.plannedUnits>group.targetUnits}
 return {groups,general,unresolved};
}
