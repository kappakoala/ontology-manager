/**
 * 本体管理系统 - 类型定义
 * 基于 FUNCTIONAL_SPEC v1.3 §4 数据模型与架构
 */

// ─────────────────────────────────────────────
// 枚举 & 联合类型
// ─────────────────────────────────────────────

/** 五要素类型（方法论核心） */
export type ElementType = 'subject' | 'behavior' | 'object' | 'time' | 'space';

/** 扩展要素类型（含问题/目标/指标，用于UI展示） */
export type ExtendedElementType = ElementType | 'problem' | 'goal' | 'indicator';

/** 系统角色（两系统方法论，与后端保持一致） */
export type SystemRole = 'active_system' | 'object_system';

/** 系统角色（含通用，用于存储和UI） */
export type SystemRoleWithUniversal = SystemRole | 'universal';

/** 关系类型（方法论定义，与后端中文保持一致） */
export type RelationType =
  | '分类'    // 元素被拆分成多个同类元素而形成的关系
  | '包含'    // 本体元素应用到业务中与领域建立的关系
  | '实施'    // 主体为改变某个对象状态与行为建立的关系
  | '利用'    // 主体实施行为时与客体发生的关系
  | '在'      // 行为与时间/空间产生的关系
  | '确认'    // 确定当前两系统所处领域
  | '提出'    // 对象主体提出问题与问题建立的关系
  | '制定'    // 主体为解决问题而制定目标
  | '表现'    // 用数量值刻画问题、目标
  | '解决'    // 目标与问题建立的关系
  | '实现'    // 主体实施行为与对象状态变化的关系
  | '依据'    // 实施行为所依据的客体
  | '参考'    // 实施行为所参考的客体
  | '输入'    // 实施行为所输入的客体
  | '输出'    // 实施行为所输出的客体
  | '集约'    // 职能到功能的映射关系
  | '前置';   // 行为之间的先后顺序关系

/** 关系动静态 */
export type RelationKind = 'static' | 'dynamic';

/** 问题层级（三层结构） */
export type ProblemLevel = 'phenomenon' | 'root' | 'crux';

/** 严重程度 */
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

/** 紧急程度 */
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

/** 问题状态 */
export type ProblemStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

/** 目标状态 */
export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'abandoned';

/** 异步任务类型 */
export type TaskType = 'document-parse' | 'element-extract' | 'relation-build' | 'batch-process';

/** 异步任务状态 */
export type TaskStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** 任务优先级 */
export type TaskPriority = 'high' | 'medium' | 'low';

/** 日志级别 */
export type LogLevel = 'info' | 'warn' | 'error';

// ─────────────────────────────────────────────
// 核心实体
// ─────────────────────────────────────────────

