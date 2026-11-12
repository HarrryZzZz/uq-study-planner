import {plannedCodes} from './elective-plan.js?v=20261109l';

// Keep selected courses visible after unselected ones, without changing the plan.
export function catalogueCourses(catalogue,draft){
 const selected=new Set(draft?plannedCodes(draft):[]);
 return [...catalogue].sort((a,b)=>Number(selected.has(a.code))-Number(selected.has(b.code)));
}
