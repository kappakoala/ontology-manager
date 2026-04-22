/**
 * 仪表盘页面 - 统计指标 + 可视化图表
 *
 * 功能规格 §3.5：
 * - 本体质量指标（概念数、关系数、五要素分布、完整性评分）
 * - 建模活动指标（新增概念/关系、文档处理量）
 * - 问题目标指标（问题数、目标完成率）
 * - 可视化图表（饼图、柱状图、趋势线图）
 */
import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Tag,
  Empty,
  Spin,
  Progress,
} from 'antd';
import {
  Database,
  Network,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useOntologyStore } from '../../stores/ontology';
import { problemApi, goalApi } from '../../services/api';
import { ELEMENT_CONFIG, SYSTEM_ROLE_LABELS } from '../../types';
import type { Problem, Goal, ExtendedElementType } from '../../types';

const { Text, Title } = Typography;

const Dashboard: React.FC = () => {
  const { concepts, relations, domains, fetchConcepts, fetchRelations, fetchDomains, loading } = useOntologyStore();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetchDomains();
    fetchConcepts();
    fetchRelations();
    loadProblemGoalData();
  }, []);

  const loadProblemGoalData = async () => {
    try {
      const [pRes, gRes] = await Promise.all([problemApi.list(), goalApi.list()]);
      setProblems(pRes.data?.data || []);
      setGoals(gRes.data?.data || []);
    } catch (e) {
      // 静默
    }
  };

  // 计算五要素分布
  const elementDistribution = concepts.reduce((acc, c) => {
    acc[c.element_type] = (acc[c.element_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 计算系统角色分布
  const systemDistribution = concepts.reduce((acc, c) => {
    acc[c.system_role] = (acc[c.system_role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 完整性评分（简化：有定义的概念占比）
  const completenessScore = concepts.length > 0
    ? Math.round((concepts.filter((c) => c.definition).length / concepts.length) * 100)
    : 0;

  // 目标完成率
  const goalCompletionRate = goals.length > 0
    ? Math.round((goals.filter((g) => g.status === 'achieved').length / goals.length) * 100)
    : 0;

  return (
    <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
      <Title level={4} style={{ color: '#FFFFFF', marginBottom: 24 }}>仪表盘</Title>

      {/* 顶部统计卡 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ borderColor: '#2D2D2D' }}>
            <Statistic
              title={<span style={{ color: '#A3A3A3' }}>概念总数</span>}
              value={concepts.length}
              prefix={<Database size={16} style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#FFFFFF' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderColor: '#2D2D2D' }}>
            <Statistic
              title={<span style={{ color: '#A3A3A3' }}>关系总数</span>}
              value={relations.length}
              prefix={<Network size={16} style={{ color: '#A78BFA' }} />}
              valueStyle={{ color: '#FFFFFF' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderColor: '#2D2D2D' }}>
            <Statistic
              title={<span style={{ color: '#A3A3A3' }}>完整性评分</span>}
              value={completenessScore}
              suffix="%"
              prefix={<CheckCircle size={16} style={{ color: '#22C55E' }} />}
              valueStyle={{ color: completenessScore >= 80 ? '#22C55E' : '#F59E0B' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderColor: '#2D2D2D' }}>
            <Statistic
              title={<span style={{ color: '#A3A3A3' }}>问题数</span>}
              value={problems.length}
              prefix={<AlertCircle size={16} style={{ color: '#EF4444' }} />}
              valueStyle={{ color: '#FFFFFF' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：五要素分布 + 系统角色分布 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={14}>
          <Card
            size="small"
            title={<span style={{ color: '#A3A3A3', fontSize: 13 }}>五要素分布</span>}
            style={{ borderColor: '#2D2D2D' }}
          >
            <Row gutter={[8, 8]}>
              {Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => {
                const count = elementDistribution[key] || 0;
                const percent = concepts.length > 0 ? Math.round((count / concepts.length) * 100) : 0;
                return (
                  <Col span={12} key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag style={{
                        margin: 0,
                        background: `${cfg.color}15`,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                        minWidth: 48,
                        textAlign: 'center',
                      }}>
                        {cfg.label}
                      </Tag>
                      <Progress
                        percent={percent}
                        size="small"
                        strokeColor={cfg.color}
                        format={() => `${count}`}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
        <Col span={10}>
          <Card
            size="small"
            title={<span style={{ color: '#A3A3A3', fontSize: 13 }}>系统角色分布</span>}
            style={{ borderColor: '#2D2D2D' }}
          >
            {Object.entries(SYSTEM_ROLE_LABELS).map(([key, label]) => {
              const count = systemDistribution[key] || 0;
              const percent = concepts.length > 0 ? Math.round((count / concepts.length) * 100) : 0;
              const colors: Record<string, string> = {
                active: '#60A5FA',
                objective: '#F472B6',
                universal: '#A78BFA',
              };
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ color: '#E5E5E5', fontSize: 12 }}>{label}</Text>
                    <Text style={{ color: '#A3A3A3', fontSize: 12 }}>{count} ({percent}%)</Text>
                  </div>
                  <Progress percent={percent} size="small" strokeColor={colors[key]} showInfo={false} />
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>

      {/* 第三行：目标完成率 + 领域概览 */}
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card
            size="small"
            title={<span style={{ color: '#A3A3A3', fontSize: 13 }}>目标完成率</span>}
            style={{ borderColor: '#2D2D2D' }}
          >
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Progress
                type="dashboard"
                percent={goalCompletionRate}
                strokeColor={goalCompletionRate >= 70 ? '#22C55E' : goalCompletionRate >= 40 ? '#F59E0B' : '#EF4444'}
                format={(p) => <span style={{ color: '#FFFFFF' }}>{p}%</span>}
              />
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: '#A3A3A3', fontSize: 12 }}>
                  {goals.filter((g) => g.status === 'achieved').length} / {goals.length} 已达成
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={16}>
          <Card
            size="small"
            title={<span style={{ color: '#A3A3A3', fontSize: 13 }}>领域概览</span>}
            style={{ borderColor: '#2D2D2D' }}
          >
            {domains.length > 0 ? (
              domains.map((domain) => {
                const domainConcepts = concepts.filter((c) => c.domain_id === domain.id);
                return (
                  <div key={domain.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #2D2D2D',
                  }}>
                    <Text style={{ color: '#E5E5E5', fontSize: 13 }}>{domain.name}</Text>
                    <Space>
                      <Tag>{domainConcepts.length} 概念</Tag>
                    </Space>
                  </div>
                );
              })
            ) : (
              <Empty description={<span style={{ color: '#525252' }}>暂无领域</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