/** 领域 */
export interface Domain {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  type: string;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** 概念（核心实体） */
export interface Concept {
  id: string;
  domain_id?: string;
  name: string;
  alias?: string;
  definition?: string;
  element_type: ExtendedElementType;
  system_role: SystemRoleWithUniversal;
  is_universal: boolean;
  properties?: Record<string, unknown>;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

/** 关系 */
export interface Relation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  rel_kind: RelationKind;
  label?: string;
  properties?: RelationProperties;
  domain_id?: string;
  note?: string;
  created_at?: string;
}

/** 关系属性 */
export interface RelationProperties {
  time?: string;
  space?: string;
  description?: string;
}

/** 问题（三层结构） */
export interface Problem {
  id: string;
  domain_id?: string;
  name: string;
  description?: string;
  level: ProblemLevel;
  severity?: SeverityLevel;
  urgency?: UrgencyLevel;
  status: ProblemStatus;
  parent_id?: string;
  concept_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** 目标 */
export interface Goal {
  id: string;
  domain_id?: string;
  name: string;
  description?: string;
  metric?: string;
  current_value?: number;
  target_value?: number;
  unit?: string;
  start_date?: string;
  end_date?: string;
  status: GoalStatus;
  problem_id?: string;
  created_at?: string;
  updated_at?: string;
}

/** 属性 */
export interface Attribute {
  id: string;
  concept_id: string;
  name: string;
  value?: string;
  attr_type: 'base' | 'domain';
  data_type: 'string' | 'number' | 'date' | 'boolean';
  note?: string;
}

// ─────────────────────────────────────────────
// 异步任务
// ─────────────────────────────────────────────

/** 异步任务 */
export interface AsyncTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0-100
  priority: TaskPriority;
  input?: TaskInput;
  output?: TaskOutput;
  error?: string;
  file_id?: string;
  domain_id?: string;
  logs: TaskLog[];
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

/** 任务输入 */
export interface TaskInput {
  file_id?: string;
  file_name?: string;
  options?: Record<string, unknown>;
}

/** 任务输出 */
export interface TaskOutput {
  concepts?: CandidateConcept[];
  relations?: CandidateRelation[];
  document_id?: string;
  markdown?: string;
}

/** 任务日志 */
export interface TaskLog {
  id: string;
  task_id: string;
  level: LogLevel;
  message: string;
  created_at?: string;
}

// ─────────────────────────────────────────────
// 建模流程
// ─────────────────────────────────────────────

/** 建模步骤 */
export type ModelingStep = 'upload' | 'preview' | 'extract' | 'relation' | 'save';

/** 上传文件信息 */
export interface ModelingFile {
  fileId: string;
  filename: string;
  markdown: string;
  charCount: number;
}

/** 候选概念（AI提取后待确认） */
export interface CandidateConcept {
  id: string;
  name: string;
  alias?: string;
  element_type: ExtendedElementType;
  suggested_type?: ExtendedElementType;
  definition?: string;
  source_text?: string;
  confidence: number;
  confirmed: boolean;
  system_role: SystemRoleWithUniversal;
  note?: string;
}

/** 候选关系（AI提取后待确认） */
export interface CandidateRelation {
  id: string;
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  relation_type: RelationType;
  label?: string;
  confidence: number;
  confirmed: boolean;
  properties?: RelationProperties;
}

/** 关系类型描述 */
export interface RelationTypeDesc {
  type: RelationType;
  label: string;
  desc: string;
  kind: RelationKind;
}

// ─────────────────────────────────────────────
// 知识图谱
// ─────────────────────────────────────────────

/** 图谱节点 */
export interface GraphNode {
  id: string;
  label: string;
  elementType: ExtendedElementType;
  systemRole?: SystemRoleWithUniversal;
  definition?: string;
}

/** 图谱边 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  label?: string;
  properties?: RelationProperties;
}

/** 图谱视图模式 */
export type GraphViewMode =
  | 'full'          // 全系统视图
  | 'elements'      // 五要素视图
  | 'systems'       // 两系统视图
  | 'problem-goal'  // 问题目标视图
  | 'timeline';     // 时间序列视图

/** 图布局算法 */
export type GraphLayout = 'force' | 'hierarchy' | 'radial' | 'custom';

// ─────────────────────────────────────────────
// 仪表盘
// ─────────────────────────────────────────────

/** 本体质量指标 */
export interface OntologyMetrics {
  totalConcepts: number;
  totalRelations: number;
  elementDistribution: Record<ExtendedElementType, number>;
  systemDistribution: Record<SystemRoleWithUniversal, number>;
  avgRelationsPerConcept: number;
  completenessScore: number; // 0-100
}

/** 建模活动指标 */
export interface ActivityMetrics {
  newConceptsToday: number;
  newConceptsWeek: number;
  newConceptsMonth: number;
  newRelationsToday: number;
  newRelationsWeek: number;
  newRelationsMonth: number;
  documentsProcessed: number;
  modelingSuccessRate: number;
}

/** 问题目标指标 */
export interface ProblemGoalMetrics {
  totalProblems: number;
  problemBySeverity: Record<SeverityLevel, number>;
  problemByStatus: Record<ProblemStatus, number>;
  goalCompletionRate: number;
  avgResolutionTime: number;
  riskProblemCount: number;
}

// ─────────────────────────────────────────────
// 五要素配色配置（DESIGN.md §2.2）
// ─────────────────────────────────────────────

export const ELEMENT_CONFIG: Record<ExtendedElementType, { label: string; color: string; icon: string }> = {
  subject:   { label: '主体', color: '#F472B6', icon: 'User' },
  behavior:  { label: '行为', color: '#60A5FA', icon: 'Thunderbolt' },
  object:    { label: '客体', color: '#34D399', icon: 'Box' },
  time:      { label: '时间', color: '#FBBF24', icon: 'Clock' },
  space:     { label: '空间', color: '#A78BFA', icon: 'Environment' },
  problem:   { label: '问题', color: '#EF4444', icon: 'Alert' },
  goal:      { label: '目标', color: '#22C55E', icon: 'Aim' },
  indicator: { label: '指标', color: '#60A5FA', icon: 'LineChart' },
};

/** 关系类型配置（与后端中文一致） */
export const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; desc: string; kind: RelationKind }> = {
  '分类':    { label: '分类',   desc: '元素被拆分成多个同类元素而形成的关系', kind: 'static' },
  '包含':    { label: '包含',   desc: '本体元素应用到业务中与领域建立的关系', kind: 'static' },
  '实施':    { label: '实施',   desc: '主体为改变某个对象状态与行为建立的关系', kind: 'dynamic' },
  '利用':    { label: '利用',   desc: '主体实施行为时与客体发生的关系', kind: 'dynamic' },
  '在':      { label: '在',     desc: '行为与时间/空间产生的关系', kind: 'dynamic' },
  '确认':    { label: '确认',   desc: '确定当前两系统所处领域', kind: 'dynamic' },
  '提出':    { label: '提出',   desc: '对象主体提出问题与问题建立的关系', kind: 'dynamic' },
  '制定':    { label: '制定',   desc: '主体为解决问题而制定目标', kind: 'dynamic' },
  '表现':    { label: '表现',   desc: '用数量值刻画问题、目标', kind: 'dynamic' },
  '解决':    { label: '解决',   desc: '目标与问题建立的关系', kind: 'dynamic' },
  '实现':    { label: '实现',   desc: '主体实施行为与对象状态变化的关系', kind: 'dynamic' },
  '依据':    { label: '依据',   desc: '实施行为所依据的客体', kind: 'static' },
  '参考':    { label: '参考',   desc: '实施行为所参考的客体', kind: 'static' },
  '输入':    { label: '输入',   desc: '实施行为所输入的客体', kind: 'dynamic' },
  '输出':    { label: '输出',   desc: '实施行为所输出的客体', kind: 'dynamic' },
  '集约':    { label: '集约',   desc: '职能到功能的映射关系', kind: 'dynamic' },
  '前置':    { label: '前置',   desc: '行为之间的先后顺序关系', kind: 'static' },
};

/** 系统角色标签 */
export const SYSTEM_ROLE_LABELS: Record<SystemRoleWithUniversal, string> = {
  active_system: '主动系统',
  object_system: '对象系统',
  universal: '通用',
};

/** 问题层级标签 */
export const PROBLEM_LEVEL_LABELS: Record<ProblemLevel, string> = {
  phenomenon: '表象',
  root: '根源',
  crux: '症结',
};

/** 严重程度标签 */
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

/** 紧急程度标签 */
export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};
