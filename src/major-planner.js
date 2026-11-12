import {MAJORS,COMBINATIONS} from './course-category.js';
import {getReference,references} from './reference-data.js';
import {getReference15,references15} from './reference-15.js';
import {offeringCheck} from './elective-plan.js';
import {courseExpression,eligibilityCheck} from './academic-rules.js';
import {COMMERCE_MAJORS,commerceReference} from './commerce-reference.js';

export const majorLabels={advertising:'广告',hr:'人力资源管理',is:'信息系统',innovation:'创新与创业',international:'国际商务',law:'商业法律',marketing:'市场营销',supply:'供应链管理',sustainability:'可持续发展'};
const labels=majorLabels;
export function makeMajorSelection(selection,major1,major2=''){
 if(selection.program==='5584'){const result={...selection,id:`mcom:${major1}${major2?'+'+major2:''}`,major1,major2};commerceReference(result);return result}
 if(!MAJORS[major1]||(major2&&(!MAJORS[major2]||major1===major2)))throw Error('请选择两个不同且受支持的专业。');
 const ids=major2?[major1,major2]:[major1];
 const refs=selection.duration==='1.5'?references15:references;
 const match=Object.entries(COMBINATIONS).find(([id,pair])=>refs.some(r=>r.id===id)&&pair.length===ids.length&&pair.every(x=>ids.includes(x)));
 return {...selection,id:major2?(match?.[0]||`pair:${major1}+${major2}`):major1,major1,major2};
}
export function resolveMajorReference(selection,catalogue=[]){
 if(selection.program==='5584')return {...commerceReference(selection),id:selection.id,generated:false,note:'请根据所选专业完成 12 学分，实际选课资格及毕业要求请向 UQ 核实。'};
 const {duration,intake,id}=selection;if(!['1.5','2'].includes(duration)||![1,2].includes(intake))throw Error('不支持的学制或入学学期。');
 const refs=duration==='1.5'?references15:references,find=duration==='1.5'?getReference15:getReference;
 if(refs.some(r=>r.id===id))return {...find(id,intake),generated:false};
 if(!selection.major1||!selection.major2||selection.id!==`pair:${selection.major1}+${selection.major2}`||!MAJORS[selection.major1]||!MAJORS[selection.major2]||selection.major1===selection.major2)throw Error('不支持的专业组合。');
 if(!catalogue.length)throw Error('课程资料尚未加载，无法生成此组合的参考计划。');
 const majors=[selection.major1,selection.major2],byCode=new Map(catalogue.map(c=>[c.code,c]));
 const required=majors.map(m=>catalogue.filter(c=>(c.categories||[]).includes(`${MAJORS[m]} Compulsory Courses`)));
 const electives=majors.map(m=>catalogue.filter(c=>(c.categories||[]).includes(`${MAJORS[m]} Elective Courses`)));
 if(required.some((list,i)=>!list.length||list.some(c=>c.units!==2)||list.length>5||electives[i].length<5-list.length))throw Error('专业课程要求或可用选修资料不完整，无法生成该组合。');
 if(required[0].some(c=>required[1].some(b=>b.code===c.code)))throw Error('两个专业的必修课程存在重叠，学分分配规则尚需核实，暂无法生成计划。');
 const foundation=duration==='2'?['FINM7409','MGTS7301','MGTS7608','MGTS7610','MGTS7621']:['MGTS7610','MGTS7621'];
 const courses=[...new Set([...foundation,...required.flat().map(c=>c.code)])];
 if(courses.some(code=>!byCode.has(code)))throw Error('部分必修课程资料缺失，无法生成该组合。');
 const count=duration==='2'?4:3,total=count*4;
 const placeholders=majors.flatMap((m,i)=>Array.from({length:5-required[i].length},()=>`?${labels[m]}专业方向课程`));
 if(courses.length+placeholders.length>total)throw Error('所选专业的必修和选修要求超出计划位置，需向 UQ 核实。');
 const plan=Array.from({length:count},()=>[]),all=new Set(courses);plan[count-1].push('MGTS7621');
 for(const code of courses){const c=byCode.get(code);if(!eligibilityCheck(c).allowed)throw Error(`${code} 的课程资格需向 UQ 核实。`);const other=new Set(courses.filter(x=>x!==code));if(courseExpression(c.incompatible,other)===true)throw Error(`${code} 与计划必修课程存在不兼容条件，请向 UQ 核实。`)}
 const order=courses.filter(c=>c!=='MGTS7621').map(code=>({code,terms:Array.from({length:count},(_,i)=>i).filter(i=>offeringCheck({selection},i,byCode.get(code)).allowed)})).sort((a,b)=>a.terms.length-b.terms.length||a.code.localeCompare(b.code));
 if(order.some(x=>!x.terms.length))throw Error('已知历史开课记录下无法安排全部必修课程，请向 UQ 核实。');
 let attempts=0;
 function validPrerequisites(){for(let i=0;i<count;i++)for(const code of plan[i]){const c=byCode.get(code);if(courseExpression(c?.prerequisite,all)===true&&courseExpression(c.prerequisite,new Set(plan.slice(0,i).flat()))!==true)return false}return true}
 function allocate(n){if(++attempts>250000)return false;if(n===order.length)return validPrerequisites();const item=order[n];for(const i of item.terms){if(plan[i].length>=4)continue;plan[i].push(item.code);if(allocate(n+1))return true;plan[i].pop()}return false}
 if(!allocate(0))throw Error('无法在学制内安排已知必修课程，请核实先修、开课和学制要求。');
 while(courses.length+placeholders.length<total)placeholders.push('?选修课程 / 第二专业课程');
 for(const slot of placeholders){const i=plan.findIndex(s=>s.length<4);if(i<0)throw Error('没有足够的课程位置。');plan[i].push(slot)}
 return {id,label:majors.map(m=>labels[m]).join(' + '),page:1,semesters:plan,generated:true,note:'该组合没有适用的官方示例；系统根据 2026 课程清单生成参考草稿。专业学分分配、历史开课、先修及选修资格均需向 UQ 核实。'};
}
