export const PREFERENCES=[
 {id:'any',label:'无所谓，我是学霸',description:'按照专业与开课情况推荐'},
 {id:'exam',label:'偏爱考试',description:'优先参考有考试的课程'},
 {id:'presentation',label:'偏爱演讲',description:'优先参考有演讲的课程'},
 {id:'no_exam',label:'不偏好考试',description:'优先参考汇总未标注考试的课程'},
 {id:'written',label:'偏爱报告与论文',description:'优先参考书面考核'},
 {id:'project',label:'偏爱项目实践',description:'优先参考项目类考核'},
 {id:'group',label:'偏爱团队合作',description:'优先参考明确标注团队考核的课程'},
];
export function validPreference(value){return PREFERENCES.some(p=>p.id===value)}
export function preferenceLabel(value){return PREFERENCES.find(p=>p.id===value)?.label||PREFERENCES[0].label}
export function assessmentTags(record){
 if(!record?.tasks?.length)return [];
 const tags=new Set();
 for(const item of record.tasks){
  const category=item.category||'',title=item.task||'',flags=(item.flags||[]).join(' '),weight=item.weight||'';
  const exam=/\bexamination\b|\bexam\b/i.test(category);
  if(exam){
   tags.add('考试');
   if(/\bmid[ -]?(?:semester|term)\b|\bin[ -]semester\b/i.test(title))tags.add('期中');
   if(/\bfinal\b|\bend[ -]of[ -]semester\b/i.test(title))tags.add('期末');
  }
  if(/\bpresentation\b/i.test(category))tags.add('演讲');
  if(/\bquiz(?:zes)?\b/i.test(category))tags.add('小测');
  if(/paper|report|essay|critique|reflection/i.test(category))tags.add('报告 / 论文');
  if(/\bproject\b/i.test(category))tags.add('项目');
  if(/team|group/i.test(flags+' '+weight))tags.add('团队');
 }
 return ['期中','期末','考试','演讲','小测','报告 / 论文','项目','团队'].filter(t=>tags.has(t));
}
export function preferenceMatch(preference,record){
 if(!record?.tasks?.length)return false;
 const tags=assessmentTags(record);
 if(preference==='exam')return tags.includes('考试');
 if(preference==='presentation')return tags.includes('演讲');
 if(preference==='no_exam')return !tags.includes('考试');
 if(preference==='written')return tags.includes('报告 / 论文');
 if(preference==='project')return tags.includes('项目');
 if(preference==='group')return tags.includes('团队');
 return false;
}
export function assessmentMatches(filter,record){
 if(filter==='all')return true;
 if(filter==='unknown')return !record?.tasks?.length;
 if(!record?.tasks?.length)return false;
 if(filter==='quiz')return assessmentTags(record).includes('小测');
 return preferenceMatch(filter,record);
}
