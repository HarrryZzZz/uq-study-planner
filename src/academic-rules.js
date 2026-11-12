// Only evaluate expressions made entirely from course codes and AND/OR operators.
// Natural-language conditions are deliberately kept as unknown for review.
export function courseExpression(text, codes) {
 if(!text || /^Not (verified|listed)/i.test(text)) return null;
 let prefix='';
 const expanded=text.toUpperCase().replace(/\b([A-Z]{4}\d{4}|\d{4})\b/g, token=>{
  if(/^[A-Z]{4}/.test(token)){prefix=token.slice(0,4);return token}
  return prefix ? prefix+token : token;
 });
 const tokens=expanded.match(/[A-Z]{4}\d{4}|\bAND\b|\bOR\b|[()+,]/g)||[];
 if(tokens.join('').length!==expanded.replace(/\s/g,'').length || !tokens.some(t=>/^[A-Z]{4}\d{4}$/.test(t)))return null;
 let pos=0;
 function primary(){const t=tokens[pos++];if(t==='('){const v=or();if(tokens[pos++]!==')')throw Error();return v}if(/^[A-Z]{4}\d{4}$/.test(t||''))return codes.has(t);throw Error()}
 function and(){let v=primary();while(tokens[pos]==='AND'||tokens[pos]==='+'){pos++;const right=primary();v=v&&right}return v}
 function or(){let v=and();while(tokens[pos]==='OR'||tokens[pos]===','){pos++;const right=and();v=v||right}return v}
 try{const value=or();return pos===tokens.length?value:null}catch{return null}
}

export function prerequisiteCheck(draft,index,course){
 const text=course?.prerequisite;
 if(!text||/^Not (verified|listed)/i.test(text))return {state:'unknown',message:`${course.code} 的先修要求尚未核实。`};
 const prior=draft.semesters.slice(0,index),planned=new Set(),passed=new Set();
 for(const semester of prior)for(const slot of semester.slots){const code=slot.course?.code||(/^[A-Z]{4}\d{4}$/.test(slot.original)?slot.original:null),grade=semester.progress?.grades?.find(g=>g.code===code)?.grade;if(code&&(grade===undefined||grade==='P'||(/^[0-7]$/.test(grade)&&Number(grade)>=4)))planned.add(code)}
 for(const semester of prior)for(const grade of semester.progress?.grades||[])if(grade.grade==='P'||(/^[0-7]$/.test(grade.grade)&&Number(grade.grade)>=4))passed.add(grade.code);
 if(courseExpression(text,passed)===true)return {state:'satisfied'};
 const state=courseExpression(text,planned)===true?'planned':'unknown';
 return {state,message:`${course.code} 的先修要求${state==='planned'?'已安排但尚未确认通过':'需核实'}：${text}`};
}

export function eligibilityCheck(course){
 const text=[course?.prerequisite,course?.restrictions].filter(Boolean).join(' ');
 // An explicit exclusive list of named non-business degrees is a restriction;
 // permission, prior study and other unstructured text still need human review.
 const exclusive=text.match(/\b((?:MArch|MURP|MUrbDevDes|MUPlan)(?:\s*(?:,|and|or)\s*(?:MArch|MURP|MUrbDevDes|MUPlan))*)\s+students only\b/i);
 if(exclusive)return {allowed:false,message:`${course.code} 的课程资料限制为指定专业学生：${exclusive[0]}。商学硕士选课资格不符合该记录，请核对实际学期及 UQ 许可。`};
 return {allowed:true};
}
