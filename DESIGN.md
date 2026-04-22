# 本体管理系统 - 设计文档

> 基于《知识本体方法论说明 v3.7》，参考 Protégé 本体编辑器设计理念

---

## 1. 设计原则

### 1.1 基于方法论的设计理念

#### 方法论根基
基于《知识本体方法论v3.7》（罗老师编著）和 `five-elements-ontology` 技能，构建符合方法论规范的设计体系。

#### 核心公式映射
```
UI设计 → 映射 → 方法论概念 → 实现 → 本体建模
    │               │               │
    ├── 五要素类型选择器 ←─ 主体、客体、行为、时间、空间
    ├── 两系统可视化 ←────── 主动系统 vs 对象系统
    ├── 关系建立器 ←─────── 利用、在、实施、解决
    └── 问题目标管理 ←───── 表象→根源→症结 → 目标
```

### 1.2 设计原则（方法论驱动）

| 原则 | 方法论对应 | UI/UX 体现 |
|:---|:---|:---|
| **五要素完整性** | 任何描述必须包含主体、行为、客体、时间、空间 | 创建概念时强制关联五要素 |
| **两系统对立性** | 主动系统 vs 对象系统的对立关系 | 可视化分组，颜色区分 |
| **行为是关系** | 行为是节点间的连接，不是节点 | 关系建立界面，行为类型选择器 |
| **Schema 层概念** | 主体/客体是类型层，不是具体实体 | 类型选择 → 实例创建的工作流 |
| **问题驱动设计** | 问题三层结构：表象→根源→症结 | 问题树视图，层次化展示 |
| **目标约束导向** | 目标解决/消除问题 | 目标-问题关联编辑器 |

### 1.3 核心理念
- **知识管理工具**：服务于专业知识本体构建，而非消费类应用
- **信息密度优先**：高空间利用率，避免大块留白
- **专业学术风**：严谨、高效、克制
- **方法论驱动**：所有设计决策基于知识本体方法论

### 1.4 设计关键词
| 关键词 | 含义 | 方法论关联 |
|:---|:---|:---|
| Dark Professional | OLED 暗色主题，减少视觉疲劳 | 支持长时间的知识工作 |
| 简洁不冗余 | 每个元素都有明确目的 | 符合方法论的形式化要求 |
| 学术知识管理风 | 参考 Protégé、Neo4j Browser 的克制美学 | 知识本体工具的标准风格 |
| fade-in 过渡 | 柔和的微交互，不打断工作流 | 平滑的概念关系建立 |
| 五要素完整性 | 所有概念必须关联五要素 | 方法论核心要求 |
| 两系统可视化 | 清晰展示主动/对象系统对立 | 方法论两系统理论 |
| 问题目标链 | 直观呈现问题三层结构和目标 | 方法论问题目标体系 |

---

## 2. 色彩系统

### 2.1 基础色板

```
背景色（由深到浅）：
├── #000000     - 纯黑（OLED 优化，工具栏、分隔线）
├── #0D0D0D     - 极深灰（主背景）
├── #171717     - 深灰（卡片、面板背景）
├── #1F1F1F     - 中深灰（悬浮/选中态）
└── #262626     - 次级面板

文字色（由浅到深）：
├── #FFFFFF     - 纯白（一级标题、重要数据）
├── #E5E5E5     - 浅灰（正文、标签）
├── #A3A3A3     - 中灰（次级文字）
└── #525252     - 深灰（禁用态、占位符）

边框色：
├── #2D2D2D     - 默认边框
├── #404040     - 悬浮边框
└── #525252     - 聚焦边框
```

### 2.2 语义色

```
主色调（Accent）：
├── #3B82F6     - 主蓝（按钮、链接、选中态）
├── #2563EB     - 深蓝（按钮悬浮）
└── #1D4ED8     - 更深蓝（按钮按下）

五要素配色（图表/标签）：
├── 主体        #F472B6  粉红
├── 行为        #60A5FA  蓝色
├── 客体        #34D399  绿色
├── 时间        #FBBF24  黄色
└── 空间        #A78BFA  紫色

状态色：
├── 成功        #22C55E  绿色
├── 警告        #F59E0B  橙色
├── 错误        #EF4444  红色
└── 信息        #3B82F6  蓝色

系统角色色：
├── 主动系统    #60A5FA  蓝色
└── 对象系统    #F472B6  粉色
```

