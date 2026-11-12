import test from 'node:test';
import assert from 'node:assert/strict';
import {courseCategory} from '../src/course-category.js';
const config={id:'is-marketing'};
test('categorises program requirements and selected majors using catalogue data',()=>{
 assert.equal(courseCategory(config,{code:'MGTS7610'}).key,'program-required');
 assert.equal(courseCategory(config,{code:'BISM7202',categories:['Information Systems Compulsory Courses']}).key,'major-required');
 assert.equal(courseCategory(config,{code:'MKTG7512',categories:['Marketing Compulsory Courses']}).key,'major-required');
 assert.equal(courseCategory(config,{code:'BISM7213',categories:['Information Systems Elective Courses']}).key,'major-elective');
 assert.equal(courseCategory(config,{code:'ECON7000',categories:[]}).key,'general-elective');
 assert.equal(courseCategory(config,{code:'TEST6000',categories:[]}).key,'unknown');
});
