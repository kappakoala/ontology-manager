# 本体管理系统 - 功能规格说明书

> 基于《知识本体方法论说明 v3.7》和 `five-elements-ontology` 技能

---

## 1. 产品概述

### 1.1 产品定位
**专业本体建模与管理工具**，服务于知识工程专家、领域专家和系统分析师，用于构建、管理和维护符合两系统五要素方法论的知识本体。

### 1.2 核心价值
- **方法论驱动**：严格遵循两系统五要素知识本体方法论
- **自动化建模**：智能提取五要素，自动化建立关系
- **可视化探索**：多维知识图谱，直观展示本体结构
- **问题目标导向**：支持问题分解和目标跟踪
- **质量保证**：内置完整性验证，确保建模可靠性

### 1.3 目标用户
1. **知识工程师**：专业本体建模人员
2. **领域专家**：石油勘探、政务管理等领域的专家
3. **系统分析师**：需要分析复杂系统的专业人员
4. **项目管理者**：跟踪问题解决和目标达成

---

## 2. 核心功能架构

### 2.1 总体架构
```
┌─────────────────────────────────────────────────────────────┐
│                    用户界面层                                │
├─────────────────────────────────────────────────────────────┤
│  本体浏览  │  本体建模  │  知识图谱  │  问题目标  │  仪表盘  │
├─────────────────────────────────────────────────────────────┤
│               业务逻辑层（方法论引擎）                       │
│           ├───────── five-elements-ontology 技能 ─────────┤│
├─────────────────────────────────────────────────────────────┤
│                    数据层（本体存储）                         │
│         ├─ 文档存储 (JSON-LD/RDF/OWL) + 轻量级图数据库     ││
└─────────────────────────────────────────────────────────────┘
```

### 2.2 功能模块矩阵
| 模块 | 核心功能 | 方法论映射 | 技术实现 |
|:---|:---|:---|:---|
| **本体浏览** | 领域树导航、概念列表、详情查看 | 五要素分类、两系统筛选 | React + TypeScript + AntD |
| **本体建模** | 文档上传、要素提取、关系建立、异步任务管理 | 五步骤流程、完整性验证 | Hermes agent + 多技能协调 (markitdown + five-elements-ontology) + 异步任务队列 |
| **知识图谱** | 图可视化、关系探索、路径发现 | 五要素形状、系统分组 | vis.js / G6 + D3.js |
| **问题目标** | 问题分解、目标设定、进度跟踪 | 三层结构、目标约束 | 树状组件 + 进度条 |
| **仪表盘** | 统计指标、分布分析、活动监控 | 五要素分布、系统比例 | 图表库 + 数据分析 |

---

## 3. 详细功能规格

### 3.1 本体浏览模块

#### 3.1.1 功能列表
1. **领域树导航**
   - 按五要素类型组织（主体、客体、行为、时间、空间）
   - 支持多级分类和层级展开
   - 按系统角色（主动/对象）筛选
   - 快速搜索和定位

2. **概念列表视图**
   - 卡片视图（五要素标签、系统角色、基本信息）
   - 列表视图（紧凑表格，支持排序和筛选）
   - 批量操作（选择、导出、删除）
   - 快速编辑和查看详情

3. **概念详情面板**
   - 五要素完整属性展示
   - 系统角色标识
   - 关联关系列表（上游/下游）
   - 问题目标关联
   - 操作历史记录

4. **高级筛选和搜索**
   - 按五要素类型筛选
   - 按系统角色筛选
   - 按时间/空间范围筛选
   - 全文搜索（名称、别名、定义）
   - 保存筛选条件为视图

#### 3.1.2 用户流程
```
用户进入系统 → 选择领域 → 浏览概念树 → 选择概念 → 查看详情
          ↓
      搜索概念 → 应用筛选 → 查看结果 → 批量操作
```

#### 3.1.3 数据模型
```typescript
interface Concept {
  id: string;
  name: string;
  elementType: 'subject' | 'object' | 'action' | 'time' | 'space';
  systemRole: 'active' | 'objective';
  definition: string;
  aliases: string[];
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  domainId: string;
}

interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'utilizes' | 'solves' | 'opposes' | 'implements' | 'belongs_to';
  properties: {
    time?: string;
    space?: string;
    description?: string;
  };
}
```

### 3.2 本体建模模块（核心工作流）

**技术架构**：内置 Hermes agent，作为智能协调层，根据文档类型和任务需求，动态调用多个技能完成建模任务：