### 2.3 颜色使用规则

| 场景 | 颜色 | 示例 |
|:---|:---|:---|
| 主按钮 | #3B82F6 | 上传、确认、保存 |
| 次级按钮 | #262626 + border | 取消、返回 |
| 概念标签 | 语义色 | 五要素分类 |
| 选中态 | #3B82F6 bg 10% | 当前选中概念 |
| 悬浮态 | #1F1F1F | 面板行悬浮 |
| 背景 | #0D0D0D | 页面背景 |
| 卡片 | #171717 | 内容卡片 |
| 边框 | #2D2D2D | 分割线 |

---

## 3. 字体系统

### 3.1 字体规范

```
主字体：
├── 中文        "PingFang SC", "Microsoft YaHei", system-ui
├── 英文        "SF Pro Text", -apple-system, system-ui
└── 代码/数据   "JetBrains Mono", "SF Mono", monospace

字号层级（行高 1.4）：
├── 页面标题    18px / font-weight: 600
├── 面板标题    14px / font-weight: 600
├── 正文        13px / font-weight: 400
├── 标签/小字   12px / font-weight: 400
└── 代码/数字   13px / font-weight: 400（等宽）
```

### 3.2 字号使用规则

| 场景 | 字号 | 字重 |
|:---|:---|:---|
| 页面大标题 | 18px | 600 |
| 面板标题栏 | 14px | 600 |
| 概念名称 | 13px | 500 |
| 属性标签 | 12px | 400 |
| 属性值 | 13px | 400 |
| 关系类型 | 12px | 400 |
| 搜索框 | 13px | 400 |

---

## 4. 方法论类型系统设计

基于 `five-elements-ontology` 技能和知识本体方法论的类型体系。

### 4.1 五要素类型设计

#### 类型层级结构
```
类型层 (Schema) ←───── 实例化 ─────→ 实例层 (Instances)
    │                                      │
    ├── SubjectType                     ├── SubjectInstance
    ├── ObjectType                      ├── ObjectInstance  
    ├── ActionType (作为关系类型)        ├── ActionEdge (关系)
    ├── TimeType                        ├── TimeInstance
    └── SpaceType                       └── SpaceInstance
```

#### 设计规范
| 类型 | 颜色 | 图标 | UI表现形式 |
|:---|:---|:---|:---|
| **主体** | #F472B6 | 👤 | 圆形节点，粉色边框 |
| **客体** | #34D399 | 📦 | 方形节点，绿色边框 |
| **行为** | #60A5FA | 🔗 | 连线，蓝色箭头 |
| **时间** | #FBBF24 | ⏰ | 菱形节点，黄色边框 |
| **空间** | #A78BFA | 🗺️ | 六边形节点，紫色边框 |

### 4.2 两系统设计规范

#### 系统标签
```
系统标签 (SystemLabel)
├── 主动系统 (Active System)
│   ├── 颜色: #60A5FA (蓝色)
│   ├── 图标: 🎯
│   └── 角色: 解决问题，设定目标
│
└── 对象系统 (Objective System)
    ├── 颜色: #F472B6 (粉色)
    ├── 图标: ❓
    └── 角色: 提出问题，被服务
```

#### 对立关系可视化
```css
/* 主动系统 vs 对象系统的对立关系 */
.system-opposition {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-active {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid #60A5FA;
}

.system-objective {
  background: rgba(244, 114, 182, 0.1);
  border: 1px solid #F472B6;
}

.opposition-line {
  border: 1px dashed #525252;
  width: 40px;
  margin: 0 12px;
}
```

### 4.3 问题目标类型设计

#### 问题三层结构
| 层级 | 颜色 | 图标 | 描述 |
|:---|:---|:---|:---|
| **表象** (phenomenon) | #A78BFA | 🌊 | 表面现象，最直观的问题 |
| **根源** (root) | #FBBF24 | 🔍 | 根本原因，需要分析发现 |
| **症结** (crux) | #EF4444 | ⚡ | 核心因素，最关键的限制 |

