// Official UQ course pages checked 11 November 2026. Older course pages are
// identified explicitly; missing offering years are unknown, not unavailable.
const rows=[
 ['ACCT6101','Financial Information in Capital Markets','Permission from Head of School','Not listed on the viewed page','Semester 1, 2027',{'2024':[1],'2025':[1],'2026':[1],'2027':[1]}],
 ['ACCT6102','Accounting in the Modern Financial Economy','Permission from Head of School','Not listed on the viewed page','Semester 2, 2025',{'2024':[2],'2025':[2]}],
 ['ACCT6104','Managerial Accounting Honours A','ACCT3104 + permission from Head of School','Not listed on the viewed page','Semester 1, 2019',{}],
 ['FINM6401','Corporate Finance Honours','(FINM2415 or 3401 or 3411) + permission from Head of School','Not listed on the viewed page','Semester 1, 2027',{'2024':[1],'2025':[1],'2026':[1],'2027':[1]}],
 ['FINM6402','Empirical Finance Honours','(FINM2416 or 3402 or 3412) + permission from Head of School','FINM7404','Semester 1, 2024',{'2024':[1]}],
 ['FINM6403','Critical Issues in Finance','(FINM2416 or 3402 or 3412) + permission from Head of School','Not listed on the viewed page','Semester 2, 2027',{'2024':[2],'2025':[2],'2026':[2],'2027':[2]}],
 ['RBUS6923','Scientific Methods in Commerce','Permission from Head of School','RBUS6900 or 6921 or 6922','Semester 1, 2027',{'2024':[1,2],'2025':[1,2],'2026':[1,2],'2027':[1,2]}]
];
export const COMMERCE_EXTRA_COURSES=rows.map(([code,name,prerequisite,incompatible,period,offerings])=>({code,name,units:2,level:'Research',url:`https://programs-courses.uq.edu.au/course.html?course_code=${code}`,prerequisite,incompatible,restrictions:'Research course; permission from Head of School required. Programme eligibility must be verified.',status:`Information valid for ${period}; eligibility not assessed`,categories:['MCom Research Courses'],offerings,offeringPage:{checked:true,url:`https://programs-courses.uq.edu.au/course.html?course_code=${code}`,checkedAt:'2026-11-11'}}));
