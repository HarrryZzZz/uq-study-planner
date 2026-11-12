import {COMMERCE_FIELD_NAMES,commerceFieldMembership,commerceRequirementCategory} from './commerce-reference.js';
export const MAJORS={advertising:'Advertising',hr:'Human Resource Management',is:'Information Systems',innovation:'Innovation and Entrepreneurship',international:'International Business',law:'Law for Business',marketing:'Marketing',supply:'Supply Chain Management',sustainability:'Sustainability: Strategy and Leadership'};
export const COMBINATIONS={'ad-hr':['advertising','hr'],'ad-marketing':['advertising','marketing'],'ad-international':['advertising','international'],'hr-is':['hr','is'],'hr-international':['hr','international'],'hr-marketing':['hr','marketing'],'is-international':['is','international'],'is-marketing':['is','marketing'],'international-marketing':['international','marketing']};
const PROGRAM_REQUIRED=new Set(['FINM7409','MGTS7608','MGTS7301','MGTS7610','MGTS7621']);
export function selectedMajorNames(selection){const majors=selection.program==='5584'?COMMERCE_FIELD_NAMES:MAJORS;return (selection.major1?[selection.major1,selection.major2].filter(Boolean):COMBINATIONS[selection.id]||[selection.id]).map(id=>majors[id]).filter(Boolean)}
export function belongsToField(selection,course,name){if(selection.program==='5584'){const substitution=course?.code==='ECON7300'&&name==='Information Systems'&&[selection.major1,selection.major2].includes('is')&&[selection.major1,selection.major2].includes('accounting');return substitution||commerceFieldMembership(course?.code,name)}return Boolean(course?.categories?.some(c=>c===`${name} Compulsory Courses`||c===`${name} Elective Courses`))}
export function courseCategory(selection,course){
 if(selection.program==='5584'){const key=commerceRequirementCategory(selection,course?.code);return {key,label:({'program-required':'核心必修','major-required':'专业必修','major-elective':'专业选修','program-elective':'项目选修 / 研究候选','general-elective':'通用选修候选','unknown':'类型待核实'})[key]}}
 const categories=course?.categories||[],names=selectedMajorNames(selection);
 if(PROGRAM_REQUIRED.has(course?.code)||categories.includes('MBus Capstone Courses'))return {key:'program-required',label:'核心必修'};
 if(names.some(name=>categories.includes(`${name} Compulsory Courses`)))return {key:'major-required',label:'专业必修'};
 if(names.some(name=>categories.includes(`${name} Elective Courses`)))return {key:'major-elective',label:'专业选修'};
 if(/^[A-Z]{4}[7-9]\d{3}$/.test(course?.code||''))return {key:'general-elective',label:'通用选修候选'};
 return {key:'unknown',label:'类型待核实'};
}
