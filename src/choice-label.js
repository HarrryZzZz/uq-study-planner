import {selectedMajorNames} from './course-category.js';
// The saved source text remains unchanged for round-trip and rules validation.
export function choiceLabel(original,selection){
 const text=String(original||'').replace(/^\?/,'');
 if(selectedMajorNames(selection).length!==1)return text;
 const parts=text.split(/\s*\/\s*/).filter(part=>!/^第二专业(?:课程)?$/.test(part.trim()));
 return parts.join(' / ')||'课程位置（要求待核实）';
}
