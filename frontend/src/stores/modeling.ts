/**
 * 建模 Store - 五步骤建模流程的状态管理
 * 
 * 后端 modeling 路由返回格式说明：
 * - upload:  { success, fileId, filename, markdown, charCount }
 * - preview: { markdown }
 * - extract: { success, concepts }
 * - save:    { success, saved: { concepts, relations, domainId } }
 * - relation-types: { data: [...] }
 * 
 * Axios res.data = 后端响应体，所以：
 * - upload:  res.data.fileId, res.data.markdown 等
 * - preview: res.data.markdown
 * - extract: res.data.concepts
 * - save:    res.data.saved.domainId
 * - relation-types: res.data.data
 */
import { create } from 'zustand';
import type {
  ModelingStep,
  ModelingFile,
  CandidateConcept,
  CandidateRelation,
  RelationTypeDesc,
} from '../types';
import { modelingApi } from '../services/api';

interface ModelingState {
  // 当前步骤
  currentStep: ModelingStep;

  // 步骤1: 上传
  uploadedFiles: ModelingFile[];

  // 步骤2: 预览
  currentFileId: string | null;
  previewMarkdown: string;

  // 步骤3: 提取
  candidateConcepts: CandidateConcept[];
  extracting: boolean;

  // 步骤4: 关系
  candidateRelations: CandidateRelation[];
  relationTypes: RelationTypeDesc[];
  buildingRelations: boolean;

  // 步骤5: 保存
  saving: boolean;

  // 全局
  error: string | null;

  // Actions
  setStep: (step: ModelingStep) => void;
  resetFlow: () => void;

  // 步骤1
  uploadFile: (data: { filename: string; base64?: string; text?: string }) => Promise<void>;
  removeFile: (fileId: string) => void;

  // 步骤2
  previewFile: (fileId: string) => Promise<void>;

  // 步骤3
  extractElements: (fileId: string, markdown?: string, domain?: string) => Promise<void>;
  toggleConceptConfirmed: (conceptId: string) => void;
  confirmAllConcepts: () => void;
  updateCandidateConcept: (conceptId: string, updates: Partial<CandidateConcept>) => void;
  removeCandidateConcept: (conceptId: string) => void;

  // 步骤4
  fetchRelationTypes: () => Promise<void>;
  buildRelations: () => Promise<void>;
  toggleRelationConfirmed: (relationId: string) => void;
  confirmAllRelations: () => void;
  removeCandidateRelation: (relationId: string) => void;

  // 步骤5
  saveModel: (data: { domainId?: string; domainName?: string; concepts: CandidateConcept[]; relations: CandidateRelation[] }) => Promise<string | null>;
}

const initialState = {
  currentStep: 'upload' as ModelingStep,
  uploadedFiles: [],
  currentFileId: null,
  previewMarkdown: '',
  candidateConcepts: [],
  extracting: false,
  candidateRelations: [],
  relationTypes: [],
  buildingRelations: false,
  saving: false,
  error: null,
};

