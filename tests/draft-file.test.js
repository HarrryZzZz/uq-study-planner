import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,addCourse,moveReferenceCourse} from '../src/elective-plan.js';
import {exportDraft,parseDraft} from '../src/draft-file.js';
import {getReference} from '../src/reference-data.js';
import {getReference15} from '../src/reference-15.js';

const selection={id:'is',year:2027,intake:1,duration:'2'};
const resolve=s=>(s.duration==='1.5'?getReference15:getReference)(s.id,s.intake);
test('JSON export and import preserve selection, moved courses and elective choices',()=>{
 let draft=createDraft(selection,resolve(selection));
 const course={code:'BISM7213',name:'Securing Business Information',units:2,incompatible:''};
 draft=addCourse(draft,1,course,[course]);
 draft=moveReferenceCourse(draft,0,2,'MGTS7610',[]);
 const file=exportDraft(draft,['需核实']);
 assert.equal(file.validationSnapshot.status,'unverified');
 assert.deepEqual(parseDraft(JSON.stringify(file),resolve),draft);
});
test('import rejects unsupported versions, bad structures and altered course slots',()=>{
 const draft=createDraft(selection,resolve(selection));
 const file=exportDraft(draft);
 assert.throws(()=>parseDraft('{',resolve),/JSON/);
 assert.throws(()=>parseDraft(JSON.stringify({...file,schemaVersion:9}),resolve),/格式或版本/);
 const corrupt=structuredClone(file);corrupt.draft.semesters[0].slots[0].original='FAKE1234';
 assert.throws(()=>parseDraft(JSON.stringify(corrupt),resolve),/不匹配/);
 const bad=structuredClone(file);bad.draft.semesters[1].slots[2].course={code:'BISM7213',name:'Test',units:4};
 assert.throws(()=>parseDraft(JSON.stringify(bad),resolve),/不匹配/);
});
test('provisional choice survives export and import as an unverified position',()=>{
 const s={id:'is-marketing',year:2027,intake:1,duration:'1.5'};
 const draft=createDraft(s,resolve(s));
 const withFirst=addCourse(draft,2,{code:'MKTG7502',name:'Strategic Branding',units:2,incompatible:'',categories:['Marketing Elective Courses']},[]);
 const next=addCourse(withFirst,2,{code:'MKTG7503',name:'Consumer and Buyer Behaviour',units:2,incompatible:'',categories:['Marketing Elective Courses']},[]);
 // The last eligible position can be provisional; retain the source text.
 const provisional=next.semesters[2].slots.find(x=>x.original.includes('学分待核实'));
 assert.equal(provisional.course.code,'MKTG7503');
 assert.deepEqual(parseDraft(JSON.stringify(exportDraft(next)),resolve),next);
});