#### 目标类型
| 属性 | 设计规范 |
|:---|:---|
| **颜色** | #22C55E (绿色) |
| **图标** | 🎯 |
| **可视化** | 进度条 + 数值显示 |
| **关系** | 与问题关联的虚线箭头 |

### 4.4 类型选择器设计

#### 五要素选择器
```
┌─────────────────────────────────────────┐
│ 选择类型                                │
├─────────────────────────────────────────┤
│  ○ 主体         ○ 客体        ○ 行为    │
│  ○ 时间         ○ 空间                  │
│                                           │
│  [ 取消 ]                  [ 确认 ]      │
└─────────────────────────────────────────┘
```

#### 系统角色选择器
```
┌─────────────────────────────────────────┐
│ 系统角色                                │
├─────────────────────────────────────────┤
│  ● 主动系统 (解决问题，设定目标)         │
│  ○ 对象系统 (提出问题，被服务)          │
│                                           │
│  [ 取消 ]                  [ 确认 ]      │
└─────────────────────────────────────────┘
```

### 4.5 与 five-elements-ontology 技能集成

#### 命令映射表
| UI操作 | 技能命令 | 输出 |
|:---|:---|:---|
| 创建主体实例 | `create-subject` | SubjectInstance |
| 创建客体实例 | `create-object` | ObjectInstance |
| 建立利用关系 | `relate-utilizes` | utilizes 关系 |
| 建立解决关系 | `relate-solves` | solves 关系 |
| 建立对立关系 | `relate-opposes` | opposes 关系 |
| 创建问题 | `create-problem` | Problem |
| 创建目标 | `create-goal` | Goal |

#### 验证反馈
```json
{
  "operation": "create-subject",
  "success": true,
  "entity_id": "sub_abc123",
  "validation": {
    "required_properties": true,
    "system_role_valid": true,
    "type_exists": true
  }
}
```

---

## 5. 间距系统

### 5.1 基础间距单位

```
基准单位：4px

间距层级：
├── 2px     - 紧凑元素内间距（如标签内）
├── 4px     - 元素内最小间距
├── 8px     - 元素内标准间距
├── 12px    - 组件内间距
├── 16px    - 组件间间距
├── 20px    - 区块间间距
└── 24px    - 面板间间距
```

### 5.2 布局间距规则

| 场景 | 间距 |
|:---|:---|
| 面板内边距 | 16px |
| 面板间间隙 | 1px（深色分割线）|
| 卡片内边距 | 12px |
| 列表项高度 | 36px |
| 列表项间距 | 0（用分隔线）|
| 按钮内边距 | 8px 16px |
| 输入框高度 | 32px |

### 5.3 三面板布局

```
┌────────────┬──────────────────┬────────────┐
│  领域树    │    概念列表      │   详情    │
│  240px     │    弹性宽度      │   320px   │
│  固定      │                  │   固定    │
└────────────┴──────────────────┴────────────┘
```

---

## 6. 组件规范

### 5.1 按钮

#### 主要按钮（Primary）
```css
.btn-primary {
  background: #3B82F6;
  color: #FFFFFF;
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 150ms ease;
}

.btn-primary:hover {
  background: #2563EB;
}

.btn-primary:active {
  background: #1D4ED8;
}
```

#### 次级按钮（Secondary）
```css
.btn-secondary {
  background: transparent;
  color: #E5E5E5;
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 400;
  border: 1px solid #404040;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-secondary:hover {
  border-color: #525252;
  background: #1F1F1F;
}
```

#### 图标按钮
```css
.btn-icon {
  background: transparent;
  color: #A3A3A3;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.btn-icon:hover {
  background: #1F1F1F;
  color: #E5E5E5;
}
```

### 5.2 输入框

```css
.input {
  background: #0D0D0D;
  color: #E5E5E5;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid #2D2D2D;
  transition: border-color 150ms ease;
}

.input:hover {
  border-color: #404040;
}

.input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input::placeholder {
  color: #525252;
}
```

### 5.3 面板

```css
.panel {
  background: #171717;
  border: 1px solid #2D2D2D;
  border-radius: 8px;
}

.panel-header {
  height: 40px;
  padding: 0 16px;
  border-bottom: 1px solid #2D2D2D;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #E5E5E5;
}

.panel-body {
  padding: 12px;
}
```