export const useModelingStore = create<ModelingState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  resetFlow: () => set(initialState),

  uploadFile: async (data) => {
    try {
      set({ error: null });
      const res = await modelingApi.upload(data);
      // 后端返回 { success, fileId, filename, markdown, charCount }
      const body = res.data;
      if (body?.success !== false && body?.fileId) {
        const file: ModelingFile = {
          fileId: body.fileId,
          filename: body.filename || data.filename,
          markdown: body.markdown || '',
          charCount: body.charCount || 0,
        };
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, file],
          currentFileId: file.fileId,
        }));
      } else {
        set({ error: body?.error || '文件上传失败' });
      }
    } catch (error) {
      set({ error: '文件上传失败' });
    }
  },

  removeFile: (fileId) => {
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.fileId !== fileId),
      currentFileId: state.currentFileId === fileId ? null : state.currentFileId,
    }));
  },

  previewFile: async (fileId) => {
    try {
      set({ error: null });
      const res = await modelingApi.preview(fileId);
      // 后端返回 { markdown }
      set({ currentFileId: fileId, previewMarkdown: res.data?.markdown || '' });
    } catch (error) {
      set({ error: '文件预览失败' });
    }
  },

  extractElements: async (fileId, markdown, domain) => {
    try {
      set({ extracting: true, error: null });
      const res = await modelingApi.extract({ fileId, markdown, domain });
      // 后端返回 { success, concepts }
      const body = res.data;
      set({
        candidateConcepts: body?.concepts || [],
        extracting: false,
        currentStep: 'extract',
      });
    } catch (error) {
      set({ extracting: false, error: '要素提取失败' });
    }
  },

  toggleConceptConfirmed: (conceptId) => {
    set((state) => ({
      candidateConcepts: state.candidateConcepts.map((c) =>
        c.id === conceptId ? { ...c, confirmed: !c.confirmed } : c
      ),
    }));
  },

  confirmAllConcepts: () => {
    set((state) => ({
      candidateConcepts: state.candidateConcepts.map((c) => ({ ...c, confirmed: true })),
    }));
  },

  updateCandidateConcept: (conceptId, updates) => {
    set((state) => ({
      candidateConcepts: state.candidateConcepts.map((c) =>
        c.id === conceptId ? { ...c, ...updates } : c
      ),
    }));
  },

  removeCandidateConcept: (conceptId) => {
    set((state) => ({
      candidateConcepts: state.candidateConcepts.filter((c) => c.id !== conceptId),
    }));
  },

  fetchRelationTypes: async () => {
    try {
      const res = await modelingApi.relationTypes();
      // 后端返回 { data: [...] }
      set({ relationTypes: res.data?.data || [] });
    } catch (error) {
      // 静默失败，relationTypes 不影响核心流程
    }
  },

  buildRelations: async () => {
    try {
      set({ buildingRelations: true, error: null });
      const { candidateConcepts, currentFileId } = get();
      const confirmedConcepts = candidateConcepts.filter((c) => c.confirmed);

      let relations: CandidateRelation[] = [];

      // 优先：调用后端 API 提取关系
      try {
        const res = await modelingApi.extractRelations({
          concepts: confirmedConcepts,
          domain: undefined, // 后端不依赖此字段，但保留接口
        });
        const body = res.data;
        if (body?.relations && body.relations.length > 0) {
          relations = body.relations;
        }
      } catch (apiErr) {
        console.warn('[buildRelations] 后端 API 调用失败，回退到前端启发式规则', apiErr);
      }

      // 回退：前端启发式规则（后端返回空或失败时）
      if (relations.length === 0) {
        relations = buildHeuristicRelations(confirmedConcepts);
      }

      set({
        candidateRelations: relations,
        buildingRelations: false,
        currentStep: 'relation',
      });
    } catch (error) {
      set({ buildingRelations: false, error: '关系建立失败' });
    }
  },

  toggleRelationConfirmed: (relationId) => {
    set((state) => ({
      candidateRelations: state.candidateRelations.map((r) =>
        r.id === relationId ? { ...r, confirmed: !r.confirmed } : r
      ),
    }));
  },

  confirmAllRelations: () => {
    set((state) => ({
      candidateRelations: state.candidateRelations.map((r) => ({ ...r, confirmed: true })),
    }));
  },

  removeCandidateRelation: (relationId) => {
    set((state) => ({
      candidateRelations: state.candidateRelations.filter((r) => r.id !== relationId),
    }));
  },

  saveModel: async (data) => {
    try {
      set({ saving: true, error: null });
      const res = await modelingApi.save(data);
      // 后端返回 { success, saved: { concepts, relations, domainId } }
      const body = res.data;
      set({ saving: false, currentStep: 'save' });
      return body?.saved?.domainId || null;
    } catch (error) {
      set({ saving: false, error: '保存失败' });
      return null;
    }
  },
}));

