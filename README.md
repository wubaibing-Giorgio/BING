# DING BISTRO AI Manager

DING BISTRO 餐厅数字化管理系统初始版：一个适合手机打开、可部署到 Vercel 的网页后台。

## 第一版功能

- 菜单管理：展示菜品、分类、价格和状态。
- 每日营业额记录：预留日期、金额、备注录入区域。
- 库存提醒：展示关键原料余量和补货提示。
- 会员记录：记录会员标签、最近到店和偏好。
- 员工排班：展示当天员工岗位和班次。
- 营销文案生成：预置 AI 营销文案卡片，后续可接入 OpenAI API。

## 技术方案

- Next.js App Router
- React + TypeScript
- 纯 CSS 响应式布局
- 适合部署到 Vercel

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 查看后台。

## 手机部署到 Vercel 的下一步

1. 用手机打开 GitHub，确认本仓库已经推送到你的 GitHub 账号。
2. 用手机浏览器打开 <https://vercel.com> 并登录。
3. 点击 **Add New Project**，选择这个 GitHub 仓库。
4. Framework Preset 选择 **Next.js**，其他配置保持默认。
5. 点击 **Deploy**。部署完成后，Vercel 会给你一个可用的网址。
6. 后续如果需要真实保存数据，可增加 Vercel Postgres、Supabase 或 Airtable；如果要让“营销文案生成”真正调用 AI，可增加 OpenAI API Key 环境变量。

## 后续建议

- 增加登录权限，避免后台被公开访问。
- 把示例数据改为数据库数据。
- 增加表单提交、编辑和删除功能。
- 接入 AI 文案生成接口。