### 5.4 概念卡片

```css
.concept-card {
  background: #171717;
  border: 1px solid #2D2D2D;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 150ms ease;
}

.concept-card:hover {
  border-color: #404040;
  background: #1F1F1F;
}

.concept-card.selected {
  border-color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
}

.concept-card .name {
  font-size: 13px;
  font-weight: 500;
  color: #E5E5E5;
  margin-bottom: 4px;
}

.concept-card .element-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--element-color-rgb), 0.2);
  color: var(--element-color);
}
```

### 5.5 标签（Tags）

```css
.tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  gap: 4px;
}

/* 五要素标签 */
.tag-subject    { background: rgba(244, 114, 182, 0.2); color: #F472B6; }
.tag-action     { background: rgba(96, 165, 250, 0.2); color: #60A5FA; }
.tag-object     { background: rgba(52, 211, 153, 0.2); color: #34D399; }
.tag-time       { background: rgba(251, 191, 36, 0.2); color: #FBBF24; }
.tag-space      { background: rgba(167, 139, 250, 0.2); color: #A78BFA; }

/* 系统角色标签 */
.tag-active     { background: rgba(96, 165, 250, 0.2); color: #60A5FA; }
.tag-objective  { background: rgba(244, 114, 182, 0.2); color: #F472B6; }
```

### 5.6 工具栏（底部胶囊式）

```css
.toolbar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #262626;
  border: 1px solid #404040;
  border-radius: 999px;  /* 胶囊形状 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #A3A3A3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.toolbar-btn:hover {
  background: #3B82F6;
  color: #FFFFFF;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #404040;
}
```

### 5.7 模态框

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #171717;
  border: 1px solid #2D2D2D;
  border-radius: 12px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #2D2D2D;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #2D2D2D;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

---

## 7. 动效规范

### 7.1 核心理念
- **fade-in 为主**：内容出现时使用淡入效果
- **不占用垂直空间**：不添加底部留白
- **快速响应**：150-200ms 过渡时间
- **可选禁用**：尊重 `prefers-reduced-motion`

### 7.2 动画定义