1. **文档处理技能**：`markitdown`（文档格式转换、OCR、ASR等）
2. **本体建模技能**：`five-elements-ontology`（五要素提取、关系建立、验证）
3. **AI分析技能**：LLM集成（GPT-4/Claude/GLM用于深度语义分析）

用户通过UI交互，Hermes agent解析意图，构建技能调用流水线，并处理返回结果。

#### 3.2.1 五步骤建模流程

**步骤1：文档上传**
- **多格式支持**：
  - **Office文档**：`.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx`
  - **PDF文档**：`.pdf`（包括扫描件）
  - **纯文本**：`.txt`, `.md`
  - **多媒体**：`.jpg`, `.png`, `.gif`, `.mp3`, `.wav`, `.mp4`, `.avi`
  - **嵌入文件**：支持文档中嵌入的图片、表格等
- **批量上传支持**：同时上传多个文件，自动分类处理
- **文档预处理**：Hermes agent调用 `markitdown` 技能进行格式转换
- **文档元数据提取**：标题、作者、日期、文件大小、页数等
- **文档预览**：转换后的Markdown实时渲染，支持多媒体内容预览

**步骤2：文档预览与解析**
- **多格式解析引擎**：
  ```bash
  # Hermes agent根据文件类型调用相应技能
  文档上传 → Hermes: analyze-document → 技能: markitdown convert <file> --format=markdown
  ```
- **智能内容提取**：
  - **文本提取**：从PDF扫描件OCR识别文字
  - **表格提取**：从Excel/Word中提取结构化表格数据
  - **图片分析**：从图片中提取文字信息（OCR）
  - **音频转写**：从音频文件中提取语音内容（ASR）
  - **视频分析**：从视频中提取关键帧和字幕信息
- **结构化处理**：
  - 段落/章节智能划分
  - 标题层级自动识别
  - 列表、表格、代码块提取
  - 多媒体内容索引和链接
- **预览界面**：
  - 实时Markdown渲染
  - 关键信息高亮（实体、数字、日期等）
  - 文档结构树状导航
  - 多媒体内容内联预览

**步骤3：要素提取（AI辅助）**
- **Hermes agent智能提取**：
  ```
  流程：
    1. Hermes agent接收解析后的文本
    2. 调用 `five-elements-ontology/extract-elements` 技能
    3. 技能执行命名实体识别（主体、客体）
    4. 技能执行动作识别（行为动词）
    5. 技能执行时空信息提取（时间短语、地点短语）
    6. 技能执行关系识别（利用、解决、实施等）
    7. 返回候选五要素列表，带置信度评分
  ```
- **候选概念确认界面**：
  - 按置信度排序
  - 用户确认/修改/拒绝
  - 批量操作支持
  - 相似度去重

**步骤4：关系建立**
- **自动关系推理**：
  - 基于语法结构（主谓宾）
  - 基于语义角色（施事、受事、工具）
  - 基于领域规则（石油勘探特定关系）
- **手动关系编辑**：
  - 拖拽式关系建立
  - 关系类型选择器
  - 时空属性填写
  - 关系验证（类型匹配、循环检查）

**步骤5：保存与验证**
- **完整性验证**：
  ```python
  # five-elements-ontology 验证逻辑
  def validate_concept(concept):
      # 1. 五要素完整性检查
      if not concept.elementType:
          return "缺少要素类型"
      
      # 2. 系统角色检查
      if concept.elementType in ['subject', 'object'] and not concept.systemRole:
          return "主体/客体必须指定系统角色"
      
      # 3. 关系有效性检查
      for relation in concept.relations:
          if not is_valid_relation_type(relation.type, concept.elementType):
              return f"无效的关系类型: {relation.type}"
      
      return "验证通过"
  ```
- **保存选项**：
  - 保存到新领域
  - 合并到现有领域
  - 导出为标准格式（OWL, RDF）
  - 生成建模报告

#### 3.2.2 Hermes agent协调与技能集成

**协调机制**：UI操作触发Hermes agent，agent解析用户意图，调用相应的 `five-elements-ontology` 技能命令，并处理返回结果。

```bash
# UI操作 → Hermes agent → 技能命令 的映射
UI: 上传文档 → Hermes: parse-document → 技能: document-parse <file_path>
UI: 提取要素 → Hermes: extract-elements → 技能: extract-elements <text> --agent=hermes
UI: 创建主体 → Hermes: create-subject → 技能: create-subject <name> --role=active
UI: 建立关系 → Hermes: create-relation → 技能: relate-utilizes <source> <target> --time="2024" --space="北京"
UI: 验证本体 → Hermes: validate-ontology → 技能: validate <domain_id> --agent=hermes
```

