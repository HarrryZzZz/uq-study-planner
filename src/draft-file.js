import {isChoice,provisionalChoice,choiceOptions,planIssues} from './elective-plan.js?v=20261109l';
import {semesterCourses,calculateGrades} from './study-progress.js?v=20261109l';
import {validPreference} from './assessment.js?v=20261109l';
import {MAJORS} from './course-category.js';
import {selectedMajorNames} from './course-category.js?v=20261109l';

export const DRAFT_FORMAT='uq-study-planner-reference';
const RULESETS={'2':'uq-5583-2026-2y-reference-v1','1.5':'uq-5583-2026-1.5y-reference-v1'};
const COMMERCE_RULESETS={'2':'uq-5584-2026-2y-reference-v1','1.5':'uq-5584-2026-1.5y-reference-v1'};
export function exportDraft(draft,warnings=[],catalogue=[]){
 const issues=planIssues(draft,catalogue);
 const program=draft.selection.program||'5583',rulesets=program==='5584'?COMMERCE_RULESETS:RULESETS;
 return {format:DRAFT_FORMAT,schemaVersion:1,program,ruleset:{id:rulesets[draft.selection.duration],year:2026},exportedAt:new Date().toISOString(),validationSnapshot:{status:issues.invalid.length?'invalid':'unverified',warnings:[...new Set([...issues.invalid,...issues.review,...warnings])]},draft:structuredClone(draft)};
}
export function parseDraft(text,resolveReference,catalogue){
 let file;try{file=JSON.parse(text)}catch{throw Error('文件不是有效的 JSON。')}
 if(file?.format!==DRAFT_FORMAT||file.schemaVersion!==1)throw Error('不支持此计划文件的格式或版本。');
 const d=file.draft,s=d?.selection;
 if(s?.preference!==undefined&&!validPreference(s.preference))throw Error('计划中的考核偏好不受支持。');
 const rulesets=file.program==='5584'?COMMERCE_RULESETS:RULESETS;
 if(!['5583','5584'].includes(file.program)||!s||(s.program||'5583')!==file.program||!['2','1.5'].includes(s.duration)||file.ruleset?.id!==rulesets[s.duration]||file.ruleset?.year!==2026||![2026,2027,2028].includes(s.year)||![1,2].includes(s.intake)||typeof s.id!=='string'||(file.program==='5584'&&s.id!==`mcom:${s.major1}${s.major2?'+'+s.major2:''}`))throw Error('计划的专业、年份或规则版本不受支持。');
 let ref;
 if(s.id.startsWith('pair:')){
  if(!MAJORS[s.major1]||!MAJORS[s.major2]||s.major1===s.major2||s.id!==`pair:${s.major1}+${s.major2}`)throw Error('计划中的专业组合无效。');
  const snap=d.referenceSnapshot,n=s.duration==='1.5'?3:4;
  if(!snap||snap.id!==s.id||snap.generated!==true||typeof snap.label!=='string'||snap.label.length>120||typeof snap.note!=='string'||snap.note.length>1000||!Array.isArray(snap.semesters)||snap.semesters.length!==n||snap.semesters.some(slots=>!Array.isArray(slots)||slots.length!==4||slots.some(x=>typeof x!=='string'||x.length>300||!(/^[A-Z]{4}\d{4}$/.test(x)||x.startsWith('?')))))throw Error('自定义计划的原始课程快照无效。');
  if(catalogue){const known=new Set(catalogue.map(c=>c.code));if(snap.semesters.flat().some(x=>/^[A-Z]{4}\d{4}$/.test(x)&&!known.has(x)))throw Error('计划快照包含当前课程目录中无法核实的课程。');}
  ref=snap;
 }else try{ref=resolveReference(s)}catch{throw Error('计划中的专业或入学学期不受支持。')}
 if(d.schemaVersion!==1||!Array.isArray(ref?.semesters)||!Array.isArray(d.semesters)||d.semesters.length!==ref.semesters.length)throw Error('计划中的学期安排无效。');
 const actual=[],selected=new Map();
 for(const [semesterIndex,semester] of d.semesters.entries()){
  if(!Array.isArray(semester?.slots)||semester.slots.length>30)throw Error('计划中的课程安排无效。');
  if(semester.progress){
   const p=semester.progress,courses=semesterCourses(semester),codes=courses.map(c=>c.code);
   if((p.gpa!==null&&(!Number.isFinite(p.gpa)||p.gpa<0||p.gpa>7))||!Number.isFinite(p.recordedUnits)||p.recordedUnits<=0||p.recordedUnits>100||!Array.isArray(p.courseCodes)||!p.courseCodes.length||p.courseCodes.some(x=>typeof x!=='string')||new Set(p.courseCodes).size!==p.courseCodes.length||JSON.stringify([...p.courseCodes].sort())!==JSON.stringify(codes.sort())||typeof p.recordedAt!=='string'||!Number.isFinite(Date.parse(p.recordedAt)))throw Error('学期 GPA 或完成记录无效。');
   if(p.grades!==undefined){
    if(!Array.isArray(p.grades)||p.grades.length!==courses.length||p.grades.some(g=>!g||!courses.some(c=>c.code===g.code&&c.units===g.units))||new Set(p.grades.map(g=>g.code)).size!==courses.length)throw Error('逐门课程成绩无效。');
    let result;try{result=calculateGrades(courses,Object.fromEntries(p.grades.map(g=>[g.code,g.grade])))}catch{throw Error('逐门课程成绩无效。')}
    if(result.gpa!==p.gpa||result.gpaUnits!==p.gpaUnits||result.passedUnits!==p.passedUnits||p.recordedUnits!==courses.reduce((n,c)=>n+c.units,0))throw Error('课程成绩与 GPA 记录不一致。');
   }else if(p.gpa===null)throw Error('学期 GPA 或完成记录无效。');
  }
  for(const slot of semester.slots){
   if(!slot||typeof slot.original!=='string'||slot.original.length>300)throw Error('计划中有无效的课程位置。');
   if(slot.borrowedFrom!==undefined&&(!isChoice(slot)||!slot.borrowedFrom||!Number.isInteger(slot.borrowedFrom.semester)||slot.borrowedFrom.semester<0||slot.borrowedFrom.semester>=d.semesters.length||slot.borrowedFrom.semester===semesterIndex||!Number.isInteger(slot.borrowedFrom.position)||slot.borrowedFrom.position<0||slot.borrowedFrom.position>30))throw Error('计划中的待选位置来源无效。');
   if(slot.studyStatus!==undefined&&!['planned','passed','failed'].includes(slot.studyStatus))throw Error('课程状态无效。');
   if(slot.majorAllocation!==undefined&&(typeof slot.majorAllocation!=='string'||slot.majorAllocation.length>100||!selectedMajorNames(s).includes(slot.majorAllocation)))throw Error('课程的专业归属无效。');
   actual.push(slot.original);
   if(slot.course!==null){
    const c=slot.course;
    if(!isChoice(slot)||!c||typeof c.code!=='string'||!/^[A-Z]{4}\d{4}$/.test(c.code)||typeof c.name!=='string'||!c.name.trim()||c.name.length>300||![2,4,6,8].includes(c.units)||(provisionalChoice(slot)&&c.units!==2)||(choiceOptions(slot).length&&!choiceOptions(slot).includes(c.code)))throw Error('计划中有无效的选修课程。');
    const o=c.override;if(o!==undefined&&(!o||!['failed','approved','other'].includes(o.reason)||typeof o.note!=='string'||o.note.length>300||!Array.isArray(o.warnings)||!o.warnings.length||o.warnings.length>50||o.warnings.some(w=>typeof w!=='string'||w.length>2000)))throw Error('课程冲突确认记录无效。');
    const key=`${semesterIndex}:${c.code}`,prior=selected.get(key);
    if(prior&&(prior.name!==c.name||prior.units!==c.units||prior.original!==slot.original||JSON.stringify(prior.override)!==JSON.stringify(c.override)||prior.studyStatus!==slot.studyStatus||prior.majorAllocation!==slot.majorAllocation))throw Error('计划中有重复或不一致的选修课程。');
    if(prior)prior.count++;else selected.set(key,{code:c.code,semesterIndex,name:c.name,units:c.units,original:slot.original,count:1,override:c.override,studyStatus:slot.studyStatus,majorAllocation:slot.majorAllocation});
   }
  }
 }
 const expected=ref.semesters.flat();
 if(JSON.stringify(actual.sort())!==JSON.stringify([...expected].sort())||[...selected.values()].some(c=>c.count!==c.units/2))throw Error('计划中的课程位置或学分不匹配。');
 const fixed=new Set(d.semesters.flatMap(semester=>semester.slots.filter(slot=>!slot.course&&/^[A-Z]{4}\d{4}$/.test(slot.original)).map(slot=>slot.original)));
 for(const entry of selected.values())if(fixed.has(entry.code)&&!entry.override)throw Error(`${entry.code} 与计划中的必修课程重复。`);
 for(const entry of selected.values()){const same=[...selected.values()].filter(x=>x.code===entry.code);if(same.length>1&&same.filter(x=>!x.override).length>1)throw Error(`${entry.code} 重复安排且缺少确认记录。`)}
 if(catalogue){const known=new Set(catalogue.map(c=>c.code));for(const {code} of selected.values())if(!known.has(code))throw Error(`${code} 不在当前课程资料中，无法核实。请检查文件或课程资料版本。`)}
 return structuredClone(d);
}
