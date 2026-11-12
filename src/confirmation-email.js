import {courseRecords} from './course-progress.js';
// The user confirms the current term; calendar-year guesses do not establish enrolment.
export function emailCourses(draft,currentIndex=null,catalogue=[]){
 const completed=new Set(),current=new Set(),future=new Set();
 for(const record of courseRecords(draft,catalogue)){if(record.needsGradeReview)continue;if(record.status==='passed')completed.add(record.code);else if(record.status==='planned'){if(currentIndex===record.index)current.add(record.code);else if(currentIndex===null||record.index>currentIndex)future.add(record.code)}}
 return {completed:[...completed],current:[...current],future:[...future]};
}
export function createConfirmationEmail({name,studentId,courses,program='5583'}){
 const clean=x=>String(x||'').trim().replace(/[\r\n]+/g,' ');name=clean(name);studentId=clean(studentId);
 if(!name||!studentId)throw Error('请输入英文姓名和学生号。');
 const degree=program==='5584'?'Master of Commerce':'Master of Business';
 const lines=['Subject: Confirmation of Graduation Requirements','','Dear BEL Student Centre Team,','','I hope this email finds you well.',`My name is ${name}, and I am currently studying the ${degree} at the University of Queensland.`, '', 'I am writing to confirm whether I have met, or am on track to meet, the graduation requirements for my program.'];
 if(courses.completed.length)lines.push('',`I have completed the following courses: ${courses.completed.join(', ')}.`);
 if(courses.current.length)lines.push('',`I am currently studying the following courses: ${courses.current.join(', ')}.`);
 if(courses.future.length)lines.push('',`I plan to study the following courses: ${courses.future.join(', ')}.`);
 lines.push('','Could you please advise whether, after completing my planned courses, I would meet the graduation requirements, and whether there is anything else I need to complete or check?', '','I would also appreciate information regarding the graduation ceremony, including the date, registration process and important deadlines.','','Thank you very much for your help.','','Kind regards,',name,`Student ID: ${studentId}`,degree,'The University of Queensland');return lines.join('\n');
}