**优势**：
- **意图理解**：Hermes agent能理解复杂用户指令，自动选择合适技能
- **错误处理**：技能执行失败时，agent可尝试替代方案或请求用户澄清
- **上下文保持**：agent维护会话上下文，实现多步骤建模的自然衔接
- **学习优化**：agent可根据用户反馈优化技能调用策略

#### 3.2.3 异步任务管理与通知

**背景**：真实的知识提取任务可能处理大文档（数百页PDF、数小时音视频），处理时间长，需要异步架构和进度通知。

**异步处理架构**：
```
用户提交任务 → 任务队列 → Hermes agent协调 → 技能执行 → 结果存储 → 用户通知
        ↑           ↓
    任务管理界面 ← 进度监控 ← 状态更新
```

**任务定义**：
- **任务类型**：文档解析、要素提取、关系建立、批量处理
- **任务参数**：输入文件、处理选项（OCR精度、AI模型选择等）、输出格式
- **任务优先级**：高、中、低（支持抢占式调度）
- **任务超时**：可配置处理时间上限（防止卡死）

**任务管理功能**：
1. **任务队列界面**：
   - 实时显示排队中、处理中、已完成、失败的任务
   - 任务详情查看（参数、进度、日志）
   - 任务控制（暂停、恢复、取消、重试）

2. **进度监控**：
   - **进度条**：显示总体进度和子步骤进度
   - **资源占用**：CPU/内存/磁盘使用情况
   - **预计完成时间**：基于历史数据智能预估
   - **实时日志**：可滚动查看处理日志

3. **通知机制**：
   - **系统通知**：任务状态变更时弹出桌面通知
   - **邮件通知**：可配置邮件提醒（完成、失败）
   - **Webhook集成**：支持外部系统集成（如飞书、钉钉）
   - **通知模板**：可自定义通知内容和格式

4. **大文档处理优化**：
   - **分片处理**：将大文档拆分为小片段并行处理
   - **断点续传**：支持处理中断后从断点恢复
   - **增量处理**：对已处理部分缓存结果，避免重复计算
   - **资源限制**：可配置并发任务数，防止系统过载

**技术实现**：
```typescript
interface AsyncTask {
  id: string;
  type: 'document-parse' | 'element-extract' | 'relation-build';
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  input: TaskInput;
  output?: TaskOutput;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  logs: string[];
  priority: 'high' | 'medium' | 'low';
}

// 任务调度器
class TaskScheduler {
  async submit(task: TaskInput): Promise<TaskId> { ... }
  async getStatus(taskId: string): Promise<TaskStatus> { ... }
  async cancel(taskId: string): Promise<void> { ... }
  async pause(taskId: string): Promise<void> { ... }
  async resume(taskId: string): Promise<void> { ... }
}
```

**用户工作流**：
```
1. 用户上传大文档（如500页PDF）
2. 系统创建异步任务，返回任务ID
3. 用户可离开页面或进行其他操作
4. 系统实时更新任务进度（可通过任务管理界面查看）
5. 任务完成时，用户收到通知
6. 用户查看处理结果，进行后续建模操作
```

### 3.3 知识图谱模块

#### 3.3.1 可视化功能
1. **图布局算法**
   - 力导向布局（默认）
   - 层次布局（按系统分组）
   - 径向布局（以核心概念为中心）
   - 自定义布局（保存和加载）

2. **节点与边样式**
   - **节点形状**：圆形（主体）、方形（客体）、菱形（时间）、六边形（空间）
   - **节点颜色**：五要素语义色
   - **节点大小**：基于中心度或关联度
   - **边样式**：实线（利用）、虚线（解决）、点线（对立）
   - **边颜色**：系统角色色（主动-蓝、对象-粉）

3. **交互功能**
   - 拖拽节点
   - 缩放和平移
   - 节点聚焦（展开关联节点）
   - 路径高亮（显示两个节点间的最短路径）
   - 子图提取（选择区域导出为子图）

4. **分析与探索**
   - 中心度分析（度中心度、接近中心度、中介中心度）
   - 社区检测（自动发现概念集群）
   - 路径查询（查找两个概念间的关系路径）
   - 模式匹配（查找特定结构模式）

#### 3.3.2 节点与边详情维护

