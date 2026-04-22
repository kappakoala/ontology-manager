# AI 协作上下文 / AI Collaboration Context

> 这个文件是跨设备 AI 协作的"接力棒"。  
> 在任何一台新电脑上 clone 本项目后，把这个文件内容告诉 WorkBuddy，AI 就能立刻接上之前的进度。

---

## 项目基本信息

- **项目名称**：ontology-manager（知识本体管理工具）
- **GitHub**：`https://github.com/kappakoala/ontology-manager`
- **技术栈**：Node.js + Express 5 + better-sqlite3 + D3.js（单文件 SPA）
- **前端入口**：`public/index.html`（所有 HTML / CSS / JS 在一个文件）
- **服务启动**：`node src/server.js`，访问 `http://localhost:3737`
- **数据库**：`data/ontology.db`（SQLite，本地，不入 git）

---

## 方法论背景

### 两系统 × 五要素
- **主动系统**：主动解决问题、实现目标的一方
- **对象系统**：提出问题、被服务/管理的对象
- **五要素**：主体 / 行为 / 客体 / 时间 / 空间（两个系统都有完整五要素）
- `element_type` = 要素分类标签，`system_role` = 主动/对象系统标识
- **三层问题结构**：表象（phenomenon）→ 根源（root）→ 症结（crux）
- **17 种关系类型**：分类、包含、实施、利用、在、确认、提出、制定、表现、解决、实现、依据、参考、输入、输出、集约、前置

---

## 当前功能模块

| 模块 | 说明 |
|------|------|
| 本体浏览 | Protégé 三面板：领域树 / 概念列表 / 详情 |
| 知识图谱 | D3 力导向图，节点单击浮层详情，双击编辑，底部胶囊状态栏 |
| 问题目标管理 | 三层问题结构 |
| 本体建模 | 五步骤流程：上传 → 预览 → 概念抽取 → 关系发现 → 保存入库 |
| 全文搜索 | 全局概念搜索跳转 |
| 仪表盘 | 总览统计 |

---

## UI 设计规范

- **主题**：Dark Professional（OLED 暗色 + 学术知识管理风）
- **用户偏好**：简洁不冗余，空间利用率高，避免大块留白
- **动效**：偏好 fade-in 过渡，不喜欢元素占用过多垂直空间
- **工具栏**：图谱视图的控制按钮整合在底部居中的胶囊式状态栏
- **设计文档**：`DESIGN.md`（详细色彩、字体、间距、组件规范）

---

## 代码提交规范（必须遵守）

- **每次任务完成后，只要有代码修改，必须 commit 并 push 到 GitHub**
- commit message 格式：`feat/fix/refactor: 简短描述`，多项改动写 bullet 详情
- push 前先 `git pull --rebase origin main` 避免冲突

---

## 后端路由结构

```
src/
  server.js          # Express 入口
  routes/
    concepts.js      # 概念 CRUD
    relations.js     # 关系 CRUD（含 GET /:id 单条查询）
    domains.js       # 领域管理
    modeling.js      # 本体建模（上传/抽取/保存）
    search.js        # 全文搜索
    stats.js         # 统计数据
```

---

## 已知技术要点

- Express 5.x SPA fallback 使用 `'/{*path}'` 而非 `'*'`
- axios 返回数据包在 `r.data.data` 中（需二次解包）
- 图谱 API 返回 `edges` 字段，前端用 `links`（已做映射）

---

## 最近工作记录

### 2026-04-14
- 项目创建，方法论精读，基础功能完成，首次推送 GitHub

### 2026-04-15
- 全面重构为 Dark Professional 主题（`index.css` + 所有页面重写）
- 修复三个 React 白屏 bug（static 中间件顺序、axios 解包、API 路径）
- 精读方法论 v3.7，修正两系统五要素展示逻辑

### 2026-04-16
- 图谱：节点/关系单击就地详情浮层，双击编辑 Modal
- 图谱：工具栏整合到底部居中胶囊状态栏（统计信息 + 缩放 + 重置 + 标签切换）
- 本体建模页面 UI 重设计：极简点线步骤条 + 分栏布局 + section-card 扁平风格
- 后端：modeling.js 路由完成，relations.js 加 GET /:id 接口

### 2026-04-17
- 建立跨设备 AI 协作机制（context/ 目录 + AI_CONTEXT.md）
- 上午：前端 Ant Design 基础重构
- 下午前半段：4 skills 设计系统重构（但方向错误，用了亮色主题）
- 下午后半段：创建设计文档 DESIGN.md（Dark Professional 规范）

---

## 新设备上手清单

1. `git clone https://github.com/kappakoala/ontology-manager`
2. `cd ontology-manager && npm install`
3. `node src/server.js`
4. 打开 WorkBuddy，告诉 AI：**"读一下 context/AI_CONTEXT.md，接上之前的工作"**

---

*此文件由 AI 自动维护，每次有重大进展后更新。*
