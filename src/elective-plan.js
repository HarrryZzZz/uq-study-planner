import {selectedMajorNames,belongsToField} from './course-category.js?v=20261109l';
import {COMMERCE_CORE,COMMERCE_FIELDS,COMMERCE_RESEARCH,commerceOutsideElective} from './commerce-reference.js';
import {majorProgress} from './course-progress.js';
import {loadCheck} from './study-progress.js?v=20261109l';
import {courseExpression,prerequisiteCheck,eligibilityCheck} from './academic-rules.js';
const codePattern=/^[A-Z]{4}\d{4}$/;
export function createDraft(selection,reference){
 if(!reference.semesters)throw Error('此配置没有可用的示例计划。');
 const result={schemaVersion:1,selection:{...selection},semesters:reference.semesters.map(slots=>({slots:slots.map(original=>({original,course:null}))}))};
 if(reference.generated)result.referenceSnapshot={id:reference.id,label:reference.label,note:reference.note,generated:true,semesters:structuredClone(reference.semesters)};
 return result;
}
export function choiceOptions(slot){return typeof slot?.original==='string'?[...new Set(slot.original.match(/\b[A-Z]{4}\d{4}\b/g)||[])]:[];}
export function isChoice(slot){if(typeof slot?.original!=='string'||!slot.original.startsWith('?')||slot.original.includes('未列明'))return false;const options=choiceOptions(slot);return options.length===0||(options.length>=2&&/(?:或|\bOR\b)/i.test(slot.original));}
// A provisional position with unknown units can only hold a single 2-unit
// course; the source position stays marked as unverified in the draft.
export function provisionalChoice(slot){return isChoice(slot)&&slot.original.includes('学分待核实');}
export function semesterCourseCount(semester){return new Set((semester?.slots||[]).map(s=>s.course?.code||(!s.course&&codePattern.test(s.original)?s.original:null)).filter(Boolean)).size;}
export function projectedCourseCount(semester){return semesterCourseCount(semester)+(semester?.slots||[]).filter(s=>!s.course&&!codePattern.test(s.original)).length;}
function matchesMajorPosition(slot,course,selection){
 const text=slot.original;
 if(selection.program==='5584'){
  if(!text.includes('方向课程')||text.includes('MCom 选修'))return true;
  const names=[];if(text.includes('应用金融'))names.push('Applied Finance');if(text.includes('信息系统'))names.push('Information Systems');if(text.includes('专业会计'))names.push('Professional Accounting');
  return (names.length?names:selectedMajorNames(selection)).some(name=>belongsToField(selection,course,name));
 }
 // A position explicitly allowing electives or a second field is not exclusive.
 if(!text.includes('专业方向课程')||/选修课程|第二专业课程/.test(text))return true;
 const labels={'广告':'Advertising','人力资源管理':'Human Resource Management','信息系统':'Information Systems','市场营销':'Marketing','国际商务':'International Business','供应链管理':'Supply Chain Management','商业法律':'Law for Business','创新与创业':'Innovation and Entrepreneurship','可持续发展':'Sustainability: Strategy and Leadership'};
 const specific=Object.entries(labels).filter(([zh])=>text.includes(zh)).map(([,en])=>en);
 const names=specific.length?specific:selectedMajorNames(selection);
 return names.some(name=>(course?.categories||[]).some(category=>category===`${name} Elective Courses`||category===`${name} Compulsory Courses`));
}
function canTakeSlots(draft,index,slots){
 if(draft.semesters.length<3)return true;
 const remaining=structuredClone(draft.semesters[index]);
 for(const i of [...slots].sort((a,b)=>b-a))remaining.slots.splice(i,1);
 const minimum=index===draft.semesters.length-1?2:3;
 return projectedCourseCount(remaining)>=minimum;
}
export function findSlots(draft,index,units,course){
 const slots=draft.semesters[index]?.slots;if(!slots||![2,4,6,8].includes(units))return [];
 const eligible=slots.map((s,i)=>({s,i})).filter(({s})=>{
  if(!isChoice(s)||s.course)return false;
  const options=choiceOptions(s);if(options.length&&(!course||!options.includes(course.code)))return false;
  if(!options.length&&!matchesMajorPosition(s,course,draft.selection))return false;
  if(!provisionalChoice(s))return true;
  if(units!==2||!course)return false;
  if(options.length)return true;
  return selectedMajorNames(draft.selection).some(name=>(course.categories||[]).some(category=>category===`${name} Elective Courses`||category===`${name} Compulsory Courses`));
 });
 eligible.sort((a,b)=>Number(choiceOptions(b.s).length>0)-Number(choiceOptions(a.s).length>0));
 for(const first of eligible){const matches=eligible.filter(x=>x.s.original===first.s.original);if(matches.length>=units/2)return matches.slice(0,units/2).map(x=>x.i)}
 return [];
}
export function offeringPattern(course){
 const history=course?.offerings||{};let s1=0,s2=0;
 for(const year of ['2024','2025','2026']){const terms=history[year]||[];if(terms.includes(1))s1++;if(terms.includes(2))s2++}
 if(s1&&s2)return 'both';if(s1>=2&&!s2)return 's1';if(s2>=2&&!s1)return 's2';return 'unknown';
}
export function semesterFor(draft,index){const n=draft.selection.intake-1+index;return {year:draft.selection.year+Math.floor(n/2),term:n%2+1}}
export function offeringCheck(draft,index,course){
 const {year,term}=semesterFor(draft,index),pattern=offeringPattern(course),observed=course?.offerings?.[String(year)];
 if(observed?.includes(term))return {allowed:true,pattern};
 if((pattern==='s1'&&term===2)||(pattern==='s2'&&term===1))return {allowed:false,pattern,message:`${course.code} 在 2024—2026 年至少两年只记录了第 ${pattern==='s1'?1:2} 学期开课；当前不能安排到第 ${term} 学期。`};
 return {allowed:true,pattern};
}
// UQ abbreviates repeated course prefixes: "ACCT1110 or 1111".
export function mentionedCodes(text){
 if(!text||/^(Not verified|Not listed)/i.test(text))return [];
 const found=new Set();let prefix='';
 for(const m of text.toUpperCase().matchAll(/\b([A-Z]{4}\d{4}|\d{4})\b/g)){
  const t=m[0];if(codePattern.test(t)){prefix=t.slice(0,4);found.add(t)}
  else if(prefix&&Number(t)>=1000&&Number(t)<=9999&&!(Number(t)>=2020&&Number(t)<=2035))found.add(prefix+t);
 }
 return [...found];
}
export function plannedCodes(draft){return draft.semesters.flatMap(s=>s.slots.flatMap(x=>x.course?[x.course.code]:codePattern.test(x.original)?[x.original]:[]));}
export function foundationRuleWarnings(draft){
 if(draft.selection.program==='5584'||draft.selection.duration!=='1.5')return [];
 const codes=new Set(plannedCodes(draft)),warnings=[];
 for(const code of ['FINM7409','MGTS7301','MGTS7608','MGTS7617','FINM1415','FINM2401'])if(codes.has(code))warnings.push(`${code} 与 1.5 年制已认定的基础课或其已知不兼容课程冲突。`);
 for(const group of [['ACCT7101','FINM7401'],['ACCT1101','FINM2400'],['ACCT1101','FINM1416']])if(group.every(c=>codes.has(c)))warnings.push(`${group.join(' + ')} 的组合与已认定的 FINM7409 不兼容。`);
 return warnings;
}
export function findConflicts(draft,catalogue){
 const byCode=new Map(catalogue.map(c=>[c.code,c])),all=new Set(plannedCodes(draft)),added=new Set(draft.semesters.flatMap(s=>s.slots.filter(x=>x.course).map(x=>x.course.code))),warnings=[];
 for(const from of all){const source=byCode.get(from);if(!source)continue;const others=new Set([...all].filter(x=>x!==from)),result=courseExpression(source.incompatible,others);
  if(result===true&&[...added].some(code=>code===from||courseExpression(source.incompatible,new Set([...others].filter(x=>x!==code)))!==true))warnings.push(`${from} 的不兼容条件可能已满足：${source.incompatible}（${source.status||'来源学期未知'}）`);
  else if(result===null&&mentionedCodes(source.incompatible).some(code=>others.has(code)&&(added.has(code)||added.has(from))))warnings.push(`${from} 的不兼容条件需人工核实：${source.incompatible}`);
 }
 return warnings;
}
export function checkAddition(draft,index,course,catalogue,options={}){
 const warnings=[];const codes=plannedCodes(draft);let sourceIndex=index,slots=findSlots(draft,index,course.units,course);
 const maxCourses=index===0?4:5;
 if(semesterCourseCount(draft.semesters[index])>=maxCourses)return {allowed:false,warnings:[index===0?'第一学期最多安排 4 门课程。':'每学期最多安排 5 门课程。请先移动或移除课程。'],conflicts:[]};
 const duplicate=codes.includes(course.code);
 if(duplicate&&!options.allowConflictOverride)return {allowed:false,overridable:true,warnings:[`${course.code} 已出现在计划中；更改学期请移动原课程，如需再次修读可选择理由后继续。`],conflicts:[]};
 if(duplicate&&draft.semesters[index].slots.some(s=>s.course?.code===course.code||(!s.course&&s.original===course.code)))return {allowed:false,warnings:['同一学期不能重复安排同一门课程。'],conflicts:[]};
 const eligibility=eligibilityCheck(course);if(!eligibility.allowed)return {allowed:false,warnings:[eligibility.message],conflicts:[]};
 if(draft.selection.program!=='5584'&&draft.selection.duration==='1.5'){
  const forbidden=['FINM7409','MGTS7301','MGTS7608','MGTS7617','FINM1415','FINM2401'];
  if(forbidden.includes(course.code)){const message=`${course.code} 与 1.5 年制已认定的基础课或其已知不兼容课程冲突，是否可修读及计入学分需向 UQ 核实。`;if(!options.allowConflictOverride)return {allowed:false,overridable:true,warnings:[message],conflicts:[]};warnings.push(message)}
  const combined=[['ACCT7101','FINM7401'],['ACCT1101','FINM2400'],['ACCT1101','FINM1416']];
  if(combined.some(group=>group.includes(course.code)&&group.every(code=>code===course.code||codes.includes(code)))){const message=`${course.code} 与计划中另一门课的组合，与已认定的 FINM7409 不兼容。`;if(!options.allowConflictOverride)return {allowed:false,overridable:true,warnings:[message],conflicts:[]};warnings.push(message)}
 }
 const offering=offeringCheck(draft,index,course);if(!offering.allowed)return {allowed:false,warnings:[offering.message],conflicts:[]};
 const load=loadCheck(draft,index,course.units,catalogue);if(!load.allowed)return {allowed:false,warnings:[load.message],conflicts:[]};
 if(!slots.length){
  const i=draft.semesters.length-1;
  if(i>index&&!draft.semesters[i].progress&&projectedCourseCount(draft.semesters[index])<maxCourses){const candidate=findSlots(draft,i,course.units,course);if(candidate.length&&canTakeSlots(draft,i,candidate)){sourceIndex=i;slots=candidate}}
 }
 if(!slots.length)return {allowed:false,warnings:['本学期及最后学期没有可调配的适用待选位置；学分待核实的专业位置仅接受相关专业的 2 学分课程。'],conflicts:[]};
 const others=new Set(codes),own=courseExpression(course.incompatible,others);
 if(own===true||(own===null&&mentionedCodes(course.incompatible).some(code=>others.has(code))))warnings.push(`${course.code} 与 ${mentionedCodes(course.incompatible).filter(code=>others.has(code)).join('、')} 的不兼容条件需核实：${course.incompatible}`);
 const all=new Set([...codes,course.code]),byCode=new Map(catalogue.map(x=>[x.code,x]));
 for(const existing of new Set(codes)){const source=byCode.get(existing);if(!source)continue;const before=new Set([...others].filter(x=>x!==existing)),after=new Set([...all].filter(x=>x!==existing)),result=courseExpression(source.incompatible,after);
  if((result===true&&courseExpression(source.incompatible,before)!==true)||(result===null&&mentionedCodes(source.incompatible).includes(course.code)))warnings.push(`${existing} 的不兼容条件需核实：${source.incompatible}`);
 }
 if(duplicate)warnings.push(`${course.code} 已有修读或计划记录；重复修读及学分资格需向 UQ 核实。`);
 return {allowed:true,slots,sourceIndex,warnings,conflicts:warnings};
}
export function addCourse(draft,index,course,catalogue){return applyAddition(draft,index,course,catalogue,null)}
function applyAddition(draft,index,course,catalogue,override){const check=checkAddition(draft,index,course,catalogue,{allowConflictOverride:Boolean(override)});if(!check.allowed)throw Error(check.warnings.join(' '));const next=structuredClone(draft);const source=next.semesters[check.sourceIndex].slots;const selected=check.slots.map(i=>source[i]);if(check.sourceIndex!==index){for(const [n,slot] of selected.entries())slot.borrowedFrom={semester:check.sourceIndex,position:check.slots[n]};for(const i of [...check.slots].sort((a,b)=>b-a))source.splice(i,1);next.semesters[index].slots.push(...selected)}for(const slot of selected)slot.course={code:course.code,name:course.name,units:course.units,...(override?{override:{...override,warnings:check.conflicts.length?check.conflicts:['用户确认保留课程冲突，请向 UQ 核实。']}}:{})};return next;}
export function forceAddCourse(draft,index,course,catalogue,override){if(!override||!['failed','approved','other'].includes(override.reason)||typeof (override.note??'')!=='string'||(override.note||'').length>300)throw Error('请选择继续添加的理由。');const first=checkAddition(draft,index,course,catalogue);if(!first.overridable&&!first.conflicts?.length)throw Error('当前情况无法通过确认冲突继续添加。');return applyAddition(draft,index,course,catalogue,{reason:override.reason,note:override.note||''});}
export function removeCourse(draft,index,code){
 if(draft.semesters[index]?.progress)throw Error('该学期已记录完成，请先撤销完成状态再调整课程。');
 const next=structuredClone(draft),semester=next.semesters[index];if(!semester)throw Error('学期无效。');
 const removed=semester.slots.filter(slot=>slot.course?.code===code);
 if(!removed.length)throw Error('未找到要移除的课程。');
 for(const slot of removed){slot.course=null;delete slot.studyStatus;delete slot.majorAllocation}
 // Return vacancies only when their origin is known and has space. For an
 // earlier local course removed from an overloaded semester, the emptied
 // position can replace the borrowed one without moving any chosen course.
 const ownBorrowed=removed.filter(slot=>slot.borrowedFrom);
 const retained=semesterCourseCount(semester)<=4&&removed.length===1?semester.slots.filter(slot=>slot.course&&slot.course.units===2&&slot.borrowedFrom):[];
 const sources=ownBorrowed.length?ownBorrowed:retained;
 const vacancies=ownBorrowed.length?ownBorrowed:removed.filter(slot=>!slot.borrowedFrom);
 // Multi-slot courses must be returned together, never partially.
 if(ownBorrowed.length>1){const origin=ownBorrowed[0].borrowedFrom,target=next.semesters[origin.semester];if(ownBorrowed.some(s=>s.borrowedFrom.semester!==origin.semester)||!target||target.progress||projectedCourseCount(target)+ownBorrowed.length>(origin.semester===0?4:5))return next;}
 for(let n=0;n<Math.min(sources.length,vacancies.length);n++){
  const borrowed=sources[n],vacancy=vacancies[n],origin=borrowed.borrowedFrom,target=next.semesters[origin?.semester];
  if(!target||origin.semester===index||target.progress||projectedCourseCount(target)>=(origin.semester===0?4:5))continue;
  semester.slots.splice(semester.slots.indexOf(vacancy),1);
  delete vacancy.borrowedFrom;target.slots.splice(Math.min(origin.position,target.slots.length),0,vacancy);
  delete borrowed.borrowedFrom;
 }
 return next;
}
export function moveReferenceCourse(draft,from,to,code,catalogue){
 if(from===to)return structuredClone(draft);
 if(!draft.semesters[from]||!draft.semesters[to])throw Error('目标学期无效。');
 if(draft.semesters[from].progress)throw Error('该学期已记录完成，请先撤销完成状态再调整课程。');
 const limit=to===0?4:5;
 if(semesterCourseCount(draft.semesters[to])>=limit)throw Error(to===0?'第一学期最多安排 4 门课程。':'每学期最多安排 5 门课程。请先移动或移除目标学期的课程。');
 const sourceSlots=draft.semesters[from].slots,sourceIndices=sourceSlots.map((s,i)=>({s,i})).filter(({s})=>s.course?.code===code||(!s.course&&s.original===code)).map(x=>x.i);
 if(!sourceIndices.length)throw Error('未找到需要移动的课程。');
 const excess=Math.max(0,projectedCourseCount(draft.semesters[to])+sourceIndices.length-limit);
 const vacancies=draft.semesters[to].slots.map((s,i)=>({s,i})).filter(({s})=>isChoice(s)&&!s.course).slice(0,excess);
 if(vacancies.length<excess)throw Error('目标学期没有足够的空位置，请先调整待选位置。');
 if(!canTakeSlots(draft,from,sourceIndices)&&!excess)throw Error('移动后该学期课程位置过少；非最后学期至少保留 3 门，最后学期至少保留 2 门。');
 const course=catalogue.find(x=>x.code===code);if(course){const check=offeringCheck(draft,to,course);if(!check.allowed)throw Error(check.message)}
 const units=sourceSlots[sourceIndices[0]].course?.units??course?.units??2;const load=loadCheck(draft,to,units,catalogue);if(!load.allowed)throw Error(load.message);
 const next=structuredClone(draft);const source=next.semesters[from].slots;
 const matching=source.filter(x=>x.course?.code===code||(!x.course&&x.original===code));
 if(!matching.length)throw Error('未找到需要移动的课程。');
 for(const slot of matching)if(slot.borrowedFrom?.semester===to)delete slot.borrowedFrom;
 next.semesters[from].slots=source.filter(x=>!matching.includes(x));
 for(const {i} of [...vacancies].reverse())next.semesters[from].slots.push(...next.semesters[to].slots.splice(i,1));
 if(draft.semesters.length>=3&&projectedCourseCount(next.semesters[from])<(from===draft.semesters.length-1?2:3))throw Error('移动后该学期课程位置过少。');
 next.semesters[to].slots.push(...matching);return next;
}
// Move an unfilled position explicitly; needed to repair older overloaded drafts.
export function movePendingSlot(draft,from,to,index){
 if(from===to)return structuredClone(draft);
 const source=draft.semesters[from],target=draft.semesters[to],slot=source?.slots[index];
 if(!source||!target||!slot||!isChoice(slot)||slot.course)throw Error('未找到可移动的待选位置。');
 if(source.progress||target.progress)throw Error('学期已记录完成，请先撤销完成状态。');
 if(projectedCourseCount(target)>=(to===0?4:5))throw Error('目标学期没有空余位置。');
 if(!canTakeSlots(draft,from,[index]))throw Error('移动后原学期课程位置过少。');
 const next=structuredClone(draft),moved=next.semesters[from].slots.splice(index,1)[0];delete moved.borrowedFrom;next.semesters[to].slots.push(moved);return next;
}
export function sameSelection(a,b){return (a?.program||'5583')===(b?.program||'5583')&&['id','year','intake','duration'].every(k=>a?.[k]===b?.[k])&&JSON.stringify(selectedMajorNames(a||{}))===JSON.stringify(selectedMajorNames(b||{}));}

