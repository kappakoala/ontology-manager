/**
 * 本体 Store - 领域/概念/关系的状态管理
 */
import { create } from 'zustand';
import type { Domain, Concept, Relation, ExtendedElementType, SystemRoleWithUniversal } from '../types';
import { domainApi, conceptApi, relationApi } from '../services/api';

interface OntologyState {
  // 数据
  domains: Domain[];
  concepts: Concept[];
  relations: Relation[];

  // 选中态
  selectedDomainId: string | null;
  selectedConcept: Concept | null;

  // 筛选
  elementTypeFilter: ExtendedElementType | null;
  systemRoleFilter: SystemRoleWithUniversal | null;
  searchQuery: string;

  // 加载状态
  loading: boolean;
  error: string | null;

  // Actions
  fetchDomains: () => Promise<void>;
  fetchConcepts: (domainId?: string) => Promise<void>;
  fetchRelations: (domainId?: string) => Promise<void>;
  selectDomain: (domainId: string | null) => void;
  selectConcept: (concept: Concept | null) => void;
  setElementTypeFilter: (filter: ExtendedElementType | null) => void;
  setSystemRoleFilter: (filter: SystemRoleWithUniversal | null) => void;
  setSearchQuery: (query: string) => void;

  // CRUD
  createDomain: (data: { name: string; description?: string; type: string }) => Promise<Domain>;
  createConcept: (data: Partial<Concept>) => Promise<Concept>;
  updateConcept: (id: string, data: Partial<Concept>) => Promise<void>;
  deleteConcept: (id: string) => Promise<void>;
  createRelation: (data: Partial<Relation>) => Promise<Relation>;
  deleteRelation: (id: string) => Promise<void>;
}

export const useOntologyStore = create<OntologyState>((set, get) => ({
  domains: [],
  concepts: [],
  relations: [],
  selectedDomainId: null,
  selectedConcept: null,
  elementTypeFilter: null,
  systemRoleFilter: null,
  searchQuery: '',
  loading: false,
  error: null,

  fetchDomains: async () => {
    try {
      set({ loading: true, error: null });
      const res = await domainApi.list();
      set({ domains: res.data?.data || [], loading: false });
    } catch (error) {
      set({ error: '加载领域失败', loading: false, domains: [] });
    }
  },

  fetchConcepts: async (domainId?: string) => {
    try {
      set({ loading: true, error: null });
      const res = await conceptApi.list(domainId);
      set({ concepts: res.data?.data || [], loading: false });
    } catch (error) {
      set({ error: '加载概念失败', loading: false, concepts: [] });
    }
  },

  fetchRelations: async (domainId?: string) => {
    try {
      const res = await relationApi.list(domainId);
      set({ relations: res.data?.data || [] });
    } catch (error) {
      set({ error: '加载关系失败', relations: [] });
    }
  },

  selectDomain: (domainId) => {
    set({ selectedDomainId: domainId, selectedConcept: null });
    get().fetchConcepts(domainId || undefined);
    get().fetchRelations(domainId || undefined);
  },

  selectConcept: (concept) => set({ selectedConcept: concept }),

  setElementTypeFilter: (filter) => set({ elementTypeFilter: filter }),
  setSystemRoleFilter: (filter) => set({ systemRoleFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  createDomain: async (data) => {
    const res = await domainApi.create(data);
    const domain = res.data?.data;
    if (domain) set((state) => ({ domains: [...state.domains, domain] }));
    return domain!;
  },

  createConcept: async (data) => {
    const res = await conceptApi.create(data);
    const concept = res.data?.data;
    if (concept) set((state) => ({ concepts: [...state.concepts, concept] }));
    return concept!;
  },

  updateConcept: async (id, data) => {
    await conceptApi.update(id, data);
    set((state) => ({
      concepts: state.concepts.map((c) => (c.id === id ? { ...c, ...data } : c)),
      selectedConcept: state.selectedConcept?.id === id ? { ...state.selectedConcept, ...data } : state.selectedConcept,
    }));
  },

  deleteConcept: async (id) => {
    await conceptApi.delete(id);
    set((state) => ({
      concepts: state.concepts.filter((c) => c.id !== id),
      selectedConcept: state.selectedConcept?.id === id ? null : state.selectedConcept,
    }));
  },

  createRelation: async (data) => {
    const res = await relationApi.create(data);
    const relation = res.data?.data;
    if (relation) set((state) => ({ relations: [...state.relations, relation] }));
    return relation!;
  },

  deleteRelation: async (id) => {
    await relationApi.delete(id);
    set((state) => ({
      relations: state.relations.filter((r) => r.id !== id),
    }));
  },
}));
