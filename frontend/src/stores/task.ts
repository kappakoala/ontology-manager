/**
 * 任务 Store - 异步任务管理
 */
import { create } from 'zustand';
import type { AsyncTask, TaskType, TaskStatus, TaskPriority } from '../types';
import { taskApi } from '../services/api';

interface TaskState {
  tasks: AsyncTask[];
  loading: boolean;
  error: string | null;

  // 筛选
  statusFilter: TaskStatus | null;
  typeFilter: TaskType | null;

  // Actions
  fetchTasks: () => Promise<void>;
  setStatusFilter: (filter: TaskStatus | null) => void;
  setTypeFilter: (filter: TaskType | null) => void;

  // 任务操作
  submitTask: (data: { type: TaskType; file_id?: string; domain_id?: string; priority?: TaskPriority; options?: Record<string, unknown> }) => Promise<string | null>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;

  // 轮询
  startPolling: (interval?: number) => void;
  stopPolling: () => void;
}

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  statusFilter: null,
  typeFilter: null,

  fetchTasks: async () => {
    try {
      set({ loading: true, error: null });
      const res = await taskApi.list();
      set({ tasks: res.data?.data || [], loading: false });
    } catch (error) {
      set({ error: '加载任务失败', loading: false, tasks: [] });
    }
  },

  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setTypeFilter: (filter) => set({ typeFilter: filter }),

  submitTask: async (data) => {
    try {
      set({ error: null });
      const res = await taskApi.create(data);
      const task = res.data?.data;
      if (task) set((state) => ({ tasks: [task, ...state.tasks] }));
      return task?.id || null;
    } catch (error) {
      set({ error: '提交任务失败' });
      return null;
    }
  },

  cancelTask: async (taskId) => {
    try {
      await taskApi.cancel(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t
        ),
      }));
    } catch (error) {
      set({ error: '取消任务失败' });
    }
  },

  retryTask: async (taskId) => {
    try {
      await taskApi.retry(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'pending' as TaskStatus, progress: 0 } : t
        ),
      }));
    } catch (error) {
      set({ error: '重试任务失败' });
    }
  },

  startPolling: (interval = 5000) => {
    if (pollingTimer) return;
    pollingTimer = setInterval(() => {
      get().fetchTasks();
    }, interval);
  },

  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },
}));
