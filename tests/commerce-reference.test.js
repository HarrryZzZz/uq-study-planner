import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMERCE_FIELDS,COMMERCE_MAJORS,COMMERCE_PROGRAM_ELECTIVES,commerceReference} from '../src/commerce-reference.js';

test('all three Commerce fields show the 2026 official examples for each intake and duration',()=>{
 for(const duration of ['1.5','2'])for(const major1 of Object.keys(COMMERCE_MAJORS))for(const intake of [1,2]){
  const ref=commerceReference({duration,major1,intake});
  assert.equal(ref.semesters.length,duration==='1.5'?3:4);
  assert.ok(ref.semesters.every(s=>s.length===4));
  assert.deepEqual(ref.semesters.flat().filter(code=>['ACCT7101','BISM7202','ECON7002','FINM7401'].includes(code)).sort(),['ACCT7101','BISM7202','ECON7002','FINM7401']);
 }
});
test('all two-year dual field examples are order-independent and accounting/IS follows the intake-specific PDF',()=>{
 for(const pair of [['finance','is'],['finance','accounting'],['is','accounting']])for(const intake of [1,2]){
  const one=commerceReference({duration:'2',major1:pair[0],major2:pair[1],intake});
  const two=commerceReference({duration:'2',major1:pair[1],major2:pair[0],intake});
  assert.deepEqual(one.semesters,two.semesters);assert.equal(one.semesters.flat().length,16);
 }
 const s1=commerceReference({duration:'2',major1:'is',major2:'accounting',intake:1});
 const s2=commerceReference({duration:'2',major1:'is',major2:'accounting',intake:2});
 assert.equal(s1.page,7);assert.equal(s2.page,8);assert.notDeepEqual(s1.semesters,s2.semesters);
});
test('unsupported configurations do not silently borrow another degree ruleset',()=>{
 assert.throws(()=>commerceReference({duration:'1.5',major1:'is',major2:'finance',intake:1}),/暂无/);
 assert.throws(()=>commerceReference({duration:'2',major1:'is',major2:'is',intake:1}),/不同/);
 assert.throws(()=>commerceReference({duration:'2',major1:'marketing',intake:1}),/有效/);
});
test('official field course groups and programme electives remain distinct',()=>{
 assert.equal(COMMERCE_FIELDS.finance.groups[0].courses.length,7);
 assert.deepEqual(COMMERCE_FIELDS.is.groups.map(g=>g.courses.length),[4,4]);
 assert.equal(COMMERCE_FIELDS.accounting.groups[0].courses.length,6);
 assert.equal(COMMERCE_PROGRAM_ELECTIVES.length,8);
});