```css
/* 基础过渡 */
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}

/* fade-in 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);  /* 微小上移，增加层次感
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 元素进入 */
.animate-fade-in {
  animation: fadeIn var(--transition-normal) forwards;
}

/* 列表项依次进入 */
.stagger-item {
  opacity: 0;
  animation: fadeIn var(--transition-normal) forwards;
}
.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 50ms; }
.stagger-item:nth-child(3) { animation-delay: 100ms; }
.stagger-item:nth-child(n+4) { animation-delay: 150ms; }

/* 面板切换 */
.panel-slide {
  animation: fadeIn var(--transition-normal) forwards;
}

/* 悬浮反馈 */
.hover-lift {
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.hover-lift:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* 尊重减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.3 动效使用场景

| 场景 | 动效 |
|:---|:---|
| 页面/面板进入 | fadeIn 200ms |
| 列表项加载 | fadeIn + stagger 50ms |
| 下拉菜单展开 | slideDown 150ms |
| 模态框出现 | fadeIn + scale(0.95→1) 200ms |
| 悬浮反馈 | translateY(-1px) 150ms |
| 按钮点击 | scale(0.98) 100ms |
| 切换面板 | opacity 切换 150ms |

---

## 8. 模块设计规范

### 8.1 本体浏览（主视图）

```
┌──────────────────────────────────────────────────────────────┐
│  [搜索框..............................] [筛选▼] [视图▼]       │
├────────────┬─────────────────────────┬───────────────────────┤
│            │                         │                       │
│  领域树    │    概念列表/卡片视图     │    详情面板           │
│  (240px)   │    (flex: 1)            │    (320px)            │
│            │                         │                       │
│  ▼ 通用本体│  ┌─────┐ ┌─────┐       │  概念: 钻井平台       │
│    ▼ 主体  │  │概念1│ │概念2│       │  ──────────────────   │
│      人员  │  └─────┘ └─────┘       │  要素: 主体            │
│      设备  │  ┌─────┐ ┌─────┐       │  系统: 主动系统        │
│    ▼ 行为  │  │概念3│ │概念4│       │  ──────────────────   │
│      ...   │  └─────┘ └─────┘       │  属性:                 │
│            │                         │    别名: ...          │
│  + 新建领域│                         │    定义: ...          │
│            │                         │  ──────────────────   │
│            │                         │  关系:                 │
│            │                         │    - 实施→钻井作业    │
│            │                         │    - 利用→钻机设备     │
└────────────┴─────────────────────────┴───────────────────────┘
```

**规范要点：**
- 左侧领域树：固定 240px，可折叠子节点
- 中间概念区：卡片网格 or 列表视图，响应式
- 右侧详情：固定 320px，选中概念后显示
- 三面板等高，滚动独立

**方法论映射：**
- 领域树按五要素类型（主体、客体、行为、时间、空间）组织分类
- 概念卡片显示五要素类型标签（颜色编码）
- 详情面板显示系统角色（主动系统/对象系统）和完整五要素属性
- 支持按两系统筛选概念列表

### 8.2 知识图谱

```
┌──────────────────────────────────────────────────────────────┐
│  图谱标题                              [全屏] [导出] [关闭]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                        ┌──────┐                             │
│                        │ 节点1 │                             │
│                        └──┬───┘                             │
│                     ┌─────┴─────┐                           │
│                  ┌──┴──┐     ┌──┴──┐                        │
│                  │ 节点2│────│ 节点3│                        │
│                  └─────┘     └──────┘                        │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│    [节点数: 24] [关系数: 45]  │ [-] [+] [重置] [标签▼] [筛选▼]│
└──────────────────────────────────────────────────────────────┘
```

**规范要点：**
- 图谱占满主区域
- 节点颜色 = 五要素语义色
- 边颜色 = 系统角色色（主动/对象）
- 底部工具栏：居中胶囊式，统计 + 控制按钮
- 支持拖拽、缩放、聚焦

**方法论映射：**
- 节点形状区分五要素类型（圆形-主体、方形-客体、菱形-时间、六边形-空间、连线-行为）
- 边样式区分关系类型（实线-利用、虚线-解决、点线-对立）
- 支持按两系统分组显示（主动系统左侧、对象系统右侧）
- 图谱布局反映问题目标结构（问题节点→目标节点连线）

### 8.3 本体建模（五步骤）

```
┌──────────────────────────────────────────────────────────────┐
│  本体建模                                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ●────────●────────●────────●────────○                       │
│  1        2        3        4        5                        │
│  上传     预览     抽取     关系     保存                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐  →  ┌─────────────────────┐       │
│  │                     │     │                     │       │
│  │   原始文档           │     │   Markdown 预览     │       │
│  │   (上传区域)         │     │   (渲染结果)         │       │
│  │                     │     │                     │       │
│  └─────────────────────┘     └─────────────────────┘       │
│                                                              │
│  [上传文档] [从已有选择]                    [下一步 →]       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**规范要点：**
- 顶部步骤条：线性点线连接，可点击跳转已完成步骤
- 左右对照布局：原始文档 | 预览/解析结果
- fade-in 动画：步骤切换时内容淡入
- 紧凑间距：减少垂直空间浪费

**方法论映射：**
- 步骤3（抽取）：自动识别文本中的五要素（主体、行为、客体、时间、空间）
- 步骤4（关系）：基于方法论建立关系（利用、在、实施、解决）
- 步骤5（保存）：验证五要素完整性和两系统对立关系
- 集成 `five-elements-ontology` 技能进行本体验证和持久化

### 8.4 问题目标管理