// Validate the whole arrangement, including untouched courses in the reference PDF.
export function planIssues(draft,catalogue=[]){
 const invalid=foundationRuleWarnings(draft),review=[...findConflicts(draft,catalogue)];
 const byCode=new Map(catalogue.map(c=>[c.code,c])),seen=new Set();
 const fixed=draft.semesters.flatMap(s=>s.slots.filter(x=>!x.course&&codePattern.test(x.original)).map(x=>x.original));
 const selected=new Set(draft.semesters.flatMap(s=>s.slots.filter(x=>x.course).map(x=>x.course.code)));
 const overridden=new Set(draft.semesters.flatMap(s=>s.slots.filter(x=>x.course?.override).map(x=>x.course.code)));
 for(const code of new Set(fixed))if(fixed.filter(x=>x===code).length>1||selected.has(code))(overridden.has(code)?review:invalid).push(`${code} 在计划中重复安排，重复修读及学分资格需向 UQ 核实。`);
 draft.semesters.forEach((semester,index)=>{
  const local=new Set();
  for(const slot of semester.slots){const code=slot.course?.code||(!slot.course&&codePattern.test(slot.original)?slot.original:null);if(!code||local.has(code))continue;local.add(code);
   if(seen.has(code))(overridden.has(code)?review:invalid).push(`${code} 在多个学期重复安排，重复修读及学分资格需向 UQ 核实。`);seen.add(code);
   if(slot.course?.override){const o=slot.course.override,reason={failed:'之前修读未通过',approved:'已向学院确认',other:'其他原因'}[o.reason]||'未提供';review.push(`${code} 为用户确认保留的冲突课程（理由：${reason}${o.note?'；备注：'+o.note:''}）。${(o.warnings||[]).join(' ')} 实际选课资格和学分请向 UQ 核实。`)}
   if(draft.selection.program!=='5584'&&code==='MGTS7621'&&index<draft.semesters.length-1)invalid.push('MGTS7621 须在倒数第二学期最终成绩公布后选修，请调整至最后学期或向 UQ 核实特殊情况。');
   const course=byCode.get(code);if(!course){review.push(`${code} 的课程资料尚未核实。`);continue}
   const eligible=eligibilityCheck(course);if(!eligible.allowed)review.push(eligible.message);
   const offering=offeringCheck(draft,index,course);if(!offering.allowed){const {year,term}=semesterFor(draft,index);review.push(`${year} S${term} 的 ${code} 与历史开课记录不一致；官方示例或实际安排可能不同，请向 UQ 核实。`)}
   if(slot.course||(course.prerequisite&&!/^Not (verified|listed)/i.test(course.prerequisite))){const prereq=prerequisiteCheck(draft,index,course);if(prereq.message)review.push(prereq.message)}
  }
 });
 if(draft.selection.program==='5584'){
  const records=majorProgress(draft,catalogue),allCodes=new Set(plannedCodes(draft));
  for(const code of COMMERCE_CORE)if(!allCodes.has(code))invalid.push(`缺少 Commerce 核心课程 ${code}。`);
  for(const id of [draft.selection.major1,draft.selection.major2].filter(x=>x==='is'||x==='accounting'))for(const [code] of COMMERCE_FIELDS[id].groups[0].courses)if(!allCodes.has(code))invalid.push(`缺少 ${id==='is'?'信息系统':'专业会计'}专业必修课程 ${code}。`);
  for(const group of records.groups)if(group.passedUnits+group.plannedUnits<12)review.push(`${group.name} 已安排 ${group.passedUnits+group.plannedUnits}/12 学分；专业要求和未选择课程仍需核对。`);
  if(records.unresolved.some(r=>r.possibleMajors))review.push('部分课程属于两个专业，请确认学分归属；同一门课不能重复计算。');
  let outside=0;for(const code of allCodes){const c=byCode.get(code);if(c&&commerceOutsideElective(code))outside+=c.units||0;if(COMMERCE_RESEARCH.includes(code))review.push(`${code} 是研究课程，需取得学院负责人许可并核实课程资格。`)}
  if(outside>4)invalid.push(`项目课程清单以外的课程已安排 ${outside} 学分，超过 4 学分上限。`);
  else if(outside)review.push(`项目课程清单以外的课程已安排 ${outside} 学分，须事先获得学院批准。`);
  if(allCodes.has('ECON7300')&&draft.selection.major2&&[draft.selection.major1,draft.selection.major2].includes('is')&&[draft.selection.major1,draft.selection.major2].includes('accounting'))review.push('ECON7300 替代信息系统选修 BISM7216 的安排与 CPA / CAANZ 认证目标有关，请按官方示例向学院确认。');
 }
 return {invalid:[...new Set(invalid)],review:[...new Set(review)]};
}
