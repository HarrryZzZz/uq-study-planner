import {checkAddition,offeringPattern,offeringCheck,semesterFor,plannedCodes} from './elective-plan.js?v=20261109l';
import {prerequisiteCheck} from './academic-rules.js';
import {courseCategory} from './course-category.js?v=20261109l';
import {preferenceMatch} from './assessment.js?v=20261109l';

// Academic category precedes offering evidence, then assessment preference.
// Missing data remains unknown; this ranking does not establish eligibility.
export function guidedCandidates(draft,index,catalogue,assessments={}){
 const {year,term}=semesterFor(draft,index),planned=new Set(plannedCodes(draft));
 const rank={'program-required':0,'major-required':1,'major-elective':2,'program-elective':3,'general-elective':4};
 return catalogue.flatMap(course=>{
  if(draft.selection.program!=='5584'&&(course.categories||[]).includes('MCom Research Courses'))return [];
  let category=courseCategory(draft.selection,course),typeRank=rank[category.key];
  const program=draft.selection.program!=='5584'&&(course.categories||[]).some(c=>/MBus Program Elective Courses|MBus Research Courses/.test(c));
  if(program&&(category.key==='general-elective'||category.key==='unknown')){
   typeRank=3;category={...category,label:'项目选修 / 研究候选'};
  }
  if(typeRank===undefined)return [];
  const selected=planned.has(course.code),offering=offeringCheck(draft,index,course);
  const check=selected?null:checkAddition(draft,index,course,catalogue);
  const conflicts=check?.conflicts||[],allowed=!selected&&Boolean(check?.allowed)&&!conflicts.length;
  const reason=selected?'已安排在计划中，不能重复添加。':!offering.allowed?offering.message:!check?.allowed?check?.warnings?.join(' '):conflicts.length?conflicts.join(' '):'';
  const recorded=(course.offerings?.[String(year)]||[]).includes(term),pattern=offeringPattern(course);
  const historical=pattern==='both'||pattern===`s${term}`;
  const needsReview=prerequisiteCheck(draft,index,course).state!=='satisfied';
  const preference=preferenceMatch(draft.selection.preference||'any',assessments[course.code]);
  return [{course,category,selected,allowed,reason,recorded,historical,needsReview,preference,typeRank}];
 }).sort((a,b)=>{
  // Already selected stays last; other blocked choices remain visible after usable choices.
  const state=x=>x.selected?2:x.allowed?0:1;
  const availability=x=>x.recorded?0:x.historical?1:2;
  return state(a)-state(b)||a.typeRank-b.typeRank||availability(a)-availability(b)||
    (a.typeRank>=2?Number(b.preference)-Number(a.preference):0)||Number(a.needsReview)-Number(b.needsReview)||
    a.course.code.localeCompare(b.course.code);
 });
}
