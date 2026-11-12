// 2026 UQ Master of Business, 1.5-year program plan; each row preserves the PDF's sample slots.
const M='MGTS7610', C='MGTS7621', E='?第二专业课程 / 选修课程', A='?广告专业方向课程', H='?人力资源管理专业方向课程', K='?市场营销专业方向课程', I='?信息系统专业方向课程', HI='?人力资源管理 / 信息系统专业方向课程', IK='?信息系统 / 市场营销专业方向课程', X='?信息系统 / 第二专业 / 选修课程', HR='?MGTS7601 或 MGTS7612（二选一）';
const ref=(id,label,page,s1,s2=s1,note='')=>({id,label,page,s1,s2,note});
export const references15=[
ref('advertising','广告',2,[['ADVT7508',M,E,E],[A,'?广告 / 第二专业 / 选修课程',E,E],['ADVT7506',C,A,E]]),
ref('hr','人力资源管理',3,[[HR,M,H,E],[HR,H,E,E],['MGTS7603',C,E,E]],undefined,'前两个学期的二选一位置应避免重复。'),
ref('is','信息系统',4,[['BISM7202','BISM7206',M,E],['BISM7233','BISM7255',X,X],[C,X,X,X]],undefined,'信息系统方向至少须完成 10 学分（5 门课程）。'),
ref('innovation','创新与创业',5,[[M,'EIBS7301','TIMS7329',E],['TIMS7301',E,E,E],['MGTS7308',C,'TIMS7332',E]],[[M,'TIMS7301',E,E],['EIBS7301','MGTS7308','TIMS7329',E],[C,'TIMS7332',E,E]]),
ref('international','国际商务',6,[['IBUS7302','IBUS7312',M,E],['MGTS7329','MGTS7604',E,E],['IBUS7306',C,E,E]],[['IBUS7302',M,'MGTS7329',E],['IBUS7306',E,E,E],['IBUS7312','MGTS7604',C,E]]),
ref('law','商业法律',8,[[M,'LAWS7023',E,E],['LAWS7855','LAWS7708',E,E],[C,'LAWS7853','LAWS7893',E]],[[M,'LAWS7023','LAWS7855',E],['LAWS7853','LAWS7893',E,E],[C,'LAWS7708',E,E]]),
ref('marketing','市场营销',9,[[M,'MKTG7501',E,E],[K,K,E,E],[C,'MKTG7512',K,E]]),
ref('supply','供应链管理',10,[[M,'IBUS7316','BISM7202',E],['MGTS7523','MGTS7527',E,E],[C,'IBUS7327',E,E]],[[M,'BISM7202','MGTS7527',E],['IBUS7316','IBUS7327',E,E],[C,'MGTS7523',E,E]]),
ref('sustainability','可持续发展：战略与领导力',11,null,[[M,'TIMS7328',E,E],['MGTS7309','TIMS7317',E,E],[C,'TIMS7333','TIMS7334',E]],'官方 PDF 要求 2026 年 S1 入学者联系学院获取个性化计划。'),
ref('ad-hr','广告 + 人力资源管理',12,[[M,'ADVT7508','MGTS7601','MGTS7612'],[A,A,H,H],['ADVT7506','MGTS7603',C,A]]),
ref('ad-international','广告 + 国际商务',13,[[M,'ADVT7508','IBUS7302','IBUS7312'],[A,A,'MGTS7329','MGTS7604'],['ADVT7506','IBUS7306',C,A]],[[M,'ADVT7508','IBUS7302','MGTS7329'],[A,A,'IBUS7306','IBUS7312'],['ADVT7506','MGTS7604',C,A]]),
ref('ad-marketing','广告 + 市场营销',14,[[M,'ADVT7508','MKTG7501',A],[A,A,K,K],['ADVT7506',C,'MKTG7512',K]]),
ref('hr-is','人力资源管理 + 信息系统',15,[[M,HR,'BISM7202','BISM7206'],['BISM7233','BISM7255','?MGTS7601 或 MGTS7612（二选一，学分待核实）',HI],['BISM7208','MGTS7603',C,HI]],undefined,'PDF 中第二学期的二选一位置未明确标注学分；请核实。'),
ref('hr-international','人力资源管理 + 国际商务',16,[[M,'IBUS7302','MGTS7601','MGTS7612'],[H,H,'MGTS7329','MGTS7604'],['IBUS7306','IBUS7312','MGTS7603',C]]),
ref('hr-marketing','人力资源管理 + 市场营销',17,[[M,'MGTS7601','MGTS7612','MKTG7501'],[H,H,K,K],['MGTS7603',C,'MKTG7512',K]]),
ref('is-international','信息系统 + 国际商务',18,[[M,'BISM7202','BISM7206','IBUS7302'],['BISM7233','BISM7255','MGTS7329','MGTS7604'],['IBUS7306','IBUS7312',C,I]],[[M,'BISM7202','BISM7206','IBUS7302'],['BISM7233','BISM7255','IBUS7306','IBUS7312'],['MGTS7329','MGTS7604',C,I]],'原 PDF 的 S2 示例中 MGTS7604 名称与课程代码不一致，请向 UQ 核实。'),
ref('is-marketing','信息系统 + 市场营销',19,[[M,'BISM7202','BISM7206','MKTG7501'],['BISM7233','BISM7255',K,IK],[C,'MKTG7512',K,'?信息系统 / 市场营销专业方向课程（学分待核实）']],undefined,'原 PDF 第三学期最后一个待选位置未明确标注学分，请核实。'),
ref('international-marketing','国际商务 + 市场营销',20,[[M,'IBUS7302','IBUS7312','MKTG7501'],['MGTS7329','MGTS7604',K,K],['IBUS7306',C,'MKTG7512',K]],[[M,'IBUS7302','MGTS7329','MKTG7501'],['IBUS7306','IBUS7312',K,K],['MGTS7604',C,'MKTG7512',K]])
];
export function getReference15(id,intake){const r=references15.find(x=>x.id===id);if(!r||![1,2].includes(intake))throw Error('不支持的专业或入学学期');return {...r,semesters:intake===1?r.s1:r.s2,page:r.page+(id==='international'&&intake===2?1:0)}}
