// Build the app's compact, dated assessment reference from the source audit.
import fs from 'node:fs/promises';
const input=JSON.parse(await fs.readFile('outputs/uq_general_electives/assessment-audit.json','utf8'));
const records={};
for(const [code,item] of Object.entries(input)){
 if(item.status!=='已核对考核汇总表'||!Array.isArray(item.tasks)||!item.tasks.length)continue;
 records[code]={year:item.year,term:item.term,campus:item.campus,mode:item.mode,url:item.url,
  checkedAt:item.archiveCheckedAt||item.checkedAt,archived:item.archiveStatus==='已核对历史版本',
  newerUnverified:Boolean(item.profile),tasks:item.tasks.map(({category,task,weight,flags})=>({category,task,weight,flags:flags||[]}))};
}
await fs.writeFile('src/data/assessments.json',JSON.stringify({source:'UQ published ECP assessment summaries; automatically extracted, not individually reviewed',records}));
console.log(`Prepared ${Object.keys(records).length} historical ECP records.`);
