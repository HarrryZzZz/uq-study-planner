export const SOURCE = 'https://business.uq.edu.au/files/120011/2026_MBus_2yr_Program_Plan.pdf';
export const RULESET = {id:'uq-5583-2026-2y-preview-v1', year:2026, version:'1.0-preview', source:SOURCE, totalUnits:32, categories:{Foundation:6, Core:2, 'Field of study':10, Capstone:2, Elective:12}, status:'partial'};
const c=(code,name,category)=>({code,name,category,units:2});
export const CATALOGUE=[c('FINM7409','Financial Management for Decision Makers','Foundation'),c('MGTS7608','Business and Society','Foundation'),c('MGTS7301','Tools and Techniques for Business Analysis','Foundation'),c('MGTS7610','Management Communication','Core'),c('MGTS7621','Career Transition','Capstone'),c('IBUS7302','Operating International Business','Field of study'),c('MGTS7329','Cross Cultural Management','Field of study'),c('IBUS7306','Globalisation and The World Economy','Field of study'),c('IBUS7312','Doing Business in Asia','Field of study'),c('MGTS7604','International Human Resource Management','Field of study')];
export function generate(config){
 if(config.year!==2026 || ![1,2].includes(config.intake) || config.program!=='5583' || config.major!=='International Business' || config.duration!==2) throw Error('This configuration is not supported by the available data.');
 const semesters=Array.from({length:4},(_,i)=>{const n=config.intake-1+i;return {year:config.year+Math.floor(n/2),term:n%2+1,courses:[]}});
 // Allocate from categories, balancing load; only the documented final-semester capstone is fixed.
 const courses=CATALOGUE.filter(x=>x.category!=='Capstone');
 for(const course of courses){const index=semesters.reduce((best,s,i)=>s.courses.length<semesters[best].courses.length?i:best,0);semesters[index].courses.push({...course});}
 semesters[3].courses.push({...CATALOGUE.find(x=>x.category==='Capstone')});
 return {schemaVersion:1,program:'5583',programName:'Master of Business',ruleset:{...RULESET},config:{...config},semesters,createdAt:new Date().toISOString()};
}
export function validate(plan){
 const issues=[];const add=(severity,message,code)=>issues.push({severity,message,code});
 const courses=plan.semesters.flatMap(s=>s.courses);const seen=new Set();
 for(const course of courses){if(seen.has(course.code))add('invalid',`${course.code} is duplicated. Its units can only be counted once.`,course.code);seen.add(course.code);if(!CATALOGUE.some(c=>c.code===course.code&&c.units===course.units&&c.category===course.category))add('unverified',`${course.code}: course or category is not verified in the current dataset.`,course.code)}
 const unique=courses.filter((c,i)=>courses.findIndex(x=>x.code===c.code)===i);const units=unique.reduce((n,c)=>n+c.units,0);
 if(units<RULESET.totalUnits)add('invalid',`Only ${units} of ${RULESET.totalUnits} required units are assigned. Elective selections are still needed.`);
 if(units>RULESET.totalUnits)add('unverified',`The plan contains ${units} units; applicability of excess units has not been verified.`);
 for(const [category,required] of Object.entries(RULESET.categories)){const count=unique.filter(c=>c.category===category).reduce((n,c)=>n+c.units,0);if(count<required)add('invalid',`${category}: ${count} / ${required} units assigned.`)}
 for(const required of CATALOGUE.filter(c=>c.category==='Foundation'||c.category==='Core'||c.category==='Capstone'))if(!seen.has(required.code))add('invalid',`Required course ${required.code} is missing.`,required.code);
 const cap=plan.semesters.findIndex(s=>s.courses.some(c=>c.code==='MGTS7621'));if(cap>=0&&cap!==plan.semesters.length-1)add('unverified','MGTS7621 requires final results from the penultimate semester before enrolment; check the timing with UQ.','MGTS7621');
 add('unverified','Official course eligibility, prerequisites, incompatibilities, semester load limits and offering data are not yet verified. Confirm every course with UQ.');
 add('unverified','The 2026 program plan is reference guidance; the full program rules and elective list have not yet been independently verified.');
 return {status:issues.some(x=>x.severity==='invalid')?'invalid':'unverified',units,issues,checkedAt:new Date().toISOString()};
}
export function move(plan,code,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||!plan.semesters[from]||!plan.semesters[to])throw Error('Invalid destination semester.');const result=structuredClone(plan);const i=result.semesters[from].courses.findIndex(c=>c.code===code);if(i<0)throw Error('Course not found.');const [course]=result.semesters[from].courses.splice(i,1);result.semesters[to].courses.push(course);return result;}
export function parsePlan(text){let p;try{p=JSON.parse(text)}catch{throw Error('The file is not valid JSON.')}if(!p||p.schemaVersion!==1)throw Error('Unsupported plan schema version.');if(p.program!=='5583'||p.ruleset?.id!==RULESET.id||p.ruleset?.version!==RULESET.version)throw Error('This program or ruleset version is not supported. The saved ruleset was not replaced.');if(p.config?.year!==2026||p.config?.program!=='5583'||p.config?.major!=='International Business'||p.config?.duration!==2||![1,2].includes(p.config?.intake)||!Array.isArray(p.semesters)||p.semesters.length!==4)throw Error('The academic configuration or semesters are invalid.');for(let i=0;i<4;i++){const s=p.semesters[i],n=p.config.intake-1+i;if(s.year!==2026+Math.floor(n/2)||s.term!==n%2+1||!Array.isArray(s.courses))throw Error('The semester structure is invalid.');for(const c of s.courses)if(!c||typeof c.code!=='string'||!/^[A-Z]{4}\d{4}$/.test(c.code)||typeof c.name!=='string'||typeof c.category!=='string'||!Number.isFinite(c.units)||c.units<=0)throw Error('A course entry is invalid.')}return p;}
