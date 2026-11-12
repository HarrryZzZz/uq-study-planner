const codePattern=/^[A-Z]{4}\d{4}$/;
export function semesterCourses(semester,catalogue=[]){
 const found=new Map();
 for(const slot of semester?.slots||[]){
  const code=slot.course?.code||(!slot.course&&codePattern.test(slot.original)?slot.original:null);
  if(!code||found.has(code))continue;
  const course=catalogue.find(c=>c.code===code);
  const units=slot.course?.units??course?.units??2;
  found.set(code,{code,units});
 }
 return [...found.values()];
}
export function semesterUnits(semester,catalogue=[]){return Number.isFinite(semester?.progress?.recordedUnits)?semester.progress.recordedUnits:semesterCourses(semester,catalogue).reduce((sum,c)=>sum+c.units,0)}
export function gradingCourses(semester,catalogue=[]){
 // Previously recorded unit values belong to the saved academic snapshot.
 if(Array.isArray(semester?.progress?.grades))return semester.progress.grades.map(({code,units})=>({code,units}));
 return semesterCourses(semester,catalogue);
}
export function overloadEligibility(draft,index){
 if(index===0)return {eligible:false,reason:'尚无本计划中的前一全日制学期 GPA，首学期超修资格请向 UQ 核实。'};
 for(let i=index-1;i>=0;i--){
  const semester=draft.semesters[i],p=semester.progress;
  if(p?.recordedUnits>=6){if(typeof p.gpa!=='number')return {eligible:false,reason:'最近全日制学期没有可计算的 GPA，超修资格尚未核实。'};return p.gpa>=4.5?{eligible:true,gpa:p.gpa,index:i}:{eligible:false,gpa:p.gpa,index:i,reason:`最近一个全日制学期 GPA 为 ${p.gpa.toFixed(2)}，未达到 4.5。`};}
  // An unrecorded intervening full-time semester may change eligibility.
  if(!p)return {eligible:false,reason:'请先记录之前学期的 GPA，才能确认是否可选超过 8 学分。'};
 }
 return {eligible:false,reason:'尚无已记录 GPA 的全日制学期，不能确认是否可以超修。'};
}
export function loadCheck(draft,index,additionalUnits,catalogue=[]){
 const semester=draft.semesters[index];if(!semester)return {allowed:false,message:'目标学期无效。'};
 if(semester.progress)return {allowed:false,message:'该学期已记录完成，请先撤销完成状态再调整课程。'};
 const units=semesterUnits(semester,catalogue)+additionalUnits;
 if(index===0&&units>8)return {allowed:false,message:'第一学期最多安排 8 学分。'};
 if(units>10)return {allowed:false,message:'每学期最多安排 10 学分。'};

 return {allowed:true,units};
}
export function gradePoints(grade){
 if(grade==='P')return null;if(grade==='N')return 2;
 if(typeof grade==='string'&&/^[0-7]$/.test(grade))return Number(grade);
 throw Error('请为每门课程选择有效的最终成绩。');
}
export function calculateGrades(courses,grades){
 if(!Array.isArray(courses)||!courses.length||!grades||typeof grades!=='object')throw Error('请为每门课程选择最终成绩。');
 let weighted=0,gpaUnits=0,passedUnits=0;
 const entries=courses.map(course=>{
  const grade=grades[course.code],points=gradePoints(grade);
  if(!Number.isFinite(course.units)||course.units<=0)throw Error(`${course.code} 的学分尚未核实。`);
  if(points!==null){weighted+=points*course.units;gpaUnits+=course.units}
  if(grade==='P'||(points!==null&&points>=4))passedUnits+=course.units;
  return {code:course.code,units:course.units,grade};
 });
 return {grades:entries,gpa:gpaUnits?weighted/gpaUnits:null,gpaUnits,passedUnits};
}
export function completionPlan(draft,index,options={}){
 const original=draft.semesters[index];if(!original)throw Error('该学期无效。');
 if(original.progress&&!options.relocateRecorded)return {moves:[]};
 const pending=original.slots.filter(slot=>!slot.course&&typeof slot.original==='string'&&slot.original.startsWith('?'));
 if(!pending.length||index===draft.semesters.length-1)return {moves:[]};
 const remaining=semesterCourses(original).length;
 if(draft.semesters.length>=3&&remaining<3)throw Error('非最后学期至少需要安排 3 门课程，才能记录完成。');
 const next=structuredClone(draft),source=next.semesters[index],moves=[];
 for(let i=source.slots.length-1;i>=0;i--){
  const slot=source.slots[i];if(slot.course||typeof slot.original!=='string'||!slot.original.startsWith('?'))continue;
  let destination=-1;
  for(let j=index+1;j<next.semesters.length;j++){
   const sem=next.semesters[j];if(sem.progress)continue;
   const projected=semesterCourses(sem).length+sem.slots.filter(s=>!s.course&&!codePattern.test(s.original)).length;
   if(projected<5){destination=j;break}
  }
  if(destination<0)throw Error('后续学期没有足够的待选位置空间，请先调整计划。');
  source.slots.splice(i,1);next.semesters[destination].slots.push(slot);moves.push({from:index,to:destination});
 }
 return {moves};
}
export function completeSemester(draft,index,grades,catalogue=[],options={}){
 const semester=draft.semesters[index];if(!semester||(semester.progress&&!options.replace))throw Error('该学期无效或已记录完成。');
 const courses=gradingCourses(semester,catalogue);if(!courses.length)throw Error('该学期还没有已安排课程。');
 // Keep reading older aggregate-only records; the current UI always submits individual grades.
 let result;if(typeof grades==='number'){if(!Number.isFinite(grades)||grades<0||grades>7)throw Error('请输入 0 到 7 之间的学期 GPA。');result={gpa:grades};}else result=calculateGrades(courses,grades);
 const plan=completionPlan(draft,index,{relocateRecorded:Boolean(options.replace&&options.relocatePending)});
 const next=structuredClone(draft),source=next.semesters[index];
 if(plan.moves.length){let moveIndex=0;for(let i=source.slots.length-1;i>=0;i--){const slot=source.slots[i];if(slot.course||typeof slot.original!=='string'||!slot.original.startsWith('?'))continue;source.slots.splice(i,1);next.semesters[plan.moves[moveIndex++].to].slots.push(slot)}}
 next.semesters[index].progress={...result,recordedUnits:courses.reduce((n,c)=>n+c.units,0),courseCodes:courses.map(c=>c.code),recordedAt:new Date().toISOString()};return next;
}
export function reopenSemester(draft,index){const next=structuredClone(draft);if(!next.semesters[index]?.progress)throw Error('该学期没有完成记录。');delete next.semesters[index].progress;return next;}
export function progressSummary(draft){
 const records=draft.semesters.map(s=>s.progress).filter(Boolean),legacy=records.some(r=>!Array.isArray(r.grades));
 let weighted=0,gpaUnits=0,passedUnits=0;
 for(const r of records)for(const course of r.grades||[]){const points=gradePoints(course.grade);if(points!==null){weighted+=points*course.units;gpaUnits+=course.units}if(course.grade==='P'||(points!==null&&points>=4))passedUnits+=course.units}
 return {semesters:records.length,courses:records.reduce((n,s)=>n+s.courseCodes.length,0),units:records.reduce((n,s)=>n+s.recordedUnits,0),mean:!legacy&&gpaUnits?weighted/gpaUnits:null,passedUnits,legacy};
}
export function possibleDistributions(semesterCount,totalCourses){
 const out=[];
 function visit(seq){if(seq.length===semesterCount){if(seq.reduce((a,b)=>a+b,0)===totalCourses)out.push(seq.join(''));return}const i=seq.length;for(let n=i===semesterCount-1?2:3;n<=(i===0?4:5);n++)visit([...seq,n]);}
 if(Number.isInteger(semesterCount)&&semesterCount>0&&Number.isInteger(totalCourses))visit([]);
 return out;
}
