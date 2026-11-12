# 资料来源与已知限制

## 官方来源

- [2026 年 Master of Business 项目要求（5583）](https://programs-courses.uq.edu.au/requirements/program/5583/2026)
- [2026 年两年制学习计划 PDF](https://business.uq.edu.au/files/120011/2026_MBus_2yr_Program_Plan.pdf)
- [2026 年 1.5 年制学习计划 PDF](https://business.uq.edu.au/files/120010/2026_MBus_1_5yr_Program_Plan.pdf)
- [UQ 课程资料](https://programs-courses.uq.edu.au/)和 [课程简介（ECP）](https://course-profiles.uq.edu.au/)，各课程数据中保存有对应链接。
- [UQ 成绩说明](https://my.uq.edu.au/information-and-services/manage-my-program/exams-and-assessment/final-grades)

`src/data/electives.json` 是从课程工作簿及历史网页资料整理的课程目录；`src/data/assessments.json` 是历史课程简介中的考核摘要。`outputs/uq_general_electives/` 下的两个 JSON 分别记录考核和开课资料采集情况，包括来源或检查状态。参考计划在 `src/reference-data.js` 和 `src/reference-15.js` 中。

资料为历史快照，不是持续更新的官方目录。课程内容、考核、资格和开课情况会随时间、校区和授课方式变化；未检索到的资料不表示不存在限制或不开课。

## 规划限制

- 支持 2026 年示例中列出的 1.5 年制和 2 年制单专业及双专业配置；PDF 未提供示例的配置不会生成完整安排。2027、2028 年沿用 2026 年参考，规则尚未核实。
- 1.5 年制涉及 8 学分既往学习认定，资格需 UQ 审核。
- 选修列表为候选课程，不代表全部符合商学硕士的选课及学分认定要求。
- 部分先修和相斥表达式可按课程代码和“且／或”关系检查；自然语言条件、特殊许可和历史资料缺失时需要人工核实。当前不能保证所有限制都被识别。
- 计划与历史开课记录不一致时，工具会提示核实；历史记录并不证明未来学期不开课。考核标签仅基于已有历史 ECP 摘要，未列考试不等于未来一定没有考试。
- 学期门数、可移动位置和超修条件包含本工具的规划约束，不能代替 UQ 对具体学生情况的审核。学业状态仅为规划参考，不能认定毕业资格。
- JSON 导入校验课程标识和结构；当前课程目录找不到的历史课程需要先核对资料版本。浏览器打印用于生成 PDF，无法判断打印是否被取消。

## 数据维护脚本

`npm run audit` 使用仓库内数据运行离线批量测试，并将结果保存在默认忽略的 `outputs/internal_testing/` 目录。`node scripts/build-assessments.mjs` 可根据已保留的 `assessment-audit.json` 重建运行时考核数据。

`python3 scripts/refresh-offerings.py` 可尝试重新检查官方课程页面；`scripts/collect-assessments.py` 和 `scripts/collect-archive-assessments.py` 用于历史考核采集。采集脚本需要网络，其中考核采集的 Python 依赖可在虚拟环境中通过 `pip install -r requirements-data.txt` 安装；首个脚本还依赖本地 `outputs/uq_general_electives/Course basic Info - general electives.xlsx` 工作簿；该工作簿默认不上传。采集会写入本地数据或核查记录，请先备份并复核后再覆盖。

原始 PDF、工作簿、检查中间文件及个人选课计划不在默认上传范围内。公开仓库前，请检查课程数据和摘要的使用、再分发条件；仓库代码许可证不会自动覆盖 UQ 或其他第三方内容。
# Master of Commerce (5584), 2026

Commerce supports interactive planning using its own core courses, field membership, 12-unit field targets and programme elective groups. It reuses the shared course catalogue, historical offerings, conflict information, assessments and planning UI; the seven additional Commerce research records are in `src/commerce-extra-courses.js`. The 2026 online programme rules and sample plans are recorded separately from Business. Research courses require Head of School approval.

* [2026 program requirements](https://programs-courses.uq.edu.au/requirements/program/5584/2026)
* [Applied Finance requirements](https://programs-courses.uq.edu.au/requirements/plan/APPLIX5584/2026)
* [Information Systems requirements](https://programs-courses.uq.edu.au/requirements/plan/INFORX5584/2026)
* [Professional Accounting requirements](https://programs-courses.uq.edu.au/requirements/plan/PROFEX5584/2026)
* [2026 two-year program examples](https://business.uq.edu.au/files/120054/2026_MCom__2yr_Program_Plan.pdf)
* [2026 1.5-year program examples](https://business.uq.edu.au/files/120055/2026_MCom_1_5yr_Program_Plan.pdf)

Prerequisites and incompatibilities are checked only where represented in the shared data and supported by the rule parser; unstructured restrictions and missing data require review. Actual offerings and future-year requirements are not confirmed. General electives are subject to a maximum of 4 units outside the MCom lists and prior approval. The Accounting/Information Systems double-field example includes a specific BISM7216 / ECON7300 substitution condition. The PDF and the online requirements use different names for LAWS7012. Refer to official current course information. The 1.5-year double field is not offered in this app because no example is included in the 2026 1.5-year plan; this is an application limitation, not a determination of UQ policy.

