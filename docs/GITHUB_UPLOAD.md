# 上传到 GitHub

项目已准备好作为 Git 仓库使用，但不会自动创建远程仓库或上传。`.gitignore` 默认排除本地 PDF、Excel 工作簿、个人计划、系统缓存和生成的测试结果；原文件仍保留在电脑上。

## 使用 GitHub Desktop

1. 打开 GitHub Desktop，登录自己的 GitHub 账号。
2. 选择 **File → Add Local Repository**，选择项目文件夹；如果提示还不是仓库，按界面指引创建本地仓库。
3. 在 Changes 页面检查准备提交的文件，确认没有个人计划、工作簿、PDF 原件或其他不想公开的内容。
4. 填写提交说明并提交到本地仓库。
5. 选择 **Publish repository**，填写仓库名称，并按需要选择私有或公开，再发布。
6. 上传后打开仓库的 **Actions** 页面，查看自动测试结果。

GitHub Desktop 不可用时，也可在项目目录用命令行创建仓库并连接你自己创建的 GitHub 仓库：

```bash
git init -b main
git add .
git status
git commit -m "Initial project setup"
git remote add origin <你的仓库地址>
git push -u origin main
```

提交前请仔细查看 `git status`。`.gitignore` 只影响未被跟踪的文件；已经提交过的文件不会因新增忽略规则而自动从历史记录中消失。

## 上传前确认

- 检查课程数据及历史考核摘要能否按预期方式公开再分发；PDF 和工作簿原件默认不会上传。
- 不要把个人导出的选课计划或成绩作为项目数据提交；如计划文件改名，仍应检查是否含有个人信息。
- 仓库尚无代码许可证。如希望允许他人复制、修改或再分发代码，可由项目所有者选择并添加合适的许可证；它不会自动授予第三方课程资料的使用权。
- GitHub Actions 配置会在推送或提交 Pull Request 后运行 `npm test`。实际结果以仓库 Actions 页面为准。