1. **节点详情查看与编辑**
   - **右键菜单**：点击节点弹出上下文菜单（查看详情、编辑、删除、关联问题等）
   - **详情面板**：侧边栏显示节点完整属性（五要素信息、系统角色、定义、别名）
   - **快速编辑**：支持在详情面板内直接修改节点属性
   - **关联浏览**：显示该节点的所有关联节点和关系（上游/下游）

2. **边详情查看与编辑**
   - **边点击交互**：点击边高亮，显示关系类型和属性
   - **详情面板**：显示关系类型、时空属性、描述信息
   - **关系编辑**：支持修改关系类型、时空属性、添加描述
   - **关系验证**：检查关系两端节点的类型是否匹配（如主体只能利用客体）

3. **批量维护功能**
   - **多选操作**：支持框选多个节点/边进行批量操作
   - **属性批量更新**：为选中的多个节点更新相同属性（如统一修改系统角色）
   - **关系批量建立**：在选中的多个节点间批量建立关系
   - **导出选中项**：将选中的节点和边导出为子图文档

4. **维护工作流**
   ```
   发现节点问题 → 点击节点查看详情 → 编辑属性/关系 → 验证修改 → 保存到文档存储
         ↓
   发现关系问题 → 点击边查看详情 → 调整关系类型/属性 → 验证一致性 → 保存
   ```

#### 3.3.3 视图模式
1. **全系统视图**：展示整个领域的所有概念和关系
2. **五要素视图**：按要素类型分组显示
3. **两系统视图**：主动系统在左，对象系统在右，中间是问题-目标关系
4. **问题目标视图**：以问题为中心，展示关联的目标和解决方案
5. **时间序列视图**：按时间维度组织概念和关系

### 3.4 问题目标管理模块

#### 3.4.1 问题建模
1. **三层问题结构**
   - **表象层**（Phenomenon）：表面现象，可直接观察
   - **根源层**（Root）：根本原因，需要分析发现
   - **症结层**（Crux）：核心限制，最关键的因素

2. **问题属性**
   - 严重程度（低、中、高、严重）
   - 紧急程度（低、中、高、紧急）
   - 影响范围（局部、系统、全局）
   - 解决状态（未开始、进行中、已解决、已关闭）
   - 创建时间、最后更新时间

3. **问题关联**
   - 父子关系（问题分解）
   - 因果关系（A问题导致B问题）
   - 冲突关系（问题间存在矛盾）
   - 关联概念（问题涉及的主体、客体等）

#### 3.4.2 目标管理
1. **目标定义**
   - 目标描述（SMART原则）
   - 量化指标（KPI）
   - 期望值、当前值、目标值
   - 时间范围（开始时间、截止时间）

2. **目标-问题关联**
   - 一个目标可以解决多个问题
   - 一个问题可以被多个目标解决
   - 目标进度自动计算（基于关联问题的解决状态）

3. **进度跟踪**
   - 进度条可视化
   - 里程碑管理
   - 风险预警（进度滞后、指标异常）
   - 历史记录（进度变更日志）

#### 3.4.3 工作流
```
发现问题 → 分解问题（表象→根源→症结） → 设定目标 → 关联概念
    ↓                                             ↓
问题库管理 ← 跟踪进度 ← 执行解决方案 ← 制定方案
```

### 3.5 仪表盘与分析模块

#### 3.5.1 统计指标
1. **本体质量指标**
   - 概念总数、关系总数
   - 五要素分布（主体占比、客体占比等）
   - 系统角色分布（主动系统 vs 对象系统）
   - 平均关联度（每个概念的平均关系数）
   - 完整性评分（五要素完整的概念比例）

2. **建模活动指标**
   - 新增概念数（今日/本周/本月）
   - 新增关系数（今日/本周/本月）
   - 活跃用户数
   - 文档处理量
   - 建模成功率

3. **问题目标指标**
   - 问题总数（按严重程度、状态分布）
   - 目标完成率
   - 平均解决时间
   - 风险问题数（严重且紧急）

#### 3.5.2 可视化图表
1. **分布图表**
   - 五要素分布饼图
   - 系统角色分布饼图
   - 问题状态分布柱状图
   - 目标进度分布雷达图

2. **趋势图表**
   - 概念增长趋势线图
   - 建模活动热力图
   - 问题解决趋势图
   - 目标达成率趋势图

3. **关系网络图表**
   - 核心概念网络图
   - 问题-目标关联图
   - 跨领域关系图