```
┌──────────────────────────────────────────────────────────────┐
│  问题目标管理                              [+ 新增问题]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ 问题结构 ─────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │  ▼ 表象 (phenomenon)                                     │ │
│  │    • 钻井效率低下                                       │ │
│  │                                                          │ │
│  │    ▼ 根源 (root)                                         │ │
│  │      • 设备老化                                          │ │
│  │                                                          │ │
│  │        ▼ 症结 (crux)                                     │ │
│  │          • 资金投入不足                                  │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ 目标指标 ─────────────────────────────────────────────┐ │
│  │  指标名称          当前值    目标值    进度             │ │
│  │  ───────────────────────────────────────────────────── │ │
│  │  钻井周期(天)       45        30       33% ████░░░░░░ │ │
│  │  故障率(%)          8.5       3.0       65% ████████░ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**规范要点：**
- 左侧问题树：三层因果链，可折叠
- 右侧指标表：进度条可视化
- 问题层级用缩进 + 图标区分

**方法论映射：**
- 问题三层结构（表象→根源→症结）对应方法论的问题分解体系
- 目标与问题关联体现方法论的目标约束导向
- 问题节点关联五要素（哪个主体在何时何地遇到什么问题）
- 目标进度可视化反映方法论的问题解决过程

### 8.5 仪表盘

```
┌──────────────────────────────────────────────────────────────┐
│  仪表盘                                          [刷新]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ 领域数 │ │ 概念数 │ │ 关系数 │ │ 问题数 │               │
│  │   12   │ │  245   │ │  532   │ │   28   │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │   概念分布(五要素)   │ │   系统角色分布      │            │
│  │      饼图           │ │      饼图          │            │
│  └─────────────────────┘ └─────────────────────┘            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │   最近修改                                            │ │
│  │   • 钻井作业 - 新增关系 - 10分钟前                    │ │
│  │   • 钻机设备 - 编辑属性 - 30分钟前                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**规范要点：**
- 统计卡片：紧凑网格布局
- 图表区：统一风格，深色背景
- 紧凑间距：避免大块留白

**方法论映射：**
- 概念分布饼图按五要素分类展示本体完整性
- 系统角色分布饼图直观显示主动/对象系统比例
- 统计卡片反映方法论关键指标（概念数、关系数、问题数）
- 最近修改记录跟踪方法论驱动的建模活动

---

## 9. 可访问性规范

### 9.1 色彩对比

| 场景 | 最小对比度 |
|:---|:---|
| 正常文字（< 18px）| 4.5:1 |
| 大文字（≥ 18px）| 3:1 |
| UI 组件边界 | 3:1 |

### 9.2 键盘导航

- Tab 键顺序：搜索 → 筛选 → 内容区 → 操作按钮
- 图谱支持方向键导航节点
- Esc 关闭模态框
- Enter 确认操作

### 9.3 焦点指示

```css
:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}
```

---

## 10. 技术实现约定

### 10.1 CSS 变量

```css
:root {
  /* 背景 */
  --bg-primary: #0D0D0D;
  --bg-secondary: #171717;
  --bg-tertiary: #1F1F1F;
  --bg-elevated: #262626;

  /* 文字 */
  --text-primary: #FFFFFF;
  --text-secondary: #E5E5E5;
  --text-tertiary: #A3A3A3;
  --text-disabled: #525252;

  /* 边框 */
  --border-default: #2D2D2D;
  --border-hover: #404040;
  --border-focus: #525252;

  /* 主色 */
  --accent: #3B82F6;
  --accent-hover: #2563EB;
  --accent-active: #1D4ED8;

  /* 五要素色 */
  --color-subject: #F472B6;
  --color-action: #60A5FA;
  --color-object: #34D399;
  --color-time: #FBBF24;
  --color-space: #A78BFA;

  /* 状态色 */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  /* 间距 */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  /* 过渡 */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
}
```

### 9.2 组件命名

```
组件文件: PascalCase
  - ConceptTree.tsx
  - RelationPanel.tsx
  - GraphView.tsx

样式文件: same-name.css
  - ConceptTree.css
  - RelationPanel.css

CSS 类名: kebab-case
  - concept-card
  - panel-header
  - toolbar-btn
```

---

## 11. 设计检查清单

在完成 UI 开发后，逐项检查：

### 视觉规范
- [ ] 背景色使用 #0D0D0D / #171717
- [ ] 文字色使用 #FFFFFF / #E5E5E5 / #A3A3A3
- [ ] 主按钮使用 #3B82F6
- [ ] 五要素配色正确应用
- [ ] 无大块留白

### 交互规范
- [ ] fade-in 过渡动画正常
- [ ] 悬浮态有视觉反馈
- [ ] 胶囊工具栏居中
- [ ] prefers-reduced-motion 支持

### 可访问性
- [ ] 色彩对比度达标
- [ ] 焦点状态可见
- [ ] 键盘导航正常

---

*设计文档版本: v1.1*
*最后更新: 2026-04-17*
