# 知识本体管理工具

> 基于《知识本体方法论说明 v3.7》设计，参考 [Protégé](https://github.com/protegeproject/protege) 本体编辑器理念，用 Node.js 开发的本地知识本体管理系统。

## ✨ 功能特性

- **三面板布局**：领域树 / 概念列表 / 属性关系详情（对标 Protégé 设计）
- **两系统五要素**：主动系统 / 对象系统 × 主体、行为、客体、时间、空间
- **三层问题结构**：表象（phenomenon）→ 根源（root）→ 症结（crux）
- **17 种关系类型**：分类、包含、实施、利用、在、确认、提出、制定、表现、解决、实现、依据、参考、输入、输出、集约、前置
- **D3 力导向图谱可视化**：节点可拖拽，颜色区分五要素类型
- **问题目标管理**：三层问题结构 + 目标指标量化管理
- **全文搜索**、**JSON 导入/导出**、**仪表盘总览**

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 访问
open http://localhost:3737
```

## 🏗️ 技术栈

| 层次 | 技术 |
|---|---|
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite（better-sqlite3） |
| 前端 | 原生 HTML/CSS/JS（无框架依赖） |
| 可视化 | D3.js v7 力导向图 |

## 📁 项目结构

```
ontology-manager/
├── src/
│   ├── server.js          # Express 主服务（端口 3737）
│   ├── db.js              # SQLite 初始化 + 种子数据
│   └── routes/
│       ├── concepts.js    # 概念 CRUD + 属性管理
│       ├── relations.js   # 关系 CRUD + 图谱数据
│       ├── domains.js     # 领域管理
│       ├── problems.js    # 问题目标管理
│       └── utils.js       # 搜索 / 导入导出 / 统计
├── public/
│   └── index.html         # 单页前端
├── data/                  # SQLite 数据库（运行时自动生成）
├── .gitignore
├── package.json
└── README.md
```

## 📖 方法论说明

本工具严格按照《知识本体方法论说明 v3.7》实现：

- **通用本体**：主体、行为、客体、时间、空间等核心概念预置
- **领域本体**：支持按行业/领域自定义概念层级
- **关系网络**：17 种标准关系类型覆盖本体间所有逻辑连接
- **问题分析**：三层因果链（表象→根源→症结）+ 指标量化

## 📄 许可证

ISC