#### 3.5.3 报告生成
- **本体质量报告**：完整性、一致性、可维护性评估
- **建模活动报告**：用户贡献、文档处理、要素提取统计
- **问题目标报告**：问题解决情况、目标达成情况
- **导出格式**：PDF、Word、Excel、Markdown

---

## 4. 数据模型与架构

### 4.1 存储策略

**核心理念**：采用文档格式作为主要存储，实现与图数据库的解耦，支持灵活的数据迁移和多数据库导入。

#### 4.1.1 文档存储格式
- **主要格式**：JSON-LD（JSON for Linked Data）
- **支持格式**：RDF/XML、Turtle、OWL/XML
- **自定义格式**：五要素本体专用JSON Schema

**文档结构示例**：
```json
{
  "@context": "https://ontology-manager.com/context/v1",
  "@type": "OntologyDocument",
  "domain": "petroleum-exploration",
  "concepts": [
    {
      "id": "concept_001",
      "name": "钻井平台",
      "elementType": "subject",
      "systemRole": "active",
      "definition": "海上石油开采的核心设施",
      "properties": {...}
    }
  ],
  "relations": [
    {
      "id": "rel_001",
      "sourceId": "concept_001",
      "targetId": "concept_002",
      "type": "utilizes",
      "properties": {
        "time": "2024年",
        "space": "南海"
      }
    }
  ],
  "problems": [...],
  "goals": [...]
}
```

#### 4.1.2 轻量级图数据库集成
- **可选数据库**：JanusGraph、ArangoDB、DGraph、Cayley
- **导入机制**：支持从文档格式自动导入到目标图数据库
- **数据同步**：文档为主，图数据库为衍生视图
- **多数据库支持**：可同时连接多个图数据库，便于比较和迁移

#### 4.1.3 导出与迁移
- **标准导出**：OWL、RDF、Neo4j Cypher脚本
- **批量迁移**：支持将整个领域导出为指定数据库格式
- **版本控制**：文档格式便于Git版本管理

### 4.2 核心实体
```typescript
// 领域（Domain）
interface Domain {
  id: string;
  name: string;
  description: string;
  industry: string; // 石油、政务、医疗等
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
}

// 概念（Concept） - 核心实体
interface Concept {
  id: string;
  domainId: string;
  name: string;
  elementType: ElementType; // 五要素类型
  systemRole?: SystemRole;   // 系统角色（仅主体/客体需要）
  definition: string;
  aliases: string[];
  properties: ConceptProperties;
  metadata: ConceptMetadata;
}

// 关系（Relation）
interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  properties: RelationProperties;
  createdBy: string;
  createdAt: Date;
}

// 问题（Problem）
interface Problem {
  id: string;
  domainId: string;
  title: string;
  description: string;
  level: ProblemLevel; // 表象、根源、症结
  severity: SeverityLevel;
  urgency: UrgencyLevel;
  status: ProblemStatus;
  parentId?: string; // 父问题ID
  relatedConceptIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 目标（Goal）
interface Goal {
  id: string;
  domainId: string;
  title: string;
  description: string;
  metric: GoalMetric;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  status: GoalStatus;
  relatedProblemIds: string[];
  relatedConceptIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.3 类型定义
```typescript
// 五要素类型
type ElementType = 'subject' | 'object' | 'action' | 'time' | 'space';

// 系统角色
type SystemRole = 'active' | 'objective';

// 关系类型
type RelationType = 
  | 'utilizes'      // 利用
  | 'solves'        // 解决
  | 'opposes'       // 对立
  | 'implements'    // 实施
  | 'belongs_to'    // 属于
  | 'causes'        // 导致
  | 'prevents'      // 防止
  | 'enhances';     // 增强

// 问题层级
type ProblemLevel = 'phenomenon' | 'root' | 'crux';

// 严重程度
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

// 紧急程度
type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

// 问题状态
type ProblemStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

