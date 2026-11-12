// UQ Business School 2026 MCom program plan examples, transcribed as examples
// rather than as a substitute for the complete program requirements/course list.
export const COMMERCE_MAJORS={finance:'应用金融',is:'信息系统',accounting:'专业会计'};
export const COMMERCE_PDFS={'2':'https://business.uq.edu.au/files/120054/2026_MCom__2yr_Program_Plan.pdf','1.5':'https://business.uq.edu.au/files/120055/2026_MCom_1_5yr_Program_Plan.pdf'};
export const COMMERCE_NAMES={ACCT7101:'Accounting',BISM7202:'Information Systems for Management',ECON7002:'Economics for Commerce',FINM7401:'Finance',ACCT7102:'Financial Accounting',ACCT7103:'Auditing',ACCT7104:'Corporate Accounting',ACCT7107:'Management Accounting and Control',BISM7206:'Information Retrieval and Management',BISM7208:'Business Information Systems Capstone',BISM7233:'Data Analytics for Business',BISM7255:'Business Information Systems Analysis and Design',BISM7216:'Business Process Improvement',ECON7300:'Statistics for Business and Economics',LAWS7012:'Business Taxation',LAWS7023:'Business and Corporate Law'};
// Course names below follow the 2026 online requirements, which may differ
// from the earlier program-plan PDF (e.g. LAWS7012).
export const COMMERCE_FIELDS={
 finance:{source:'APPLIX5584',groups:[{rule:'从以下课程中修满 12 学分',courses:[['ACCT7106','Financial Statement Analysis'],['ECON7300','Statistics for Business & Economics'],['FINM7402','Corporate Finance'],['FINM7403','Portfolio Management'],['FINM7405','Financial Risk Management'],['FINM7406','International Financial Management'],['FINM7407','Financial Institutions and Markets']]}]},
 is:{source:'INFORX5584',groups:[{rule:'专业必修：全部修读，共 8 学分',courses:[['BISM7206','Information Retrieval and Management'],['BISM7208','Business Information Systems Capstone'],['BISM7233','Data Analytics for Business'],['BISM7255','Business Information Systems Analysis and Design']]},{rule:'专业选修：从以下课程中修满 4 学分',courses:[['BISM7213','Securing Business Information'],['BISM7216','Business Process Improvement'],['BISM7217','Machine Learning for Analysis'],['BISM7221','Information Systems Governance and Assurance']]}]},
 accounting:{source:'PROFEX5584',groups:[{rule:'专业必修：全部修读，共 12 学分',courses:[['ACCT7102','Financial Accounting'],['ACCT7103','Auditing'],['ACCT7104','Corporate Accounting'],['ACCT7107','Management Accounting and Control'],['LAWS7012','Australian Taxation Law'],['LAWS7023','Business and Corporate Law']]}]}
};
export const COMMERCE_PROGRAM_ELECTIVES=[['CYBR7003','Cyber Security Governance, Policy, Ethics and Law'],['ECON7021','The Macroeconomy'],['ECON7310','Elements of Econometrics'],['EIBS7301','Idea Management'],['IBUS7306','Globalisation & the World Economy'],['LAWS7855','Law, Technology and Global Business'],['RBUS7888','Business Industry Consultancy Project'],['RBUS7999','Business Industry Placement']];
export const COMMERCE_RESEARCH=['ACCT6101','ACCT6102','ACCT6104','BISM6211','FINM6401','FINM6402','FINM6403','RBUS6901','RBUS6902','RBUS6903','RBUS6904','RBUS6923','RBUS7981','RBUS7984','RBUS7985','RBUS7993','RBUS7995','RBUS7996'];
export const COMMERCE_FIELD_NAMES={finance:'Applied Finance',is:'Information Systems',accounting:'Professional Accounting'};
export const COMMERCE_CORE=['ACCT7101','BISM7202','ECON7002','FINM7401'];
export function commerceFieldMembership(code,name){const id=Object.keys(COMMERCE_FIELD_NAMES).find(k=>COMMERCE_FIELD_NAMES[k]===name);return Boolean(id&&COMMERCE_FIELDS[id].groups.some(g=>g.courses.some(c=>c[0]===code)))}
export function commerceRequirementCategory(selection,code){
 if(COMMERCE_CORE.includes(code))return 'program-required';
 const ids=[selection.major1,selection.major2].filter(Boolean);
 if(ids.some(id=>(id==='is'||id==='accounting')&&COMMERCE_FIELDS[id].groups[0].courses.some(c=>c[0]===code)))return 'major-required';
 if(code==='ECON7300'&&ids.includes('is')&&ids.includes('accounting'))return 'major-elective';
 if(ids.some(id=>COMMERCE_FIELDS[id]?.groups.some(g=>g.courses.some(c=>c[0]===code))))return 'major-elective';
 if(Object.keys(COMMERCE_FIELD_NAMES).some(id=>commerceFieldMembership(code,COMMERCE_FIELD_NAMES[id])))return 'program-elective';
 if(COMMERCE_PROGRAM_ELECTIVES.some(c=>c[0]===code)||COMMERCE_RESEARCH.includes(code))return 'program-elective';
 return /^[A-Z]{4}[7-9]\d{3}$/.test(code||'')?'general-elective':'unknown';
}
export function commerceOutsideElective(code){return !COMMERCE_CORE.includes(code)&&!Object.keys(COMMERCE_FIELD_NAMES).some(id=>commerceFieldMembership(code,COMMERCE_FIELD_NAMES[id]))&&!COMMERCE_PROGRAM_ELECTIVES.some(c=>c[0]===code)&&!COMMERCE_RESEARCH.includes(code)}
const core=['ACCT7101','BISM7202','ECON7002','FINM7401'];
const finance='?应用金融方向课程', is='?信息系统方向课程', elective='?MCom 选修课程', mix='?信息系统方向课程或 MCom 选修课程', fmix='?应用金融或信息系统方向课程', choice='?ECON7300 或 BISM7216（二选一，注意职业认证要求）';
const data={
 '2':{
  finance:[2,[core,[finance,finance,elective,elective],[finance,finance,elective,elective],[finance,finance,elective,elective]]],
  is:[3,[core,['BISM7206',mix,elective,elective],['BISM7233','BISM7255',is,elective],['BISM7208',mix,elective,elective]]],
  accounting:[4,[core,['ACCT7102','ECON7300','LAWS7023',elective],['ACCT7103','LAWS7012',elective,elective],['ACCT7104','ACCT7107',elective,elective]]],
  'accounting+finance':[5,[core,['ACCT7102','ECON7300','LAWS7023',finance],['ACCT7103','LAWS7012',finance,finance],['ACCT7104','ACCT7107',finance,finance]]],
  'finance+is':[6,[core,['BISM7206',finance,finance,fmix],['BISM7233','BISM7255',fmix,finance],['BISM7208',finance,finance,is]]],
  'accounting+is':{1:[7,[core,['ACCT7102','BISM7206',choice,'LAWS7023'],['ACCT7103','BISM7233','BISM7255','LAWS7012'],['ACCT7104','ACCT7107','BISM7208',is]]],2:[8,[core,['ACCT7102','BISM7206','LAWS7023',is],['ACCT7103','BISM7233','BISM7255',choice],['ACCT7104','ACCT7107','BISM7208','LAWS7012']]]}
 },
 '1.5':{
  finance:[2,[core,[finance,finance,finance,elective],[finance,finance,finance,elective]]],
  is:[3,[['ACCT7101','BISM7202','BISM7206','FINM7401'],['ECON7002','BISM7233','BISM7255',mix],['BISM7208',is,mix,elective]]],
  accounting:[4,[core,['ACCT7102','ACCT7107','ECON7300','LAWS7023'],['ACCT7103','ACCT7104','LAWS7012',elective]]]
 }
};
export function commerceReference(selection){
 const {duration,intake,major1,major2}=selection;
 if(!['2','1.5'].includes(duration)||![1,2].includes(intake)||!COMMERCE_MAJORS[major1]||(major2&&(!COMMERCE_MAJORS[major2]||major1===major2)))throw Error('请选择有效且不同的 Commerce 专业方向。');
 if(duration==='1.5'&&major2)throw Error('1.5 年制双专业暂无已录入的官方示例，请向 UQ 核实。');
 const key=major2?[major1,major2].sort().join('+'):major1;
 let ref=data[duration][key];if(ref&&!Array.isArray(ref))ref=ref[intake];
 if(!ref)throw Error('该专业组合暂无已录入的官方示例。');
 return {page:ref[0],semesters:structuredClone(ref[1]),label:[major1,major2].filter(Boolean).map(k=>COMMERCE_MAJORS[k]).join(' + '),source:COMMERCE_PDFS[duration],accounting:[major1,major2].includes('accounting')};
}