// ─── 辅助函数 ───

/** 前端启发式关系推导（后端 API 不可用时的 fallback） */
function buildHeuristicRelations(confirmedConcepts: CandidateConcept[]): CandidateRelation[] {
  const relations: CandidateRelation[] = [];
  const subjects = confirmedConcepts.filter((c) => c.element_type === 'subject');
  const behaviors = confirmedConcepts.filter((c) => c.element_type === 'behavior');
  const objects = confirmedConcepts.filter((c) => c.element_type === 'object');
  const times = confirmedConcepts.filter((c) => c.element_type === 'time');
  const spaces = confirmedConcepts.filter((c) => c.element_type === 'space');
  const problems = confirmedConcepts.filter((c) => c.element_type === 'problem');
  const goals = confirmedConcepts.filter((c) => c.element_type === 'goal');

  const exists = (srcId: string, tgtId: string, relType: string) =>
    relations.some(r => r.source_id === srcId && r.target_id === tgtId && r.relation_type === relType);

  // 主体 → 实施 → 行为
  for (const s of subjects) {
    for (const b of behaviors.slice(0, 5)) {
      if (!exists(s.id, b.id, '实施')) relations.push(makeCandidateRelation(s, b, '实施', 0.7));
    }
  }
  // 主体 → 利用 → 客体
  for (const s of subjects) {
    for (const o of objects.slice(0, 5)) {
      if (!exists(s.id, o.id, '利用')) relations.push(makeCandidateRelation(s, o, '利用', 0.65));
    }
  }
  // 行为 → 在 → 时间/空间
  for (const b of behaviors) {
    for (const t of times.slice(0, 2)) {
      if (!exists(b.id, t.id, '在')) relations.push(makeCandidateRelation(b, t, '在', 0.6));
    }
    for (const sp of spaces.slice(0, 2)) {
      if (!exists(b.id, sp.id, '在')) relations.push(makeCandidateRelation(b, sp, '在', 0.6));
    }
  }
  // 行为 → 输出 → 客体
  for (const b of behaviors) {
    for (const o of objects.slice(0, 3)) {
      if (!exists(b.id, o.id, '输出')) relations.push(makeCandidateRelation(b, o, '输出', 0.55));
    }
  }
  // 主体 → 制定 → 目标
  for (const s of subjects) {
    for (const g of goals.slice(0, 3)) {
      if (!exists(s.id, g.id, '制定')) relations.push(makeCandidateRelation(s, g, '制定', 0.6));
    }
  }
  // 对象系统 → 提出 → 问题
  const objSubjects = subjects.filter(s => s.system_role === 'object_system');
  for (const s of objSubjects.length > 0 ? objSubjects : subjects.slice(0, 1)) {
    for (const p of problems.slice(0, 3)) {
      if (!exists(s.id, p.id, '提出')) relations.push(makeCandidateRelation(s, p, '提出', 0.65));
    }
  }
  // 目标 → 解决 → 问题
  for (const g of goals) {
    for (const p of problems.slice(0, 3)) {
      if (!exists(g.id, p.id, '解决')) relations.push(makeCandidateRelation(g, p, '解决', 0.6));
    }
  }
  // 行为 → 前置 → 行为
  for (let i = 0; i < behaviors.length - 1; i++) {
    relations.push(makeCandidateRelation(behaviors[i], behaviors[i + 1], '前置', 0.5));
  }

  return relations;
}

/** 生成候选关系 */
function makeCandidateRelation(
  source: CandidateConcept,
  target: CandidateConcept,
  relationType: CandidateRelation['relation_type'],
  confidence = 0.6,
): CandidateRelation {
  return {
    id: 'tmp_rel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    source_id: source.id,
    source_name: source.name,
    target_id: target.id,
    target_name: target.name,
    relation_type: relationType,
    confidence,
    confirmed: false,
  };
}
