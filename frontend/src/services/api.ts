/**
 * API 服务层 - 与后端 REST API 交互
 * 基于 FUNCTIONAL_SPEC v1.3 §6.5 API接口设计
 * 
 * 注意：后端所有响应格式为 { data: T } 或 { success: boolean, ... }
 * Axios 返回 res.data（响应体），所以实际数据在 res.data.data
 */
import axios from 'axios';
import type {
  Domain,
  Concept,
  Relation,
  Problem,
  Goal,
  AsyncTask,
  TaskType,
  TaskPriority,
  ModelingFile,
  CandidateConcept,
  CandidateRelation,
  RelationTypeDesc,
  OntologyMetrics,
  ActivityMetrics,
  ProblemGoalMetrics,
  GraphNode,
  GraphEdge,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

// ─────────────────────────────────────────────
// 领域 API
// ─────────────────────────────────────────────
export const domainApi = {
  list: () => api.get('/domains'),
  get: (id: string) => api.get(`/domains/${id}`),
  create: (data: { name: string; description?: string; type?: string }) =>
    api.post('/domains', data),
  update: (id: string, data: Partial<{ name: string; description: string }>) =>
    api.put(`/domains/${id}`, data),
  delete: (id: string) => api.delete(`/domains/${id}`),
  stats: (id: string) => api.get(`/domains/${id}/stats`),
};

// ─────────────────────────────────────────────
// 概念 API
// ─────────────────────────────────────────────
export const conceptApi = {
  list: (domainId?: string) =>
    api.get('/concepts', { params: domainId ? { domain_id: domainId } : {} }),
  get: (id: string) => api.get(`/concepts/${id}`),
  create: (data: Partial<Concept>) => api.post('/concepts', data),
  update: (id: string, data: Partial<Concept>) => api.put(`/concepts/${id}`, data),
  delete: (id: string) => api.delete(`/concepts/${id}`),
  // 后端搜索在 /api/search，不是 /api/concepts/search
  search: (query: string) => api.get('/search', { params: { q: query } }),
};

// ─────────────────────────────────────────────
// 关系 API
// ─────────────────────────────────────────────
export const relationApi = {
  list: (domainId?: string) =>
    api.get('/relations', { params: domainId ? { domain_id: domainId } : {} }),
  get: (id: string) => api.get(`/relations/${id}`),
  create: (data: Partial<Relation>) => api.post('/relations', data),
  update: (id: string, data: Partial<Relation>) => api.put(`/relations/${id}`, data),
  delete: (id: string) => api.delete(`/relations/${id}`),
  // 关系类型列表（后端在 /api/relations/types 和 /api/modeling/relation-types 都有）
  types: () => api.get('/relations/types'),
  // 图谱数据（后端在 /api/relations/graph）
  graph: (domainId?: string, limit?: number) =>
    api.get('/relations/graph', { params: { ...(domainId ? { domain_id: domainId } : {}), ...(limit ? { limit } : {}) } }),
};

// ─────────────────────────────────────────────
// 问题 API（后端路由：/api/problems）
// ─────────────────────────────────────────────
export const problemApi = {
  list: (domainId?: string) =>
    api.get('/problems', { params: domainId ? { domain_id: domainId } : {} }),
  get: (id: string) => api.get(`/problems/${id}`),
  create: (data: Partial<Problem>) => api.post('/problems', data),
  update: (id: string, data: Partial<Problem>) => api.put(`/problems/${id}`, data),
  delete: (id: string) => api.delete(`/problems/${id}`),
};

// ─────────────────────────────────────────────
// 目标 API（后端路由：/api/problems/goals）
// ─────────────────────────────────────────────
export const goalApi = {
  list: (domainId?: string) =>
    api.get('/problems/goals', { params: domainId ? { domain_id: domainId } : {} }),
  create: (data: Partial<Goal>) => api.post('/problems/goals', data),
  update: (id: string, data: Partial<Goal>) => api.put(`/problems/goals/${id}`, data),
  delete: (id: string) => api.delete(`/problems/goals/${id}`),
};

// ─────────────────────────────────────────────
// 建模 API
// 后端 upload 返回 { success, fileId, filename, markdown, charCount }
// 后端 extract 返回 { success, concepts }
// 后端 save 返回 { success, saved }
// 后端 preview 返回 { markdown }
// ─────────────────────────────────────────────
export const modelingApi = {
  upload: (data: { filename: string; base64?: string; text?: string }) =>
    api.post('/modeling/upload', data),
  preview: (fileId: string) => api.get(`/modeling/preview/${fileId}`),
  extract: (data: { fileId: string; markdown?: string; domain?: string }) =>
    api.post('/modeling/extract', data),
  extractRelations: (data: { concepts: CandidateConcept[]; domain?: string }) =>
    api.post('/modeling/extract-relations', data),
  save: (data: { domainId?: string; domainName?: string; concepts: CandidateConcept[]; relations: CandidateRelation[] }) =>
    api.post('/modeling/save', data),
  relationTypes: () => api.get('/modeling/relation-types'),
  validate: (domainId: string) => api.post(`/modeling/validate/${domainId}`),
};

// ─────────────────────────────────────────────
// 任务 API（异步任务管理）
// 后端取消用 DELETE，不是 POST /cancel
// ─────────────────────────────────────────────
export const taskApi = {
  list: (params?: { status?: string; type?: string; limit?: number }) =>
    api.get('/tasks', { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: { type: TaskType; file_id?: string; domain_id?: string; priority?: TaskPriority; input?: Record<string, unknown> }) =>
    api.post('/tasks', data),
  // 后端取消/删除用 DELETE
  cancel: (id: string) => api.delete(`/tasks/${id}`),
  // 重试 = 删除旧任务 + 创建新任务（后端无 retry 端点）
  retry: (id: string) => api.post('/tasks', { original_task_id: id }),
  update: (id: string, data: { status?: string; progress?: number; output?: unknown; error?: string }) =>
    api.put(`/tasks/${id}`, data),
  logs: (id: string) => api.get(`/tasks/${id}/logs`),
  stats: () => api.get('/tasks/stats/summary'),
};

// ─────────────────────────────────────────────
// 仪表盘 API
// 后端暂无独立 dashboard 路由，使用 /api/stats 作为数据源
// ─────────────────────────────────────────────
export const dashboardApi = {
  stats: (domainId?: string) =>
    api.get('/stats', { params: domainId ? { domain_id: domainId } : {} }),
  search: (q: string) => api.get('/search', { params: { q } }),
  exportData: (domainId?: string) =>
    api.get('/export', { params: domainId ? { domain_id: domainId } : {} }),
  importData: (data: unknown) => api.post('/import', data),
};

// ─────────────────────────────────────────────
// 图谱 API（复用 relationApi.graph）
// ─────────────────────────────────────────────
export const graphApi = {
  getData: (domainId?: string, limit?: number) =>
    api.get<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/relations/graph', {
      params: { ...(domainId ? { domain_id: domainId } : {}), ...(limit ? { limit } : {}) },
    }),
};

export default api;
