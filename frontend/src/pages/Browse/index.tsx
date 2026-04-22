/**
 * 本体浏览页面 - 领域树导航 + 概念列表 + 详情面板
 *
 * 功能规格 §3.1：
 * - 领域树导航（五要素类型组织）
 * - 概念列表视图（卡片/列表）
 * - 概念详情面板（含编辑/删除）
 * - 高级筛选和搜索
 * - 新建/编辑概念 Modal
 * - 新建领域 Modal
 */
import React, { useEffect, useState } from 'react';
import {
  Layout,
  Input,
  Select,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Empty,
  Spin,
  Typography,
  Modal,
  Form,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { useOntologyStore } from '../../stores/ontology';
import { ELEMENT_CONFIG, SYSTEM_ROLE_LABELS, RELATION_TYPE_CONFIG } from '../../types';
import type { Concept, ExtendedElementType, SystemRoleWithUniversal, RelationType } from '../../types';

const { Sider, Content } = Layout;
const { Text, Paragraph } = Typography;

// ─────────────────────────────────────────────
// 概念表单值类型
// ─────────────────────────────────────────────
interface ConceptFormValues {
  name: string;
  alias?: string;
  element_type: ExtendedElementType;
  system_role: SystemRoleWithUniversal;
  definition?: string;
  note?: string;
  domain_id?: string;
}

// ─────────────────────────────────────────────
// 领域表单值类型
// ─────────────────────────────────────────────
interface DomainFormValues {
  name: string;
  description?: string;
  type?: string;
}

const Browse: React.FC = () => {
  const {
    domains,
    concepts,
    relations,
    selectedDomainId,
    selectedConcept,
    elementTypeFilter,
    systemRoleFilter,
    searchQuery,
    loading,
    fetchDomains,
    fetchConcepts,
    fetchRelations,
    selectDomain,
    selectConcept,
    setElementTypeFilter,
    setSystemRoleFilter,
    setSearchQuery,
    createDomain,
    createConcept,
    updateConcept,
    deleteConcept,
    createRelation,
    deleteRelation,
  } = useOntologyStore();

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // 概念 Modal 状态
  const [conceptModalOpen, setConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [conceptForm] = Form.useForm<ConceptFormValues>();
  const [conceptSaving, setConceptSaving] = useState(false);

  // 领域 Modal 状态
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [domainForm] = Form.useForm<DomainFormValues>();
  const [domainSaving, setDomainSaving] = useState(false);

  useEffect(() => {
    fetchDomains();
    fetchConcepts();
    fetchRelations();
  }, []);

  // ─────────────────────────────────────────────
  // 筛选后的概念
  // ─────────────────────────────────────────────
  const filteredConcepts = concepts.filter((c) => {
    if (selectedDomainId && c.domain_id !== selectedDomainId) return false;
    if (elementTypeFilter && c.element_type !== elementTypeFilter) return false;
    if (systemRoleFilter && c.system_role !== systemRoleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.alias?.toLowerCase().includes(q) ||
        c.definition?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 获取概念关联的关系
  const conceptRelations = selectedConcept
    ? relations.filter(
        (r) => r.source_id === selectedConcept.id || r.target_id === selectedConcept.id
      )
    : [];

  // ─────────────────────────────────────────────
  // 概念 CRUD
  // ─────────────────────────────────────────────
  const openCreateConcept = () => {
    setEditingConcept(null);
    conceptForm.resetFields();
    conceptForm.setFieldsValue({
      element_type: 'subject',
      system_role: 'universal',
      domain_id: selectedDomainId || undefined,
    });
    setConceptModalOpen(true);
  };

  const openEditConcept = (concept: Concept) => {
    setEditingConcept(concept);
    conceptForm.setFieldsValue({
      name: concept.name,
      alias: concept.alias,
      element_type: concept.element_type,
      system_role: concept.system_role,
      definition: concept.definition,
      note: concept.note,
      domain_id: concept.domain_id,
    });
    setConceptModalOpen(true);
  };

  const handleConceptSave = async () => {
    try {
      const values = await conceptForm.validateFields();
      setConceptSaving(true);

      if (editingConcept) {
        await updateConcept(editingConcept.id, values);
        message.success('概念已更新');
      } else {
        await createConcept({
          ...values,
          is_universal: values.system_role === 'universal',
        });
        message.success('概念已创建');
      }

      setConceptModalOpen(false);
      conceptForm.resetFields();
    } catch (err) {
      // 表单验证失败
    } finally {
      setConceptSaving(false);
    }
  };

  const handleDeleteConcept = async (id: string) => {
    try {
      await deleteConcept(id);
      message.success('概念已删除');
    } catch {
      message.error('删除失败');
    }
  };

  // ─────────────────────────────────────────────
  // 领域 CRUD
  // ─────────────────────────────────────────────
  const openCreateDomain = () => {
    domainForm.resetFields();
    domainForm.setFieldsValue({ type: 'industry' });
    setDomainModalOpen(true);
  };

  const handleDomainSave = async () => {
    try {
      const values = await domainForm.validateFields();
      setDomainSaving(true);
      await createDomain(values);
      message.success('领域已创建');
      setDomainModalOpen(false);
      domainForm.resetFields();
    } catch {
      // 表单验证失败
    } finally {
      setDomainSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // 关系描述
  // ─────────────────────────────────────────────
  const getRelationLabel = (relation: typeof relations[0]) => {
    const isSource = relation.source_id === selectedConcept?.id;
    const otherConcept = concepts.find((c) =>
      c.id === (isSource ? relation.target_id : relation.source_id)
    );
    const direction = isSource ? '→' : '←';
    const otherName = otherConcept?.name || (isSource ? relation.target_id : relation.source_id);
    const relType = RELATION_TYPE_CONFIG[relation.relation_type];
    return `${direction} ${relType?.label || relation.relation_type} ${otherName}`;
  };

  return (
    <Layout style={{ height: '100%', background: '#0D0D0D' }}>
      {/* 左侧：领域树 + 筛选 */}
      <Sider
        width={260}
        style={{
          background: '#171717',
          borderRight: '1px solid #2D2D2D',
          overflow: 'auto',
        }}
      >
        {/* 搜索 */}
        <div style={{ padding: '12px 12px 8px' }}>
          <Input
            prefix={<Search size={14} style={{ color: '#525252' }} />}
            placeholder="搜索概念..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ background: '#0D0D0D', borderColor: '#2D2D2D' }}
          />
        </div>

        {/* 筛选 */}
        <div style={{ padding: '0 12px 8px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <Select
              placeholder="要素类型"
              allowClear
              value={elementTypeFilter}
              onChange={setElementTypeFilter}
              options={Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => ({
                value: key,
                label: cfg.label,
              }))}
              style={{ width: '100%' }}
            />
            <Select
              placeholder="系统角色"
              allowClear
              value={systemRoleFilter}
              onChange={setSystemRoleFilter}
              options={Object.entries(SYSTEM_ROLE_LABELS).map(([key, label]) => ({
                value: key,
                label,
              }))}
              style={{ width: '100%' }}
            />
          </Space>
        </div>

        {/* 领域列表 */}
        <div style={{ padding: '0 12px' }}>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              background: !selectedDomainId ? 'rgba(59,130,246,0.1)' : 'transparent',
              marginBottom: 2,
            }}
            onClick={() => selectDomain(null)}
          >
            <Text style={{ color: !selectedDomainId ? '#3B82F6' : '#E5E5E5', fontSize: 13 }}>
              全部概念
            </Text>
            <Tag style={{ marginLeft: 8, fontSize: 11, background: '#1F1F1F', border: 'none', color: '#A3A3A3' }}>
              {concepts.length}
            </Tag>
          </div>
          {domains.map((domain) => (
            <div
              key={domain.id}
              style={{
                padding: '8px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                background: selectedDomainId === domain.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                marginBottom: 2,
              }}
              onClick={() => selectDomain(domain.id)}
            >
              <Text style={{ color: selectedDomainId === domain.id ? '#3B82F6' : '#E5E5E5', fontSize: 13 }}>
                {domain.name}
              </Text>
            </div>
          ))}

          {/* 新建领域 */}
          <Button
            type="text"
            size="small"
            icon={<FolderPlus size={14} />}
            onClick={openCreateDomain}
            style={{ color: '#525252', marginTop: 4, fontSize: 12 }}
            block
          >
            新建领域
          </Button>
        </div>
      </Sider>

      {/* 中间：概念列表 */}
      <Content style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Text style={{ color: '#A3A3A3', fontSize: 13 }}>
              {filteredConcepts.length} 个概念
            </Text>
          </Space>
          <Space>
            <Button
              type="text"
              size="small"
              icon={viewMode === 'card' ? <List size={14} /> : <LayoutGrid size={14} />}
              onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
            />
            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={openCreateConcept}>
              新建概念
            </Button>
          </Space>
        </div>

        {/* 概念卡片网格 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : filteredConcepts.length === 0 ? (
          <Empty description={<span style={{ color: '#525252' }}>暂无概念</span>} />
        ) : (
          <Row gutter={[12, 12]}>
            {filteredConcepts.map((concept) => {
              const config = ELEMENT_CONFIG[concept.element_type];
              return (
                <Col key={concept.id} span={viewMode === 'card' ? 8 : 24}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      borderColor: selectedConcept?.id === concept.id ? '#3B82F6' : '#2D2D2D',
                      cursor: 'pointer',
                      background: '#1A1A1A',
                    }}
                    onClick={() => selectConcept(concept)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Tag
                        style={{
                          margin: 0,
                          padding: '0 6px',
                          fontSize: 11,
                          lineHeight: '18px',
                          borderRadius: 3,
                          background: `${config.color}15`,
                          color: config.color,
                          border: `1px solid ${config.color}30`,
                        }}
                      >
                        {config.label}
                      </Tag>
                      <Text strong style={{ fontSize: 13, color: '#E5E5E5', flex: 1 }}>{concept.name}</Text>
                      {/* 快捷操作 */}
                      <Space size={2} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="编辑">
                          <Button
                            type="text"
                            size="small"
                            icon={<Pencil size={12} style={{ color: '#525252' }} />}
                            onClick={() => openEditConcept(concept)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定删除此概念？"
                          onConfirm={() => handleDeleteConcept(concept.id)}
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="删除">
                            <Button
                              type="text"
                              size="small"
                              icon={<Trash2 size={12} style={{ color: '#525252' }} />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                    {concept.definition && (
                      <Paragraph
                        ellipsis={{ rows: 2 }}
                        style={{ margin: 0, fontSize: 12, color: '#A3A3A3' }}
                      >
                        {concept.definition}
                      </Paragraph>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Content>

      {/* 右侧：概念详情 */}
      <Sider
        width={360}
        style={{
          background: '#171717',
          borderLeft: '1px solid #2D2D2D',
          overflow: 'auto',
        }}
      >
        {selectedConcept ? (
          <div style={{ padding: 16 }}>
            {/* 标题 + 操作 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 16, color: '#FFFFFF' }}>
                  {selectedConcept.name}
                </Text>
                {selectedConcept.alias && (
                  <Text style={{ fontSize: 12, color: '#525252', marginLeft: 8 }}>
                    ({selectedConcept.alias})
                  </Text>
                )}
              </div>
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<Pencil size={14} style={{ color: '#A3A3A3' }} />}
                  onClick={() => openEditConcept(selectedConcept)}
                />
                <Popconfirm
                  title="确定删除此概念？"
                  onConfirm={() => handleDeleteConcept(selectedConcept.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<Trash2 size={14} style={{ color: '#EF4444' }} />}
                  />
                </Popconfirm>
              </Space>
            </div>

            {/* 标签 */}
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Tag style={{
                margin: 0,
                background: `${ELEMENT_CONFIG[selectedConcept.element_type].color}15`,
                color: ELEMENT_CONFIG[selectedConcept.element_type].color,
                border: `1px solid ${ELEMENT_CONFIG[selectedConcept.element_type].color}30`,
              }}>
                {ELEMENT_CONFIG[selectedConcept.element_type].label}
              </Tag>
              <Tag style={{ margin: 0, background: '#1F1F1F', border: '1px solid #2D2D2D', color: '#A3A3A3' }}>
                {SYSTEM_ROLE_LABELS[selectedConcept.system_role as keyof typeof SYSTEM_ROLE_LABELS] || selectedConcept.system_role}
              </Tag>
              {selectedConcept.domain_id && (
                <Tag style={{ margin: 0, background: '#1F1F1F', border: '1px solid #2D2D2D', color: '#A3A3A3' }}>
                  {domains.find(d => d.id === selectedConcept.domain_id)?.name || '未知领域'}
                </Tag>
              )}
            </div>

            {/* 定义 */}
            {selectedConcept.definition && (
              <div style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#525252' }}>定义</Text>
                <Paragraph style={{ marginTop: 4, color: '#A3A3A3', fontSize: 13, marginBottom: 0 }}>
                  {selectedConcept.definition}
                </Paragraph>
              </div>
            )}

            {/* 备注 */}
            {selectedConcept.note && (
              <div style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: '#525252' }}>备注</Text>
                <Paragraph style={{ marginTop: 4, color: '#A3A3A3', fontSize: 13, marginBottom: 0 }}>
                  {selectedConcept.note}
                </Paragraph>
              </div>
            )}

            {/* 关联关系 */}
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 12, color: '#525252' }}>
                关联关系 ({conceptRelations.length})
              </Text>
              <div style={{ marginTop: 6 }}>
                {conceptRelations.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#3A3A3A' }}>暂无关联关系</Text>
                ) : (
                  conceptRelations.map((rel) => {
                    const relConfig = RELATION_TYPE_CONFIG[rel.relation_type];
                    return (
                      <div
                        key={rel.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: '#1A1A1A',
                          border: '1px solid #2D2D2D',
                          marginBottom: 4,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Tag
                          style={{
                            margin: 0,
                            padding: '0 4px',
                            fontSize: 10,
                            lineHeight: '16px',
                            borderRadius: 2,
                            background: '#60A5FA15',
                            color: '#60A5FA',
                            border: '1px solid #60A5FA30',
                          }}
                        >
                          {relConfig?.label || rel.relation_type}
                        </Tag>
                        <Text style={{ color: '#E5E5E5', fontSize: 12 }}>
                          {getRelationLabel(rel)}
                        </Text>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 时间戳 */}
            {selectedConcept.created_at && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #2D2D2D' }}>
                <Text style={{ fontSize: 11, color: '#3A3A3A' }}>
                  创建于 {new Date(selectedConcept.created_at).toLocaleDateString('zh-CN')}
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Empty description={<span style={{ color: '#525252' }}>选择概念查看详情</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </Sider>

      {/* ───────────────────────────────────────────── */}
      {/* 新建/编辑概念 Modal */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        title={editingConcept ? '编辑概念' : '新建概念'}
        open={conceptModalOpen}
        onOk={handleConceptSave}
        onCancel={() => {
          setConceptModalOpen(false);
          conceptForm.resetFields();
        }}
        confirmLoading={conceptSaving}
        okText={editingConcept ? '保存' : '创建'}
        cancelText="取消"
        width={520}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={conceptForm}
          layout="vertical"
          size="small"
        >
          <Form.Item
            name="name"
            label="概念名称"
            rules={[{ required: true, message: '请输入概念名称' }]}
          >
            <Input placeholder="如：政府部门、审批许可证" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="element_type"
                label="要素类型"
                rules={[{ required: true, message: '请选择要素类型' }]}
              >
                <Select
                  options={Object.entries(ELEMENT_CONFIG).map(([key, cfg]) => ({
                    value: key,
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, display: 'inline-block' }} />
                        {cfg.label}
                      </span>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="system_role"
                label="系统角色"
                rules={[{ required: true, message: '请选择系统角色' }]}
              >
                <Select
                  options={Object.entries(SYSTEM_ROLE_LABELS).map(([key, label]) => ({
                    value: key,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="alias" label="别名">
            <Input placeholder="概念的别名或缩写" />
          </Form.Item>

          <Form.Item name="domain_id" label="所属领域">
            <Select
              allowClear
              placeholder="选择领域（可选）"
              options={domains.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="definition" label="定义">
            <Input.TextArea rows={3} placeholder="概念的定义描述" />
          </Form.Item>

          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} placeholder="补充备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ───────────────────────────────────────────── */}
      {/* 新建领域 Modal */}
      {/* ───────────────────────────────────────────── */}
      <Modal
        title="新建领域"
        open={domainModalOpen}
        onOk={handleDomainSave}
        onCancel={() => {
          setDomainModalOpen(false);
          domainForm.resetFields();
        }}
        confirmLoading={domainSaving}
        okText="创建"
        cancelText="取消"
        width={440}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={domainForm}
          layout="vertical"
          size="small"
        >
          <Form.Item
            name="name"
            label="领域名称"
            rules={[{ required: true, message: '请输入领域名称' }]}
          >
            <Input placeholder="如：石油勘探、油藏管理" />
          </Form.Item>

          <Form.Item name="type" label="领域类型">
            <Select
              options={[
                { value: 'industry', label: '行业' },
                { value: 'academic', label: '学术' },
                { value: 'government', label: '政府' },
                { value: 'other', label: '其他' },
              ]}
            />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="领域的简要描述" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Browse;