// 目标状态
type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'abandoned';
```

### 4.4 方法论约束
```typescript
// 五要素完整性约束
function validateFiveElements(concept: Concept): ValidationResult {
  const errors: string[] = [];
  
  // 主体必须有关联的行为和客体
  if (concept.elementType === 'subject') {
    const hasActions = concept.relations.some(r => r.type === 'implements');
    const hasObjects = concept.relations.some(r => r.type === 'utilizes');
    
    if (!hasActions) errors.push('主体必须实施至少一个行为');
    if (!hasObjects) errors.push('主体必须利用至少一个客体');
  }
  
  // 行为必须有主体和客体
  if (concept.elementType === 'action') {
    const hasSubject = concept.incomingRelations.some(r => 
      r.type === 'implements' && r.source.elementType === 'subject'
    );
    const hasObject = concept.outgoingRelations.some(r => 
      r.type === 'utilizes' && r.target.elementType === 'object'
    );
    
    if (!hasSubject) errors.push('行为必须由主体实施');
    if (!hasObject) errors.push('行为必须作用于客体');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 两系统对立约束
function validateSystemOpposition(activeSystem: Concept[], objectiveSystem: Concept[]): ValidationResult {
  const errors: string[] = [];
  
  // 检查主动系统和对象系统之间的对立关系
  const hasOppositionRelations = activeSystem.some(active => 
    objectiveSystem.some(objective => 
      existsRelation(active.id, objective.id, 'opposes')
    )
  );
  
  if (!hasOppositionRelations) {
    errors.push('主动系统和对象系统之间必须存在对立关系');
  }
  
  // 检查问题-目标关联
  const activeProblems = activeSystem.filter(c => 
    c.relatedProblems?.some(p => p.level === 'crux')
  );
  const objectiveGoals = objectiveSystem.filter(c => 
    c.relatedGoals?.some(g => g.status === 'in_progress')
  );
  
  if (activeProblems.length === 0 || objectiveGoals.length === 0) {
    errors.push('系统间应通过问题-目标关系连接');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## 5. 用户角色与权限

### 5.1 角色定义
| 角色 | 描述 | 权限 |
|:---|:---|:---|
| **管理员** | 系统管理员，全权管理 | 所有权限，包括用户管理、系统配置 |
| **领域所有者** | 特定领域的管理者 | 领域内所有操作，管理领域成员 |
| **建模专家** | 专业本体建模人员 | 创建/编辑概念和关系，管理问题目标 |
| **领域专家** | 领域知识提供者 | 浏览、评论、建议，有限编辑 |
| **观察者** | 只读访问者 | 浏览和搜索，无编辑权限 |

### 5.2 权限矩阵
| 操作 | 管理员 | 领域所有者 | 建模专家 | 领域专家 | 观察者 |
|:---|:---|:---|:---|:---|:---|
| 创建领域 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 删除领域 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 添加成员 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 创建概念 | ✅ | ✅ | ✅ | ✅* | ❌ |
| 编辑概念 | ✅ | ✅ | ✅ | ✅* | ❌ |
| 删除概念 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 建立关系 | ✅ | ✅ | ✅ | ✅* | ❌ |
| 创建问题 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 设定目标 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看统计 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 导出数据 | ✅ | ✅ | ✅ | ✅ | ✅ |

> *注：领域专家的编辑权限可能需要审核或限于特定类型的概念

---

## 6. 技术实现方案

### 6.1 前端技术栈
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **UI组件库**：Ant Design 6.x
- **状态管理**：Zustand / Redux Toolkit
- **图表可视化**：Ant Design Charts + G6（图可视化）
- **路由**：React Router 6
- **HTTP客户端**：Axios
- **富文本编辑器**：TipTap / Quill
- **Markdown渲染**：react-markdown + remark-gfm

### 6.2 后端技术栈
- **运行时**：Node.js 20+ / Python FastAPI
- **数据库**：
  - 本体存储：JSON-LD文档 + 轻量级图数据库（可选，如JanusGraph、ArangoDB）
  - 关系数据库：PostgreSQL（用户、权限、元数据）
  - 缓存：Redis（会话、缓存）
- **文件存储**：MinIO / AWS S3（文档存储）
- **搜索**：Elasticsearch（全文搜索）
- **消息队列**：RabbitMQ / AWS SQS（异步任务）

### 6.3 AI/ML能力集成
- **NLP服务**：
  - 实体识别（spaCy / Stanza）
  - 关系提取（预训练模型 + 规则）
  - 文本分类（问题类型识别）
- **向量搜索**：FAISS / Pinecone（语义搜索）
- **LLM集成**：
  - GPT-4 / Claude / GLM（要素提取）
  - 本地模型（数据安全考虑）
- **five-elements-ontology技能**：Python脚本 + CLI接口

### 6.4 部署架构
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端(CDN)     │────▶│   API网关       │────▶│   应用服务器    │
│  React App      │     │  Nginx/ALB      │     │  Node.js/Python │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                           ┌──────────────┼──────────────┐
                                           │              │              │
                                    ┌──────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
                                    │  图数据库   │ │  关系DB    │ │  搜索服务  │
                                    │   Neo4j    │ │ PostgreSQL │ │ Elasticsearch│
                                    └─────────────┘ └────────────┘ └─────────────┘
```

### 6.5 CLI设计（第三方智能体集成）

**目标**：提供命令行接口，便于第三方智能体、自动化脚本和开发者集成本体管理系统能力。

**设计原则**：
1. **一致性**：CLI命令结构与REST API端点对应
2. **易用性**：简洁的命令语法，清晰的帮助文档
3. **可扩展性**：支持插件机制，便于扩展新功能
4. **跨平台**：支持Windows、macOS、Linux
5. **配置管理**：支持环境变量、配置文件、命令行参数

**核心命令设计**：
```bash
# 认证与配置
om-cli login [--api-url <url>] [--token <token>]
om-cli logout
om-cli config set <key> <value>
om-cli config list

# 任务管理
om-cli task submit <file> [--type <doc-type>] [--options <json>]
om-cli task status <task-id>
om-cli task list [--status <status>] [--limit <n>]
om-cli task cancel <task-id>
om-cli task logs <task-id> [--tail]

# 文档处理
om-cli document upload <file> [--name <name>] [--meta <json>]
om-cli document list [--query <query>]
om-cli document get <doc-id>
om-cli document delete <doc-id>

# 本体操作
om-cli ontology create <name> [--description <desc>]
om-cli ontology list [--domain <domain>]
om-cli ontology export <ontology-id> [--format jsonld|rdf|owl]
om-cli ontology import <file> [--format jsonld|rdf|owl]

# 五要素建模
om-cli modeling extract <doc-id> [--model gpt-4|claude|glm]
om-cli modeling validate <ontology-id>
om-cli modeling relations <ontology-id> [--depth <n>]

# 系统状态
om-cli system health
om-cli system metrics [--period <days>]
om-cli system version
```

**API接口设计**（CLI底层调用）：
```rest
# 认证
POST /api/v1/auth/login
POST /api/v1/auth/logout

# 任务管理
POST /api/v1/tasks
GET  /api/v1/tasks/{taskId}
GET  /api/v1/tasks
DELETE /api/v1/tasks/{taskId}
GET  /api/v1/tasks/{taskId}/logs

# 文档管理
POST /api/v1/documents
GET  /api/v1/documents
GET  /api/v1/documents/{docId}
DELETE /api/v1/documents/{docId}

# 本体管理
POST /api/v1/ontologies
GET  /api/v1/ontologies
GET  /api/v1/ontologies/{ontologyId}
POST /api/v1/ontologies/{ontologyId}/export
POST /api/v1/ontologies/import

# 建模服务
POST /api/v1/modeling/extract
POST /api/v1/modeling/validate
POST /api/v1/modeling/relations
```

**集成示例**：
```bash
# 第三方智能体使用示例
#!/bin/bash
# 1. 登录系统
om-cli login --api-url https://ontology.example.com --token $API_TOKEN

# 2. 上传PDF文档并提取要素
task_id=$(om-cli task submit report.pdf --type pdf --options '{"ocr":true,"language":"zh"}')
echo "Task submitted: $task_id"

# 3. 轮询任务状态
while true; do
    status=$(om-cli task status $task_id --output json | jq -r '.status')
    if [ "$status" = "completed" ]; then
        break
    elif [ "$status" = "failed" ]; then
        echo "Task failed"
        om-cli task logs $task_id --tail 20
        exit 1
    fi
    sleep 10
done

# 4. 获取处理结果
om-cli document get $task_id --output json > result.json
echo "Processing complete. Results saved to result.json"
```

**技术实现**：
- **CLI工具**：使用Python + Click / Node.js + Commander.js
- **认证方式**：API Token / OAuth2
- **输出格式**：支持JSON、YAML、表格等格式，便于脚本处理
- **错误处理**：详细的错误信息和错误码
- **日志记录**：可配置的日志级别和输出目标

**安全性**：
- Token自动过期和刷新机制
- 敏感信息不记录在历史命令中
- 支持HTTPS和证书验证
- 访问权限控制（基于角色）

---

## 7. 开发路线图

### 7.1 第一阶段：MVP（1-2个月）
**目标**：核心建模工作流 + 多格式文档处理
- [ ] 基础项目架构搭建（前端 + 后端 + 数据库）
- [ ] 用户认证和权限系统
- [ ] 领域管理（创建、列表、详情）
- [ ] 概念管理（增删改查）
- [ ] 基础关系管理
- [ ] 多格式文档上传界面（Office、PDF、图片、音视频）
- [ ] markitdown技能集成（文档格式转换、OCR、ASR）
- [ ] five-elements-ontology技能集成（要素提取、关系建立）
- [ ] Hermes agent基础协调框架（多技能流水线）
- [ ] 异步任务队列基础（任务提交、状态查询、进度显示）
- [ ] 基础通知功能（系统内通知）

### 7.2 第二阶段：功能完善（2-3个月）
**目标**：完整方法论支持 + 企业级任务管理
- [ ] 五要素类型系统
- [ ] 两系统角色管理
- [ ] 问题目标管理模块
- [ ] 知识图谱基础可视化
- [ ] 高级搜索和筛选
- [ ] 批量操作支持
- [ ] 数据导入导出
- [ ] 异步任务管理完善（暂停/恢复/取消/重试、大文档分片、断点续传）
- [ ] 多通道通知（邮件、Webhook集成）
- [ ] CLI基础版（om-cli核心命令：认证、任务管理、文档处理）

### 7.3 第三阶段：智能化（1-2个月）
**目标**：AI辅助建模 + 开放集成
- [ ] NLP要素提取
- [ ] 自动关系推理
- [ ] 完整性自动验证
- [ ] 智能搜索（语义搜索）
- [ ] 推荐系统（相似概念、关系建议）
- [ ] CLI完整版（本体操作、建模服务、系统状态）
- [ ] REST API正式发布（OpenAPI规范文档）
- [ ] Webhook回调机制

### 7.4 第四阶段：高级功能（1-2个月）
**目标**：企业级功能 + 生态建设
- [ ] 仪表盘和分析报表
- [ ] 团队协作功能
- [ ] 版本控制和历史记录
- [ ] 插件系统
- [ ] 移动端适配
- [ ] CLI插件机制
- [ ] 第三方智能体SDK（Python / TypeScript）

---

## 8. 成功指标

### 8.1 产品指标
- **用户采用率**：目标领域专家使用率 > 60%
- **建模效率**：相比手动建模，效率提升 > 3倍
- **数据质量**：五要素完整性 > 90%
- **用户满意度**：NPS > 50

### 8.2 技术指标
- **系统可用性**：99.5% uptime
- **响应时间**：页面加载 < 2秒，操作响应 < 200ms
- **数据规模**：支持 > 100万概念，> 500万关系
- **并发用户**：支持 > 1000并发用户

### 8.3 业务指标
- **领域覆盖**：支持 > 5个重点领域（石油、政务、医疗等）
- **知识资产**：积累 > 10个高质量知识本体
- **问题解决**：通过系统跟踪解决 > 1000个实际问题
- **投资回报**：建模成本降低 > 40%

---

## 9. 风险管理

### 9.1 技术风险
| 风险 | 可能性 | 影响 | 缓解措施 |
|:---|:---|:---|:---|
| 图数据库性能问题 | 中 | 高 | 分库分表、查询优化、缓存策略 |
| NLP模型准确性不足 | 高 | 中 | 人工校验机制、多模型投票、持续训练 |
| 大规模数据导入失败 | 中 | 中 | 分批处理、断点续传、数据验证 |
| 浏览器兼容性问题 | 低 | 低 | 渐进增强、Polyfill、兼容性测试 |

### 9.2 业务风险
| 风险 | 可能性 | 影响 | 缓解措施 |
|:---|:---|:---|:---|
| 用户接受度低 | 中 | 高 | 用户培训、优秀案例、渐进推广 |
| 方法论理解偏差 | 高 | 高 | 详细文档、可视化示例、专家指导 |
| 数据安全顾虑 | 中 | 高 | 私有化部署、数据加密、权限控制 |
| 领域适配困难 | 中 | 中 | 可配置类型系统、领域模板、定制开发 |

### 9.3 项目管理风险
| 风险 | 可能性 | 影响 | 缓解措施 |
|:---|:---|:---|:---|
| 需求变更频繁 | 高 | 中 | 敏捷开发、定期评审、需求冻结期 |
| 技术依赖延迟 | 中 | 中 | 备选方案、自主研发、进度缓冲 |
| 团队技能缺口 | 低 | 中 | 培训计划、外部专家、知识共享 |

---

*功能规格版本: v1.3*
*最后更新: 2026-04-17*
*基于: DESIGN.md v1.1 + 知识本体方法论v3.7 + five-elements-ontology技能 + markitdown技能 + CLI设计*