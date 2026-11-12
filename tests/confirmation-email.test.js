import test from 'node:test';import assert from 'node:assert/strict';
import {emailCourses,createConfirmationEmail} from '../src/confirmation-email.js';
test('confirmation email excludes failed results, distinguishes user-confirmed current term, and preserves planned retakes',()=>{
 const d={semesters:[{slots:[{original:'TEST7001'},{original:'TEST7002'}],progress:{grades:[{code:'TEST7001',grade:'5'},{code:'TEST7002',grade:'3'}]}},{slots:[{original:'TEST7003'},{original:'TEST7002'}]},{slots:[{original:'TEST7004'}]}]};
 const courses=emailCourses(d,1);assert.deepEqual(courses,{completed:['TEST7001'],current:['TEST7003','TEST7002'],future:['TEST7004']});
 const body=createConfirmationEmail({name:'Student',studentId:'12345678',courses});assert.match(body,/completed the following courses: TEST7001/);assert.match(body,/currently studying.*TEST7003, TEST7002/);assert.doesNotMatch(body,/GPA/);assert.throws(()=>createConfirmationEmail({name:'',studentId:'',courses}));
});
