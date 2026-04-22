/**
 * 问题目标管理页面 - 问题分解 + 目标跟踪
 *
 * 功能规格 §3.4：
 * - 三层问题结构（表象→根源→症结）
 * - 目标管理（SMART原则、量化指标）
 * - 问题-目标关联
 * - 进度跟踪
 */
import React, { useEffect, useState } from 'react';
import {
  Layout,
  Card,
  Tree,
  Button,
  Space,
  Tag,
  Typography,
  Empty,
  Spin,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import {
  PlusOutlined,
  AimOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { problemApi, goalApi } from '../../services/api';
import {
  PROBLEM_LEVEL_LABELS,
  SEVERITY_LABELS,
  URGENCY_LABELS,
  ELEMENT_CONFIG,
} from '../../types';
import type { Problem, Goal, ProblemLevel, SeverityLevel, UrgencyLevel, ProblemStatus, GoalStatus } from '../../types';

const { Sider, Content } = Layout;
const { Text, Paragraph } = Typography;

// 问题状态色
const PROBLEM_STATUS_COLORS: Record<ProblemStatus, string> = {
  open: '#EF4444',
  in_progress: '#F59E0B',
  resolved: '#22C55E',
  closed: '#525252',
};

const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  open: '待处理',
  in_progress: '进行中',
  resolved: '已解决',
  closed: '已关闭',
};

const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  not_started: '#525252',
  in_progress: '#3B82F6',
  achieved: '#22C55E',
  abandoned: '#EF4444',
};

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  achieved: '已达成',
  abandoned: '已放弃',
};

const ProblemGoal: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [problemsRes, goalsRes] = await Promise.all([
        problemApi.list(),
        goalApi.list(),
      ]);
      setProblems(problemsRes.data?.data || []);
      setGoals(goalsRes.data?.data || []);
    } catch (error) {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  // 构建问题树
  const buildProblemTree = () => {
    const rootProblems = problems.filter((p) => !p.parent_id);
    const buildChildren = (parentId: string): any[] => {
      return problems
        .filter((p) => p.parent_id === parentId)
        .map((p) => ({
          key: p.id,
          title: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag style={{
                margin: 0,
                padding: '0 4px',
                fontSize: 10,
                lineHeight: '16px',
                background: `${PROBLEM_STATUS_COLORS[p.status]}15`,
                color: PROBLEM_STATUS_COLORS[p.status],
                border: `1px solid ${PROBLEM_STATUS_COLORS[p.status]}30`,
              }}>
                {PROBLEM_LEVEL_LABELS[p.level]}
              </Tag>
              <span style={{ fontSize: 12, color: '#E5E5E5' }}>{p.name}</span>
            </div>
          ),
          children: buildChildren(p.id),
        }));
    };

    return rootProblems.map((p) => ({
      key: p.id,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag style={{
            margin: 0,
            padding: '0 4px',
            fontSize: 10,
            lineHeight: '16px',
            background: `${PROBLEM_STATUS_COLORS[p.status]}15`,
            color: PROBLEM_STATUS_COLORS[p.status],
            border: `1px solid ${PROBLEM_STATUS_COLORS[p.status]}30`,
          }}>
            {PROBLEM_LEVEL_LABELS[p.level]}
          </Tag>
          <span style={{ fontSize: 13, color: '#E5E5E5', fontWeight: 500 }}>{p.name}</span>
        </div>
      ),
      children: buildChildren(p.id),
    }));
  };

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* 左侧：问题树 */}
      <Sider
        width={300}
        style={{
          background: '#171717',
          borderRight: '1px solid #2D2D2D',
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #2D2D2D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#EF4444' }} />
              <Text strong style={{ fontSize: 14 }}>问题库</Text>
            </Space>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            />
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : problems.length > 0 ? (
          <Tree
            treeData={buildProblemTree()}
            onSelect={(keys) => {
              const p = problems.find((p) => p.id === keys[0]);
              setSelectedProblem(p || null);
            }}
            defaultExpandAll
            style={{ padding: 8, background: 'transparent' }}
          />
        ) : (
          <Empty description={<span style={{ color: '#525252' }}>暂无问题</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 32 }} />
        )}
      </Sider>

      {/* 右侧：问题详情 + 目标 */}
      <Content style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {selectedProblem ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 问题详情 */}
            <Card size="small" title="问题详情" style={{ borderColor: '#2D2D2D' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Tag color={PROBLEM_STATUS_COLORS[selectedProblem.status]}>
                  {PROBLEM_STATUS_LABELS[selectedProblem.status]}
                </Tag>
                <Tag>{PROBLEM_LEVEL_LABELS[selectedProblem.level]}</Tag>
                {selectedProblem.severity && (
                  <Tag color={selectedProblem.severity === 'critical' ? '#EF4444' : undefined}>
                    {SEVERITY_LABELS[selectedProblem.severity]}
                  </Tag>
                )}
              </div>
              {selectedProblem.description && (
                <Paragraph style={{ color: '#A3A3A3', fontSize: 13 }}>
                  {selectedProblem.description}
                </Paragraph>
              )}
            </Card>

            {/* 关联目标 */}
            <Card size="small" title="关联目标" style={{ borderColor: '#2D2D2D' }}>
              {goals.filter((g) => g.problem_id === selectedProblem.id).length > 0 ? (
                goals
                  .filter((g) => g.problem_id === selectedProblem.id)
                  .map((goal) => (
                    <div key={goal.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <AimOutlined style={{ color: GOAL_STATUS_COLORS[goal.status] }} />
                          <Text style={{ color: '#E5E5E5' }}>{goal.name}</Text>
                        </Space>
                        <Tag color={GOAL_STATUS_COLORS[goal.status]}>
                          {GOAL_STATUS_LABELS[goal.status]}
                        </Tag>
                      </div>
                      {goal.target_value != null && goal.current_value != null && (
                        <Progress
                          percent={Math.round((goal.current_value / goal.target_value) * 100)}
                          size="small"
                          style={{ marginTop: 4 }}
                        />
                      )}
                    </div>
                  ))
              ) : (
                <Empty description={<span style={{ color: '#525252' }}>暂无关联目标</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Space>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty description={<span style={{ color: '#525252' }}>选择问题查看详情</span>} />
          </div>
        )}
      </Content>

      {/* 创建问题弹窗 */}
      <Modal
        title="创建问题"
        open={createModalOpen}
        onOk={() => setCreateModalOpen(false)}
        onCancel={() => setCreateModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="问题名称" rules={[{ required: true }]}>
            <Input placeholder="请输入问题名称" />
          </Form.Item>
          <Form.Item name="level" label="问题层级" rules={[{ required: true }]}>
            <Select options={Object.entries(PROBLEM_LEVEL_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="severity" label="严重程度">
            <Select options={Object.entries(SEVERITY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="description" label="问题描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProblemGoal;
